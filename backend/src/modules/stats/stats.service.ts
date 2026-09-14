/**
 * ============================================================================
 * MODULES/STATS/STATS.SERVICE.TS — THỐNG KÊ SAU TRẬN & BXH CẦU THỦ
 * ============================================================================
 *
 * Cấp dữ liệu cho KHUNG ① của Tab 5 "Thống kê" (ARCHITECTURE.md mục 5.6):
 *
 *   ┌───────────────────────────────────┐
 *   │ TRẬN VỪA ĐÁ                       │ ◄ getOverview().lastMatch
 *   │ VIE 2–1 THA · ASEAN Cup · 20/9    │
 *   │ Kiểm soát bóng 58% ██████░░░░ 42% │
 *   │ ⭐ Xuất sắc nhất: Tiến Linh 8.3   │
 *   ├───────────────────────────────────┤
 *   │ BẢNG XẾP HẠNG CẦU THỦ             │ ◄ getLeaderboard()
 *   ├───────────────────────────────────┤
 *   │ CÁC TRẬN ĐÃ ĐÁ                    │ ◄ getStatsMatches() — phân trang cursor
 *   └───────────────────────────────────┘
 *
 * ----------------------------------------------------------------------------
 * 🗄️ DỮ LIỆU ĐẾN TỪ ĐÂU?
 *
 *   match_stats          — thông số cấp ĐỘI, mỗi trận 2 dòng (mỗi đội 1 dòng)
 *   player_match_stats   — thông số + điểm cấp CẦU THỦ, do engine chấm điểm ghi
 *   player_rating_stats  — số liệu ĐÃ CỘNG DỒN theo kỳ (năm, giải, đợt tập trung)
 *
 * ⚠️ VÌ SAO BXH ĐỌC TỪ BẢNG CỘNG DỒN chứ không tính trực tiếp từ từng trận?
 *
 * Tính trực tiếp = mỗi lần mở tab phải quét toàn bộ player_match_stats rồi
 * GROUP BY. Vài chục trận thì không sao, nhưng vào mùa giải có hàng triệu
 * người mở app cùng lúc sau trận đấu (mục 12.3), đó là hàng triệu câu GROUP BY
 * giống hệt nhau. Bảng cộng dồn được cập nhật MỘT lần mỗi khi chấm điểm xong,
 * còn đọc thì chỉ là một câu SELECT theo khoá chính — rẻ gần như bằng không.
 *
 * Đây là đánh đổi kinh điển: GHI phức tạp hơn một chút để ĐỌC rẻ đi rất nhiều,
 * đúng với dữ liệu mà số lần đọc lớn hơn số lần ghi hàng nghìn lần.
 * ============================================================================
 */

import { query, queryOne } from '@/config/database';
import { cached } from '@/utils/cache';
import { env } from '@/config/env';
import { getVietnamTeamId } from '@/modules/matches/matches.service';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

/** Loại kỳ thống kê — khớp ràng buộc CHECK của player_rating_stats.period_type */
export type PeriodType = 'week' | 'month' | 'year' | 'competition' | 'squad';

/** Chỉ số dùng để xếp hạng */
export type LeaderboardMetric = 'avg_rating' | 'goals' | 'assists' | 'motm' | 'cards';

/** Thông số một đội trong một trận */
export interface TeamMatchStats {
  possession_pct: number | null;
  shots: number | null;
  shots_on_target: number | null;
  expected_goals: number | null;
  corners: number | null;
  fouls: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  saves: number | null;
  passes: number | null;
  pass_accuracy_pct: number | null;
}

/** Tóm tắt một trận đã đá, dùng cho thẻ "Trận vừa đá" và danh sách trận */
export interface StatsMatch {
  id: number;
  kickoff_at: string;
  competition: string;
  home_team: { id: number; name: string; fifa_code: string | null; logo_url: string | null };
  away_team: { id: number; name: string; fifa_code: string | null; logo_url: string | null };
  home_score: number;
  away_score: number;
  /** Việt Nam đá sân nhà? App dùng để biết cột nào là "đội mình" */
  vietnam_is_home: boolean;
  /** 'win' | 'draw' | 'lose' — nhìn TỪ PHÍA VIỆT NAM */
  result: 'win' | 'draw' | 'lose';
  /** null khi nhà cung cấp chưa gửi thông số trận này */
  home_stats: TeamMatchStats | null;
  away_stats: TeamMatchStats | null;
}

