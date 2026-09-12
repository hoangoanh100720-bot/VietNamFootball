/**
 * ============================================================================
 * JOBS/LIVEPOLL.JOB.TS — VÒNG LẶP CẬP NHẬT TỶ SỐ TRỰC TIẾP
 * ============================================================================
 *
 * Đây là "trái tim" của tính năng realtime (mục 8.2 ARCHITECTURE.md):
 *
 *   Cứ 12 giây:
 *     1. Tìm các trận đang status = 'live'
 *     2. Lấy dữ liệu mới (từ Football API, hoặc từ bộ mô phỏng khi chưa có key)
 *     3. So sánh với database — CÓ THAY ĐỔI mới ghi và phát socket
 *     4. Trận hết giờ -> đổi status = 'finished', phát match:finished, dừng theo dõi
 *
 * VÌ SAO PHẢI SO SÁNH TRƯỚC KHI GHI?
 * Nếu cứ 12 giây lại UPDATE và emit dù không có gì mới:
 *   - Database chịu tải vô ích
 *   - App rung/nhấp nháy giao diện dù tỷ số y nguyên
 * Nguyên tắc: CHỈ phát tin khi THẬT SỰ có thay đổi.
 *
 * ----------------------------------------------------------------------------
 * CHẾ ĐỘ MÔ PHỎNG (LIVE_SIMULATION=true)
 *
 * Bạn chưa có FOOTBALL_API_KEY, mà vẫn cần thấy realtime hoạt động để học.
 * Bộ mô phỏng sẽ tự tăng phút thi đấu và thỉnh thoảng tạo bàn thắng ngẫu nhiên
 * -> mở app lên là thấy tỷ số tự nhảy, sự kiện tự hiện ra.
 *
 * ⚠️ NHỚ TẮT (LIVE_SIMULATION=false) khi dùng dữ liệu thật.
 */

import { query } from '@/config/database';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { cacheDel } from '@/utils/cache';
import { emitMatchEvent, emitMatchFinished, emitScoreUpdate } from '@/services/socket.service';
import { notifyGoal, notifyMatchFinished } from '@/services/notification.service';
import { rateMatch } from '@/services/rating/rating.service';

/** Bộ đếm khoảng thời gian; null = đang không chạy */
let timer: NodeJS.Timeout | null = null;

interface LiveMatch {
  id: number;
  home_team_id: number;
  away_team_id: number;
  home_score: number;
  away_score: number;
  minute: number | null;
  status: string;
  // Lấy kèm qua JOIN để soạn nội dung thông báo đẩy mà không phải
  // truy vấn thêm lần nữa cho mỗi bàn thắng
  home_team_name: string;
  away_team_name: string;
  home_fifa_code: string | null;
  away_fifa_code: string | null;
}

/** Bật chế độ mô phỏng? Đọc trực tiếp process.env để dễ bật/tắt khi học */
const SIMULATION = process.env.LIVE_SIMULATION === 'true';

/**
 * MỘT VÒNG QUÉT — hàm này chạy lặp lại mỗi LIVE_POLLING_INTERVAL_MS.
 */
