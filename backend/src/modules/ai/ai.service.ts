/**
 * ============================================================================
 * MODULES/AI/AI.SERVICE.TS — DỰ ĐOÁN KẾT QUẢ TRẬN ĐẤU
 * ============================================================================
 *
 * LUỒNG XỬ LÝ (đúng theo mục 6.1 của ARCHITECTURE.md):
 *
 *   1. Có trong Redis/RAM cache?        -> trả ngay (0 chi phí)
 *   2. Có trong bảng ai_predictions và  -> trả ngay (0 chi phí)
 *      chưa hết hạn?
 *   3. Thu thập dữ liệu từ PostgreSQL   (phong độ, H2H, BXH FIFA, đội hình)
 *   4. Gọi Gemini (có retry)            -> tốn tiền, nên mới phải làm bước 1-2
 *   5. Kiểm chứng + lưu DB + set cache  -> trả về
 *
 * CƠ CHẾ DỰ PHÒNG NHIỀU LỚP (rất quan trọng cho ứng dụng thật):
 *   - Chưa có GEMINI_API_KEY  -> dùng mô hình thống kê Elo (vẫn có kết quả!)
 *   - Gemini lỗi/quá tải      -> trả bản dự đoán CŨ trong DB nếu có
 *   - Không có gì cả          -> mới báo lỗi 503
 * Người dùng gần như không bao giờ nhìn thấy màn hình trắng.
 */

import { query } from '@/config/database';
import { cacheGet, cacheSet } from '@/utils/cache';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/AppError';
import {
  generatePrediction,
  isGeminiEnabled,
  type PredictionContext,
  type PredictionResult,
  type TeamContext,
} from '@/services/gemini.service';
import { getPoolStats } from '@/config/gemini';
import * as matchesService from '@/modules/matches/matches.service';
import type { AiPrediction } from '@/types';

/** Định dạng ngày kiểu Việt Nam: 08/10/2026 */
function formatDate(d: Date | string): string {
  return new Date(d).toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
}

// ---------------------------------------------------------------------------
// THU THẬP DỮ LIỆU CHO AI
// ---------------------------------------------------------------------------

/**
 * Gom toàn bộ bối cảnh của trận đấu: phong độ hai đội, đối đầu, thứ hạng FIFA,
 * giá trị đội hình, trụ cột. Đây là "nguyên liệu" quyết định chất lượng dự đoán.
 */
async function buildContext(matchId: number): Promise<{ ctx: PredictionContext; isHome: boolean }> {
  const match = await matchesService.getMatchById(matchId);
  const vie = await matchesService.getVietnamTeamId();

  const isHome = match.home_team_id === vie;
  const opponentTeam = isHome ? match.away_team : match.home_team;

  // Chạy song song các truy vấn độc lập -> tiết kiệm thời gian chờ
  const [vnForm, oppForm, h2h, rankings, squadValue, keyPlayers] = await Promise.all([
    matchesService.getRecentForm(vie, 5),
    matchesService.getRecentForm(opponentTeam.id, 5),
    matchesService.getHeadToHead(matchId),
    query<{ team_id: number; rank: number; points: string }>(
      `SELECT team_id, rank, points FROM fifa_rankings
       WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM fifa_rankings)
         AND team_id IN ($1, $2)`,
      [vie, opponentTeam.id]
    ),
    query<{ total: string }>(
      `SELECT SUM(market_value_eur) AS total FROM players
       WHERE team_id = $1 AND is_active = TRUE`,
      [vie]
    ),
    query<{ short_name: string; position: string }>(
      `SELECT short_name, position FROM players
       WHERE team_id = $1 AND is_active = TRUE
       ORDER BY market_value_eur DESC LIMIT 5`,
      [vie]
    ),
  ]);

  const vnRank = rankings.rows.find((r) => r.team_id === vie);
  const oppRank = rankings.rows.find((r) => r.team_id === opponentTeam.id);

  /** Biến danh sách trận thành mô tả dễ đọc cho AI */
  const describe = (form: Awaited<ReturnType<typeof matchesService.getRecentForm>>) =>
    form.matches.map(
      (m) => `${formatDate(m.kickoff_at)} vs ${m.opponent}: ${m.goals_for}-${m.goals_against}`
    );

  const vietnam: TeamContext = {
    name: 'Việt Nam',
    fifa_rank: vnRank?.rank ?? null,
    fifa_points: vnRank ? Number(vnRank.points) : null,
    form: vnForm.form,
    recent_matches: describe(vnForm),
    squad_value_eur: Number(squadValue.rows[0]?.total ?? 0),
    key_players: keyPlayers.rows.map((p) => `${p.short_name} (${p.position})`),
  };

  const opponent: TeamContext = {
    name: opponentTeam.name,
    fifa_rank: oppRank?.rank ?? null,
    fifa_points: oppRank ? Number(oppRank.points) : null,
    form: oppForm.form,
    recent_matches: describe(oppForm),
  };

  const ctx: PredictionContext = {
    competition: match.competition,
    round: match.round,
    kickoff_at: formatDate(match.kickoff_at),
    venue: match.venue,
    is_home: isHome,
    vietnam,
    opponent,
    h2h: {
      total: h2h.total,
      vietnam_wins: h2h.wins,
      draws: h2h.draws,
      vietnam_losses: h2h.losses,
      goals_for: h2h.goals_for,
      goals_against: h2h.goals_against,
      recent: h2h.recent.map(
        (m) =>
          `${formatDate(m.kickoff_at)}: ${m.home_team.name} ${m.home_score}-${m.away_score} ${m.away_team.name}`
      ),
    },
  };

  return { ctx, isHome };
}