/** Cầu thủ xuất sắc nhất trận */
export interface ManOfTheMatch {
  player_id: number;
  full_name: string;
  short_name: string | null;
  position: string;
  rating: number;
  goals: number;
  assists: number;
}

export interface LeaderboardRow {
  /** Thứ hạng — BẰNG ĐIỂM THÌ NGANG HẠNG (xem giải thích ở getLeaderboard) */
  rank: number;
  player_id: number;
  full_name: string;
  short_name: string | null;
  position: string;
  photo_url: string | null;
  matches: number;
  minutes: number;
  /** Giá trị của chỉ số đang xếp hạng — app hiện con số này to nhất */
  value: number;
  avg_rating: number | null;
  goals: number;
  assists: number;
  motm_count: number;
  yellow_cards: number;
  red_cards: number;
}

export interface LeaderboardResult {
  period_type: PeriodType;
  period_key: string;
  metric: LeaderboardMetric;
  /** Số phút tối thiểu để được xếp hạng điểm trung bình (chỉ áp dụng avg_rating) */
  min_minutes: number;
  rows: LeaderboardRow[];
}

// ---------------------------------------------------------------------------
// HẰNG SỐ
// ---------------------------------------------------------------------------

/**
 * ⭐ PHẢI ĐÁ ÍT NHẤT 90 PHÚT TRONG KỲ MỚI ĐƯỢC XẾP HẠNG ĐIỂM TRUNG BÌNH.
 *
 * Đặc tả mục 12.5. Không có luật này, BXH điểm trung bình sẽ vô nghĩa:
 * một cầu thủ vào sân phút 88, chạm bóng hai lần, được chấm 7.8 — và đứng
 * đầu bảng, trên cả người đá chính 6 trận liền với điểm trung bình 7.6.
 *
 * Mẫu càng nhỏ thì trung bình càng dao động mạnh. Đây là lý do mọi bảng xếp
 * hạng thống kê nghiêm túc (từ bóng đá tới đánh giá sản phẩm) đều có ngưỡng
 * tối thiểu. Các chỉ số ĐẾM (bàn thắng, kiến tạo) thì không cần, vì một bàn
 * thắng trong 1 phút vẫn là một bàn thắng thật.
 */
const MIN_MINUTES_FOR_AVG = 90;

/**
 * Tên cột SQL cho từng chỉ số.
 *
 * 🔐 BẢNG TRA CỐ ĐỊNH — KHÔNG BAO GIỜ GHÉP TÊN CỘT TỪ THAM SỐ NGƯỜI DÙNG.
 *
 * Tham số `metric` đến từ URL. Nếu viết `ORDER BY ${metric}` thì kẻ xấu gửi
 * `?metric=goals; DROP TABLE users` là xong. Tham số `$1` của SQL KHÔNG dùng
 * được cho tên cột (chỉ dùng cho GIÁ TRỊ), nên cách an toàn duy nhất là tra
 * bảng: người dùng chỉ chọn được một trong những khoá đã khai sẵn ở đây.
 * (validator đã chặn một lớp bằng z.enum, bảng này là lớp thứ hai.)
 */
const METRIC_SQL: Record<LeaderboardMetric, string> = {
  avg_rating: 'prs.avg_rating',
  goals: 'prs.goals',
  assists: 'prs.assists',
  motm: 'prs.motm_count',
  // Thẻ đỏ tính gấp 2 thẻ vàng — cùng quy ước với các bảng "fair play"
  cards: '(prs.yellow_cards + prs.red_cards * 2)',
};

// ---------------------------------------------------------------------------
// HÀM THUẦN — tách riêng để test không cần database
// ---------------------------------------------------------------------------