async function pollOnce(): Promise<void> {
  const { rows: liveMatches } = await query<LiveMatch>(
    `SELECT m.id, m.home_team_id, m.away_team_id, m.home_score, m.away_score,
            m.minute, m.status,
            ht.name AS home_team_name, at.name AS away_team_name,
            ht.fifa_code AS home_fifa_code, at.fifa_code AS away_fifa_code
     FROM matches m
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     WHERE m.status = 'live'`
  );

  if (liveMatches.length === 0) return; // không có trận nào đang đá -> nghỉ

  for (const match of liveMatches) {
    try {
      const update = SIMULATION ? simulateUpdate(match) : await fetchFromProvider(match);
      if (!update) continue; // không có gì mới

      // ---- Trận kết thúc ----
      if (update.status === 'finished') {
        await query(
          `UPDATE matches SET status = 'finished', minute = 90, updated_at = NOW() WHERE id = $1`,
          [match.id]
        );
        await clearMatchCache(match.id);

        emitMatchFinished(match.id, { home: match.home_score, away: match.away_score });

        // Gửi push cho người KHÔNG mở app (socket ở trên chỉ tới được người đang xem).
        // void + catch: thông báo lỗi không được làm dừng vòng lặp theo dõi.
        void notifyMatchFinished({
          matchId: match.id,
          homeTeam: match.home_team_name,
          awayTeam: match.away_team_name,
          homeScore: match.home_score,
          awayScore: match.away_score,
        }).catch((err: unknown) => logger.warn('Push kết thúc trận lỗi: ' + String(err)));

        /**
         * ⭐ CHỐT ĐIỂM CẦU THỦ NGAY KHI TRẬN KẾT THÚC (ARCHITECTURE.md mục 12.3).
         *
         * Đây là thời điểm duy nhất mà mọi dữ liệu đã đầy đủ: tỷ số cuối cùng
         * (để tính thắng/thua), sạch lưới hay không, và toàn bộ sự kiện.
         *
         * ⚠️ `void` + `.catch()` là CÓ CHỦ ĐÍCH, không phải cẩu thả:
         * chấm điểm 40 cầu thủ mất vài trăm mili-giây. Nếu `await` ở đây thì
         * vòng lặp theo dõi các trận KHÁC bị chặn lại chừng đó. Điểm cầu thủ
         * chậm vài giây không ai để ý, nhưng tỷ số trực tiếp chậm thì có.
         *
         * Chấm điểm lỗi cũng KHÔNG được làm dừng vòng lặp — cùng lý do với
         * thông báo đẩy ở trên.
         */
        void rateMatch(match.id, 'finalize').catch((err: unknown) =>
          logger.warn('[Rating] Chấm điểm cuối trận lỗi: ' + String(err))
        );

        logger.info('Trận kết thúc', {
          matchId: match.id,
          score: `${match.home_score}-${match.away_score}`,
        });
        continue;
      }

      // ---- Có bàn thắng mới ----
      const homeScored = update.home_score > match.home_score;
      const awayScored = update.away_score > match.away_score;

      if (homeScored || awayScored) {
        const scoringTeamId = homeScored ? match.home_team_id : match.away_team_id;

        // Chọn ngẫu nhiên một cầu thủ tấn công của đội ghi bàn để gán vào sự kiện
        const { rows: scorers } = await query<{ id: number; short_name: string }>(
          `SELECT id, short_name FROM players
           WHERE team_id = $1 AND position IN ('FW', 'MF') AND is_active = TRUE
           ORDER BY RANDOM() LIMIT 1`,
          [scoringTeamId]
        );
        const scorer = scorers[0];

        await query(
          `INSERT INTO match_events (match_id, team_id, player_id, minute, type, detail)
           VALUES ($1, $2, $3, $4, 'goal', $5)`,
          [match.id, scoringTeamId, scorer?.id ?? null, update.minute, 'Bàn thắng']
        );

        emitMatchEvent(match.id, {
          type: 'goal',
          player: scorer?.short_name ?? null,
          minute: update.minute,
          detail: 'Bàn thắng',
        });

        /**
         * ⚽ THÔNG BÁO ĐẨY — điểm khác biệt so với socket ở trên:
         * socket chỉ tới được người ĐANG MỞ app, push tới được cả người
         * đã đóng app hoặc đang khoá máy.
         *
         * isVietnamGoal quyết định giọng điệu thông báo: bàn của ta thì
         * reo lên "VÀO!", bàn của đối thủ thì thông báo trung tính.
         */
        const scoringFifaCode = homeScored ? match.home_fifa_code : match.away_fifa_code;

        void notifyGoal({
          matchId: match.id,
          homeTeam: match.home_team_name,
          awayTeam: match.away_team_name,
          homeScore: update.home_score,
          awayScore: update.away_score,
          minute: update.minute,
          scorer: scorer?.short_name ?? null,
          isVietnamGoal: scoringFifaCode === 'VIE',
        }).catch((err: unknown) => logger.warn('Push bàn thắng lỗi: ' + String(err)));
      }

      // ---- Ghi tỷ số + phút thi đấu ----
      await query(
        `UPDATE matches
         SET home_score = $2, away_score = $3, minute = $4, updated_at = NOW()
         WHERE id = $1`,
        [match.id, update.home_score, update.away_score, update.minute]
      );
      await clearMatchCache(match.id);

      emitScoreUpdate({
        matchId: match.id,
        home: update.home_score,
        away: update.away_score,
        minute: update.minute,
        status: 'live',
      });
    } catch (err) {
      // Một trận lỗi KHÔNG được làm hỏng vòng lặp của các trận khác
      logger.error('Lỗi khi cập nhật trận ' + match.id + ': ' + String(err));
    }
  }
}