// ---------------------------------------------------------------------------
// MÔ HÌNH DỰ PHÒNG (không cần API key, không tốn tiền)
// ---------------------------------------------------------------------------

/**
 * DỰ ĐOÁN BẰNG THỐNG KÊ — công thức Elo mà FIFA/cờ vua đều dùng.
 *
 * Ý tưởng: chênh lệch điểm số càng lớn thì cửa thắng càng cao, theo đường cong:
 *
 *   E = 1 / (1 + 10^(-(điểm_ta - điểm_địch) / 400))
 *
 *   Chênh 0 điểm   -> E = 0.50  (năm ăn năm thua)
 *   Chênh 100 điểm -> E = 0.64
 *   Chênh 400 điểm -> E = 0.91  (gần như cầm chắc)
 *
 * E là "kỳ vọng điểm" trong đó hoà tính 0.5. Ta tách E thành W/D/L bằng nhận xét:
 * hai đội càng cân tài thì xác suất hoà càng cao.
 *
 * Có điều chỉnh thêm:
 *   +60 điểm  cho lợi thế sân nhà (nghiên cứu bóng đá quốc tế cho con số này)
 *   ±8 điểm   cho mỗi trận thắng/thua trong 5 trận gần nhất (phong độ)
 */
function predictByStatistics(ctx: PredictionContext): PredictionResult {
  const HOME_ADVANTAGE = 60;
  const FORM_WEIGHT = 8;

  // Đội chưa có trong BXH thì tạm coi ngang mức trung bình khu vực
  const vnPoints = ctx.vietnam.fifa_points ?? 1100;
  const oppPoints = ctx.opponent.fifa_points ?? 1100;

  /** Điểm phong độ: thắng +1, hoà 0, thua -1 */
  const formScore = (form: string[]) =>
    form.reduce((sum, r) => sum + (r === 'W' ? 1 : r === 'L' ? -1 : 0), 0);

  const vnRating =
    vnPoints + (ctx.is_home ? HOME_ADVANTAGE : 0) + formScore(ctx.vietnam.form) * FORM_WEIGHT;
  const oppRating =
    oppPoints + (ctx.is_home ? 0 : HOME_ADVANTAGE) + formScore(ctx.opponent.form) * FORM_WEIGHT;

  // Kỳ vọng điểm của Việt Nam (0 đến 1)
  const expected = 1 / (1 + Math.pow(10, (oppRating - vnRating) / 400));

  // Xác suất hoà cao nhất khi hai đội cân bằng (expected = 0.5)
  const MAX_DRAW = 0.34;
  const drawProb = MAX_DRAW * (1 - Math.abs(2 * expected - 1));

  // Từ W + D/2 = E suy ra W = E - D/2
  const winProb = Math.max(0, expected - drawProb / 2);
  const loseProb = Math.max(0, 1 - winProb - drawProb);

  let win = Math.round(winProb * 100);
  let draw = Math.round(drawProb * 100);
  let lose = 100 - win - draw; // dồn phần lệch làm tròn vào đây

  if (lose < 0) { win += lose; lose = 0; }

  // Ước lượng tỷ số từ xác suất
  const vnGoals = Math.max(0, Math.round(expected * 3));
  const oppGoals = Math.max(0, Math.round((1 - expected) * 3));
  const predictedScore = ctx.is_home ? `${vnGoals}-${oppGoals}` : `${oppGoals}-${vnGoals}`;

  const rankGap =
    ctx.vietnam.fifa_rank && ctx.opponent.fifa_rank
      ? ctx.opponent.fifa_rank - ctx.vietnam.fifa_rank
      : 0;

  const analysis = [
    `Dựa trên mô hình thống kê Elo, đội tuyển Việt Nam (hạng ${ctx.vietnam.fifa_rank ?? '?'} FIFA, ${vnPoints.toFixed(1)} điểm) `,
    `gặp ${ctx.opponent.name} (hạng ${ctx.opponent.fifa_rank ?? '?'}, ${oppPoints.toFixed(1)} điểm) `,
    `trên ${ctx.is_home ? 'sân nhà' : 'sân khách'} tại ${ctx.competition}. `,
    rankGap > 0
      ? `Việt Nam đang được đánh giá cao hơn ${rankGap} bậc trên bảng xếp hạng FIFA. `
      : rankGap < 0
        ? `Đối thủ hiện đứng trên Việt Nam ${Math.abs(rankGap)} bậc, đây là thử thách không nhỏ. `
        : `Hai đội có trình độ khá tương đồng. `,
    ctx.is_home
      ? 'Lợi thế sân nhà cùng sự cổ vũ của khán giả được cộng thêm khoảng 60 điểm sức mạnh trong mô hình. '
      : 'Thi đấu xa nhà là bất lợi đáng kể, mô hình trừ đi lợi thế sân bãi. ',
    `Phong độ gần đây của Việt Nam: ${ctx.vietnam.form.join('-') || 'chưa có dữ liệu'}. `,
    ctx.h2h.total > 0
      ? `Lịch sử ${ctx.h2h.total} lần đối đầu: Việt Nam thắng ${ctx.h2h.vietnam_wins}, hoà ${ctx.h2h.draws}, thua ${ctx.h2h.vietnam_losses}, hiệu số ${ctx.h2h.goals_for}-${ctx.h2h.goals_against}. `
      : 'Hai đội chưa có nhiều dữ liệu đối đầu trong hệ thống. ',
    `Mô hình đưa ra tỷ lệ Thắng ${win}% - Hoà ${draw}% - Thua ${lose}%, tỷ số nhiều khả năng nhất là ${predictedScore}. `,
    '(Lưu ý: đây là dự đoán bằng công thức thống kê. Cấu hình GEMINI_API_KEY để nhận phân tích chuyên sâu từ AI.)',
  ].join('');

  const factors: string[] = [];
  if (ctx.is_home) factors.push('Lợi thế sân nhà và sự cổ vũ của khán giả');
  else factors.push('Bất lợi khi phải thi đấu trên sân khách');
  if (rankGap > 10) factors.push(`Chênh lệch ${rankGap} bậc FIFA nghiêng về Việt Nam`);
  if (rankGap < -10) factors.push(`Đối thủ hơn ${Math.abs(rankGap)} bậc FIFA`);
  const vnWins = ctx.vietnam.form.filter((f) => f === 'W').length;
  if (vnWins >= 3) factors.push(`Phong độ tốt: thắng ${vnWins}/${ctx.vietnam.form.length} trận gần nhất`);
  if (ctx.h2h.total >= 3) {
    factors.push(
      ctx.h2h.vietnam_wins > ctx.h2h.vietnam_losses
        ? 'Lịch sử đối đầu nghiêng về Việt Nam'
        : 'Lịch sử đối đầu không thuận lợi'
    );
  }

  return {
    win_pct: win,
    draw_pct: draw,
    lose_pct: lose,
    analysis_text: analysis,
    key_factors: factors.slice(0, 5),
    predicted_score: predictedScore,
    // Càng nhiều dữ liệu thì càng tự tin
    confidence: ctx.h2h.total >= 3 && ctx.vietnam.form.length >= 3 ? 'medium' : 'low',
    model_version: 'elo-statistical-v1',
  };
}