/**
 * Kết quả trận nhìn từ phía Việt Nam.
 *
 * Tách thành hàm thuần vì logic "đội mình là đội nào" rất dễ viết ngược:
 * VN đá sân khách thắng 1-2 thì home_score < away_score nhưng vẫn là THẮNG.
 */
export function resultForVietnam(
  homeScore: number,
  awayScore: number,
  vietnamIsHome: boolean
): 'win' | 'draw' | 'lose' {
  if (homeScore === awayScore) return 'draw';
  const vietnamWon = vietnamIsHome ? homeScore > awayScore : awayScore > homeScore;
  return vietnamWon ? 'win' : 'lose';
}

/**
 * Mã hoá / giải mã cursor phân trang.
 *
 * ⭐ VÌ SAO CURSOR CHỨ KHÔNG PHẢI ?page=3?
 *
 * Phân trang theo trang (OFFSET) có hai nhược điểm với danh sách trận:
 *   1. SAI LỆCH: đang xem trang 2 thì có thêm một trận vừa kết thúc -> mọi
 *      trận lùi xuống một vị trí -> trang 3 lặp lại đúng trận cuối của trang 2.
 *   2. CHẬM DẦN: OFFSET 5000 bắt database đọc rồi vứt đi 5000 dòng.
 *
 * Cursor ghi nhớ "trận cuối cùng tôi đã thấy" (thời điểm đá + id) và hỏi
 * "cho tôi những trận CŨ HƠN trận đó". Thêm trận mới ở đầu danh sách không
 * ảnh hưởng gì, và luôn dùng được index nên nhanh như nhau ở mọi trang.
 *
 * Có id đi kèm để phá thế hoà khi hai trận cùng giờ đá (hiếm nhưng có thật:
 * lượt cuối vòng bảng thường đá cùng giờ).
 *
 * Mã hoá base64url để cursor là một chuỗi "mờ" — app không nên (và không cần)
 * hiểu bên trong có gì, nhờ vậy backend đổi cấu trúc cursor không làm hỏng app.
 */
export function encodeCursor(kickoffAt: string, id: number): string {
  return Buffer.from(`${kickoffAt}|${id}`, 'utf8').toString('base64url');
}