/** Xoá mọi cache liên quan tới trận vừa đổi -> lần gọi API sau lấy dữ liệu mới */
async function clearMatchCache(matchId: number) {
  await cacheDel(`match:${matchId}:*`);
  await cacheDel('match:latest');
  await cacheDel('matches:*');
}

/**
 * BỘ MÔ PHỎNG — chỉ dùng khi học/demo.
 * Mỗi vòng: +1 phút; xác suất 8% có bàn thắng; tới phút 90 thì kết thúc.
 */
function simulateUpdate(match: LiveMatch) {
  const minute = (match.minute ?? 0) + 1;

  if (minute > 90) {
    return { home_score: match.home_score, away_score: match.away_score, minute: 90, status: 'finished' };
  }

  let home = match.home_score;
  let away = match.away_score;

  if (Math.random() < 0.08) {
    // 65% khả năng đội nhà ghi bàn (mô phỏng lợi thế sân nhà)
    if (Math.random() < 0.65) home++;
    else away++;
  }

  return { home_score: home, away_score: away, minute, status: 'live' };
}

/**
 * LẤY DỮ LIỆU THẬT từ nhà cung cấp (api-football).
 * Trả về null nếu chưa cấu hình key hoặc không có thay đổi.
 *
 * Ở đây để sẵn khung; khi bạn có FOOTBALL_API_KEY chỉ cần điền phần gọi API.
 */
async function fetchFromProvider(match: LiveMatch) {
  if (!env.FOOTBALL_API_KEY) return null;

  // TODO (khi có API key): gọi
  //   GET {FOOTBALL_API_BASE_URL}/fixtures?id={match.external_id}
  //   header: { 'x-apisports-key': env.FOOTBALL_API_KEY }
  // rồi ánh xạ về { home_score, away_score, minute, status }
  return null;
}

/** BẬT vòng lặp theo dõi trực tiếp */
export function startLivePolling(): void {
  if (!env.LIVE_POLLING_ENABLED) {
    logger.info('Live polling đang TẮT (LIVE_POLLING_ENABLED=false)');
    return;
  }
  if (timer) return; // đã chạy rồi thì thôi

  logger.info(
    `Live polling BẬT: mỗi ${env.LIVE_POLLING_INTERVAL_MS}ms` +
      (SIMULATION ? ' (chế độ MÔ PHỎNG)' : '')
  );

  timer = setInterval(() => {
    // void: nói rõ với TypeScript là ta cố ý không chờ Promise này.
    // .catch để lỗi bên trong không làm sập tiến trình.
    void pollOnce().catch((err: unknown) => logger.error('Live poll lỗi: ' + String(err)));
  }, env.LIVE_POLLING_INTERVAL_MS);
}

/** TẮT vòng lặp (khi tắt server) */
export function stopLivePolling(): void {
  if (timer) {
    clearInterval(timer);
    timer = null;
    logger.info('Đã dừng live polling');
  }
}