// ---------------------------------------------------------------------------
// HÀM CHÍNH
// ---------------------------------------------------------------------------

export async function getPrediction(matchId: number, forceRefresh = false) {
  const cacheKey = `ai:predict:${matchId}`;

  // ---- Bước 1: cache ----
  if (!forceRefresh) {
    const cachedResult = await cacheGet<AiPrediction>(cacheKey);
    if (cachedResult) {
      logger.debug('Dự đoán lấy từ cache', { matchId });
      return { ...cachedResult, source: 'cache' as const };
    }
  }

  // ---- Bước 2: database (bản còn hạn) ----
  if (!forceRefresh) {
    const { rows } = await query<AiPrediction>(
      'SELECT * FROM ai_predictions WHERE match_id = $1 AND expires_at > NOW()',
      [matchId]
    );
    if (rows[0]) {
      await cacheSet(cacheKey, rows[0], env.CACHE_TTL_AI);
      logger.debug('Dự đoán lấy từ database', { matchId });
      return { ...rows[0], source: 'database' as const };
    }
  }

  // ---- Bước 3: thu thập dữ liệu ----
  const { ctx } = await buildContext(matchId);

  // ---- Bước 4: gọi AI (hoặc mô hình dự phòng) ----
  let result: PredictionResult;
  let source: 'gemini' | 'statistical' | 'stale';

  if (isGeminiEnabled()) {
    try {
      result = await generatePrediction(ctx);
      source = 'gemini';
    } catch (err) {
      logger.warn('Gemini thất bại, tìm bản dự đoán cũ: ' + String(err));

      // Lớp dự phòng: bản cũ đã hết hạn vẫn tốt hơn là không có gì
      const { rows } = await query<AiPrediction>(
        'SELECT * FROM ai_predictions WHERE match_id = $1',
        [matchId]
      );
      if (rows[0]) return { ...rows[0], source: 'stale' as const };

      // Lớp dự phòng cuối: mô hình thống kê
      result = predictByStatistics(ctx);
      source = 'statistical';
    }
  } else {
    result = predictByStatistics(ctx);
    source = 'statistical';
  }

  // ---- Bước 5: lưu + cache ----
  /**
   * Dự đoán hết hạn khi nào?
   *   - Bình thường: sau CACHE_TTL_AI (6 giờ)
   *   - Nhưng KHÔNG BAO GIỜ vượt quá giờ bóng lăn — vì lúc đó dự đoán
   *     không còn ý nghĩa nữa.
   */
  const match = await matchesService.getMatchById(matchId);
  const kickoff = new Date(match.kickoff_at).getTime();
  const sixHoursLater = Date.now() + env.CACHE_TTL_AI * 1000;
  const expiresAt = new Date(Math.min(sixHoursLater, Math.max(kickoff, Date.now() + 60_000)));

  const { rows } = await query<AiPrediction>(
    `INSERT INTO ai_predictions
       (match_id, win_pct, draw_pct, lose_pct, analysis_text, key_factors,
        predicted_score, confidence, model_version, generated_at, expires_at)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9, NOW(), $10)
     -- UPSERT: đã có dự đoán cho trận này thì GHI ĐÈ thay vì báo lỗi trùng khoá
     ON CONFLICT (match_id) DO UPDATE SET
       win_pct = EXCLUDED.win_pct,
       draw_pct = EXCLUDED.draw_pct,
       lose_pct = EXCLUDED.lose_pct,
       analysis_text = EXCLUDED.analysis_text,
       key_factors = EXCLUDED.key_factors,
       predicted_score = EXCLUDED.predicted_score,
       confidence = EXCLUDED.confidence,
       model_version = EXCLUDED.model_version,
       generated_at = NOW(),
       expires_at = EXCLUDED.expires_at
     RETURNING *`,
    [
      matchId, result.win_pct, result.draw_pct, result.lose_pct,
      result.analysis_text, JSON.stringify(result.key_factors),
      result.predicted_score, result.confidence, result.model_version, expiresAt,
    ]
  );

  const saved = rows[0]!;
  await cacheSet(cacheKey, saved, env.CACHE_TTL_AI);

  logger.info('Đã tạo dự đoán mới', { matchId, source, model: result.model_version });
  return { ...saved, source };
}