export function decodeCursor(cursor: string): { kickoffAt: string; id: number } | null {
  try {
    const [kickoffAt, idText] = Buffer.from(cursor, 'base64url').toString('utf8').split('|');
    const id = Number(idText);
    // Cursor giả mạo / hỏng -> coi như không có cursor, KHÔNG ném lỗi 500
    if (!kickoffAt || !Number.isInteger(id) || Number.isNaN(Date.parse(kickoffAt))) return null;
    return { kickoffAt, id };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// TRUY VẤN DÙNG CHUNG
// ---------------------------------------------------------------------------

/**
 * SELECT một trận đã đá kèm thông số HAI đội.
 *
 * `LEFT JOIN match_stats` hai lần (một lần cho đội nhà, một lần cho đội khách)
 * — LEFT chứ không phải INNER, vì trận chưa có thông số vẫn phải hiện ra
 * (chỉ là phần thanh so sánh sẽ trống). INNER JOIN sẽ làm trận đó biến mất
 * khỏi danh sách, và người dùng tưởng dữ liệu bị thiếu trận.
 *
 * `to_jsonb(hs) - 'id' - ...` gom cả dòng thông số thành một object JSON rồi
 * bỏ những cột app không cần. Gọn hơn nhiều so với liệt kê 11 cột hai lần.
 */
const STATS_MATCH_SELECT = `
  SELECT
    m.id, m.kickoff_at, m.competition, m.home_score, m.away_score,
    json_build_object('id', ht.id, 'name', ht.name, 'fifa_code', ht.fifa_code, 'logo_url', ht.logo_url) AS home_team,
    json_build_object('id', at.id, 'name', at.name, 'fifa_code', at.fifa_code, 'logo_url', at.logo_url) AS away_team,
    (m.home_team_id = $1) AS vietnam_is_home,
    CASE WHEN hs.id IS NULL THEN NULL
         ELSE to_jsonb(hs) - 'id' - 'match_id' - 'team_id' - 'source' - 'updated_at' - 'offsides' END AS home_stats,
    CASE WHEN aws.id IS NULL THEN NULL
         ELSE to_jsonb(aws) - 'id' - 'match_id' - 'team_id' - 'source' - 'updated_at' - 'offsides' END AS away_stats
  FROM matches m
  JOIN teams ht ON ht.id = m.home_team_id
  JOIN teams at ON at.id = m.away_team_id
  LEFT JOIN match_stats hs  ON hs.match_id  = m.id AND hs.team_id  = m.home_team_id
  LEFT JOIN match_stats aws ON aws.match_id = m.id AND aws.team_id = m.away_team_id
  WHERE m.status = 'finished'
    AND (m.home_team_id = $1 OR m.away_team_id = $1)
`;

type StatsMatchRow = Omit<StatsMatch, 'result'> & { kickoff_at: string | Date };

/**
 * Chuẩn hoá một dòng kết quả thành StatsMatch.
 *
 * Hai việc nhỏ nhưng bắt buộc:
 *   • kickoff_at: driver pg trả Date, PGlite có lúc trả chuỗi -> ép về ISO
 *   • expected_goals là NUMERIC -> JSON trả về dạng CHUỖI "1.45" -> ép số.
 *     Bỏ qua bước này là app nhận "1.45" + 1 = "1.451" (nối chuỗi!).
 */
function toStatsMatch(row: StatsMatchRow): StatsMatch {
  const fixNumbers = (s: TeamMatchStats | null): TeamMatchStats | null =>
    s ? { ...s, expected_goals: s.expected_goals === null ? null : Number(s.expected_goals) } : null;

  return {
    ...row,
    kickoff_at: new Date(row.kickoff_at).toISOString(),
    home_stats: fixNumbers(row.home_stats),
    away_stats: fixNumbers(row.away_stats),
    result: resultForVietnam(row.home_score, row.away_score, row.vietnam_is_home),
  };
}

// ---------------------------------------------------------------------------
// 1. TỔNG QUAN — GET /stats/overview
// ---------------------------------------------------------------------------

/**
 * Trận vừa đá + cầu thủ xuất sắc nhất + top 5 BXH cầu thủ năm hiện tại.
 *
 * Gộp ba khối vào MỘT request vì khung ① luôn hiện cả ba cùng lúc — cùng lý
 * do với /team/overview (xem đầu file team.service.ts).
 *
 * Cache ngắn (CACHE_TTL_LIVE × 4 = 60 giây): trận vừa kết thúc thì điểm cầu
 * thủ còn được đính chính trong vài phút đầu (mục 12.4), cache 24 giờ sẽ giữ
 * điểm sai suốt cả ngày.
 */
export async function getOverview() {
  return cached('stats:overview', env.CACHE_TTL_LIVE * 4, async () => {
    const vieId = await getVietnamTeamId();

    const lastRow = await queryOne<StatsMatchRow>(
      `${STATS_MATCH_SELECT} ORDER BY m.kickoff_at DESC, m.id DESC LIMIT 1`,
      [vieId]
    );
    const lastMatch = lastRow ? toStatsMatch(lastRow) : null;

    /**
     * Cầu thủ xuất sắc nhất — CHỈ LẤY CẦU THỦ VIỆT NAM.
     *
     * App này về đội tuyển Việt Nam: nếu thủ môn đối phương cứu thua xuất
     * thần và được 8.9, danh hiệu MOTM trận vẫn là của họ, nhưng thẻ trên
     * màn hình này hiện "Xuất sắc nhất phía Việt Nam". Đó là lý do lọc
     * team_id và sắp theo điểm thay vì chỉ dựa vào cờ is_motm.
     */
    const motm = lastMatch
      ? await queryOne<ManOfTheMatch & { rating: string; goals: string; assists: string }>(
          /**
           * Đọc từ VIEW v_player_match_summary (migration 002) thay vì tự
           * đếm bàn thắng từ match_events. View đã gói sẵn quy ước "bàn thắng
           * = goal + penalty, KHÔNG tính phản lưới" — viết lại lần nữa ở đây
           * là tạo ra hai định nghĩa "bàn thắng" có thể lệch nhau theo thời gian.
           */
          `SELECT v.player_id, p.full_name, p.short_name, p.position, v.rating,
                  v.goals, v.assists
           FROM v_player_match_summary v
           JOIN players p ON p.id = v.player_id
           WHERE v.match_id = $1 AND v.team_id = $2 AND v.rating IS NOT NULL
           ORDER BY v.is_motm DESC, v.rating DESC, v.minutes_played DESC
           LIMIT 1`,
          [lastMatch.id, vieId]
        )
      : null;

    // Kỳ mặc định = năm có dữ liệu mới nhất (không phải năm hiện tại theo đồng hồ:
    // đầu tháng 1 chưa đá trận nào thì "năm nay" trống trơn)
    const latestYear = await queryOne<{ period_key: string }>(
      `SELECT period_key FROM player_rating_stats
       WHERE period_type = 'year' ORDER BY period_key DESC LIMIT 1`
    );

    const top = latestYear
      ? await getLeaderboard('year', latestYear.period_key, 'avg_rating', 5)
      : null;

    return {
      lastMatch,
      // COUNT() trả BIGINT -> driver pg đưa về dạng chuỗi, phải ép số
      manOfTheMatch: motm
        ? { ...motm, rating: Number(motm.rating), goals: Number(motm.goals), assists: Number(motm.assists) }
        : null,
      leaderboard: top,
    };
  });
}

// ---------------------------------------------------------------------------
// 2. DANH SÁCH TRẬN ĐÃ ĐÁ — GET /stats/matches?cursor
// ---------------------------------------------------------------------------

export async function getStatsMatches(limit: number, cursor?: string) {
  const vieId = await getVietnamTeamId();
  const decoded = cursor ? decodeCursor(cursor) : null;

  /**
   * Lấy DƯ MỘT dòng (limit + 1) để biết còn trang sau hay không.
   *
   * Cách ngây thơ là chạy thêm một câu COUNT(*) — tốn gấp đôi. Lấy dư một
   * dòng thì chỉ cần nhìn: có dòng thứ limit+1 -> còn trang sau, bỏ dòng đó
   * đi rồi dùng dòng thứ limit làm cursor tiếp theo.
   *
   * `(m.kickoff_at, m.id) < ($2, $3)` là phép so sánh BỘ (row comparison):
   * "cũ hơn theo giờ đá, cùng giờ thì id nhỏ hơn". Viết tay bằng AND/OR sẽ
   * dài và rất dễ sai dấu.
   */
  const params: unknown[] = [vieId];
  let where = '';
  if (decoded) {
    params.push(decoded.kickoffAt, decoded.id);
    where = ' AND (m.kickoff_at, m.id) < ($2::timestamptz, $3::int)';
  }
  params.push(limit + 1);

  const { rows } = await query<StatsMatchRow>(
    `${STATS_MATCH_SELECT}${where}
     ORDER BY m.kickoff_at DESC, m.id DESC
     LIMIT $${params.length}`,
    params
  );

  const hasMore = rows.length > limit;
  const items = rows.slice(0, limit).map(toStatsMatch);
  const last = items[items.length - 1];

  return {
    matches: items,
    nextCursor: hasMore && last ? encodeCursor(last.kickoff_at, last.id) : null,
  };
}

// ---------------------------------------------------------------------------
// 3. BẢNG XẾP HẠNG CẦU THỦ — GET /stats/players/leaderboard
// ---------------------------------------------------------------------------

/**
 * BXH cầu thủ theo một kỳ và một chỉ số.
 *
 * ⭐ BẰNG ĐIỂM THÌ NGANG HẠNG — dùng RANK(), không dùng ROW_NUMBER().
 *
 *   Cầu thủ   Bàn   ROW_NUMBER   RANK
 *   A          5        1         1
 *   B          4        2         2
 *   C          4        3   ✗     2   ✓   ← cùng 4 bàn, không có lý do gì C xếp dưới B
 *   D          3        4         4       ← hạng 3 bị bỏ qua, đúng chuẩn thể thao
 *
 * ROW_NUMBER sẽ xếp C dưới B chỉ vì thứ tự đọc từ database — người hâm mộ
 * của C sẽ (có lý) phàn nàn. Đặc tả mục 12.5 yêu cầu ngang hạng.
 *
 * Sắp xếp phụ (sau chỉ số chính) chỉ để danh sách có thứ tự ỔN ĐỊNH giữa các
 * lần tải — nó KHÔNG ảnh hưởng tới số hạng, vì RANK() chỉ xét chỉ số chính.
 */
export async function getLeaderboard(
  periodType: PeriodType,
  periodKey: string,
  metric: LeaderboardMetric,
  limit: number
): Promise<LeaderboardResult> {
  const cacheKey = `stats:leaderboard:${periodType}:${periodKey}:${metric}:${limit}`;

  return cached(cacheKey, env.CACHE_TTL_LIVE * 4, async () => {
    const metricSql = METRIC_SQL[metric];

    // Điểm trung bình: phải đủ phút + có điểm. Chỉ số đếm: phải > 0 mới đáng
    // lên bảng (BXH "kiến tạo" mà 20 dòng đầu toàn số 0 thì vô nghĩa).
    const qualify =
      metric === 'avg_rating'
        ? `prs.avg_rating IS NOT NULL AND prs.minutes >= ${MIN_MINUTES_FOR_AVG}`
        : `${metricSql} > 0`;

    const { rows } = await query<
      Omit<LeaderboardRow, 'value' | 'avg_rating' | 'rank'> & {
        rank: string;
        value: string;
        avg_rating: string | null;
      }
    >(
      `SELECT
         RANK() OVER (ORDER BY ${metricSql} DESC) AS rank,
         p.id AS player_id, p.full_name, p.short_name, p.position, p.photo_url,
         prs.matches, prs.minutes, ${metricSql} AS value, prs.avg_rating,
         prs.goals, prs.assists, prs.motm_count, prs.yellow_cards, prs.red_cards
       FROM player_rating_stats prs
       JOIN players p ON p.id = prs.player_id
       WHERE prs.period_type = $1 AND prs.period_key = $2 AND ${qualify}
       ORDER BY ${metricSql} DESC, prs.minutes DESC, p.full_name ASC
       LIMIT $3`,
      [periodType, periodKey, limit]
    );

    return {
      period_type: periodType,
      period_key: periodKey,
      metric,
      min_minutes: MIN_MINUTES_FOR_AVG,
      /**
       * Ép kiểu số: RANK() trả BIGINT và NUMERIC trả chuỗi qua driver pg.
       * Để nguyên thì app so sánh "10" < "9" (so chuỗi) -> hạng 10 đứng trước hạng 9.
       */
      rows: rows.map((r) => ({
        ...r,
        rank: Number(r.rank),
        value: Number(r.value),
        avg_rating: r.avg_rating === null ? null : Number(r.avg_rating),
      })),
    };
  });
}

/**
 * Các kỳ đang có dữ liệu — cho ô chọn "[Năm 2026 ▾]" ở giao diện.
 *
 * Chỉ trả những kỳ THẬT SỰ có số liệu: cho người dùng chọn "Năm 2019" rồi
 * nhận về bảng trống là một trải nghiệm tệ.
 */
export async function getLeaderboardPeriods() {
  return cached('stats:periods', env.CACHE_TTL_LIVE * 4, async () => {
    const { rows } = await query<{ period_type: PeriodType; period_key: string; players: string }>(
      `SELECT period_type, period_key, COUNT(*) AS players
       FROM player_rating_stats
       GROUP BY period_type, period_key
       ORDER BY period_type, period_key DESC`
    );
    return rows.map((r) => ({ ...r, players: Number(r.players) }));
  });
}