/**
 * Trạng thái cấu hình AI — app dùng để hiển thị nhãn "AI thật" hay "mô hình thống kê".
 *
 * ⭐ Có kèm tình trạng HỒ KEY: bao nhiêu key đang sẵn sàng, bao nhiêu key đang
 * bị phạt nghỉ vì hết lượt. Nhìn vào đây là biết ngay có cần thêm key hay không.
 *
 * 🔐 Key trong danh sách đã được CHE ("AQ.Ab8R…mLBY"), không bao giờ lộ nguyên văn.
 */
export function getAiStatus() {
  const pool = getPoolStats();

  return {
    gemini_enabled: isGeminiEnabled(),
    model: isGeminiEnabled() ? env.GEMINI_MODEL : 'elo-statistical-v1',
    fallback: 'Mô hình thống kê Elo dựa trên điểm FIFA, phong độ và lợi thế sân nhà',
    key_pool: {
      total: pool.total,
      available: pool.available,
      cooling: pool.cooling,
      keys: pool.keys,
    },
  };
}

/** Ném lỗi nếu trận đã kết thúc — dự đoán trận đã đá xong là vô nghĩa */
export async function assertPredictable(matchId: number) {
  const match = await matchesService.getMatchById(matchId);
  if (match.status === 'finished') {
    throw AppError.unprocessable('Trận đấu đã kết thúc, không cần dự đoán nữa');
  }
  return match;
}
