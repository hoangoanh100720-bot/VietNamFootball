/**
 * ============================================================================
 * SERVICES/RATING/RATING.SERVICE.TS — CHẤM ĐIỂM CẢ TRẬN & ĐỌC KẾT QUẢ
 * ============================================================================
 *
 * Đặc tả: ARCHITECTURE.md mục 12.3
 *
 * File này là phần "bẩn" bao quanh engine thuần (engine.ts):
 * nó đọc database, gọi engine, rồi ghi kết quả xuống.
 *
 * ----------------------------------------------------------------------------
 * 🏗️ VÌ SAO TÁCH LÀM HAI FILE?
 *
 *   engine.ts          — hàm THUẦN: không DB, không mạng, test được ngay
 *   rating.service.ts  — phần chạm vào DB: khó test hơn, nhưng ít logic hơn
 *
 * Đây là mẫu kiến trúc rất đáng học: dồn hết phần LOGIC PHỨC TẠP vào chỗ dễ
 * test, để lại phần chạm-thế-giới-bên-ngoài càng mỏng càng tốt.
 *
 * Kết quả cụ thể: 44 phép thử cho toàn bộ bảng quy tắc chạy trong vài mili-giây
 * mà không cần dựng database (xem scripts/rating-test.mjs).
 *
 * ----------------------------------------------------------------------------
 * ⭐ CHẤM LẠI TOÀN BỘ, KHÔNG CỘNG DỒN
 *
 * Mỗi lần chạy, service chấm lại TẤT CẢ cầu thủ của trận từ đầu — không sửa
 * đắp lên điểm cũ.
 *
 * Vì sao? Vì dữ liệu bóng đá LUÔN bị sửa: VAR huỷ bàn thắng, nhà cung cấp đính
 * chính số liệu, trọng tài đổi quyết định. Nếu cộng dồn, một bàn thắng bị huỷ
 * sẽ để lại +1.0 vĩnh viễn trong điểm số mà không cách nào gỡ ra.
 *
 * Chấm lại từ đầu thì dữ liệu đổi bao nhiêu lần, điểm vẫn luôn đúng.
 * ============================================================================
 */

import { query, queryOne } from '@/config/database';
import { logger } from '@/utils/logger';
import { cacheDel } from '@/utils/cache';
import { rate, pickManOfTheMatch, type RatingRuleset, type RatingBreakdownItem } from './engine';
import type { PlayerPosition } from '@/types';

// ---------------------------------------------------------------------------
// ĐỌC BỘ QUY TẮC
// ---------------------------------------------------------------------------

/**
 * Bộ quy tắc đang bật, nhớ lại sau lần đọc đầu.
 *
 * Chấm một trận cần gọi engine ~40 lần (mỗi cầu thủ một lần). Đọc database 40
 * lần cho cùng một bộ quy tắc là lãng phí rõ ràng.
 *
 * ⚠️ Cache trong RAM nên đổi ruleset trong database sẽ KHÔNG có tác dụng cho
 * tới khi khởi động lại server. Đó là đánh đổi chấp nhận được: bộ quy tắc chỉ
 * đổi vài lần một năm, và `clearRulesetCache()` bên dưới cho phép admin làm mới.
 */
let cachedRuleset: RatingRuleset | null = null;

export async function getActiveRuleset(): Promise<RatingRuleset | null> {
  if (cachedRuleset) return cachedRuleset;

  const row = await queryOne<{ version: string; rules: unknown }>(
    'SELECT version, rules FROM rating_rulesets WHERE is_active = TRUE LIMIT 1'
  );

  if (!row) {
    logger.warn(
      '[Rating] Chưa có bộ quy tắc nào được bật. Chạy `npm run db:reset` để nạp ruleset 2026.1.'
    );
    return null;
  }

  /**
   * Cột `rules` là JSONB — tuỳ driver mà về dạng object đã parse hoặc chuỗi thô.
   * Chuẩn hoá một lần ở đây, giống cách làm với `confederations` trong team.service.ts.
   */
  const rules = typeof row.rules === 'string' ? JSON.parse(row.rules) : row.rules;

  cachedRuleset = { version: row.version, rules } as RatingRuleset;
  return cachedRuleset;
}

/** Xoá cache bộ quy tắc — gọi sau khi admin sửa hệ số */
export function clearRulesetCache(): void {
  cachedRuleset = null;
}

// ---------------------------------------------------------------------------
// CHẤM ĐIỂM MỘT TRẬN
// ---------------------------------------------------------------------------

/** Dòng dữ liệu đọc lên để chấm điểm cho một cầu thủ */
interface RatingInputRow {
  player_id: number;
  team_id: number;
  position: PlayerPosition;
  minutes_played: number;
  key_passes: number | null;
  shots_on_target: number | null;
  tackles: number | null;
  interceptions: number | null;
  saves: number | null;
  goals_conceded: number | null;
  /** Đếm từ match_events — nguồn DUY NHẤT cho bàn thắng và thẻ phạt */
  goals: string;
  assists: string;
  yellow_cards: string;
  red_cards: string;
  own_goals: string;
  missed_penalties: string;
}

export interface RateMatchResult {
  match_id: number;
  ruleset_version: string;
  /** Số cầu thủ đã chấm được điểm */
  rated: number;
  /** Số cầu thủ bị bỏ qua (đá dưới 10 phút) */
  skipped: number;
  /** player_id của cầu thủ xuất sắc nhất trận */
  motm: number | null;
}

/**
 * ⭐ CHẤM ĐIỂM TOÀN BỘ CẦU THỦ CỦA MỘT TRẬN.
 *
 * @param matchId Id trận cần chấm
 * @param trigger Vì sao chạy: 'live' (đang đá) · 'finalize' (chốt sau trận)
 *                · 'correction' (đính chính) · 'manual' · 'ruleset' (đổi hệ số)
 *
 * Quy trình (đúng ARCHITECTURE.md mục 12.3):
 *   1. Đọc số liệu + đếm sự kiện của mọi cầu thủ trong trận
 *   2. Gọi engine cho từng người
 *   3. Ghi điểm + bảng giải thích xuống player_match_stats
 *   4. Chọn và đánh dấu cầu thủ xuất sắc nhất trận
 *   5. Ghi một dòng vào rating_runs để truy vết
 */
export async function rateMatch(
  matchId: number,
  trigger: 'live' | 'finalize' | 'correction' | 'manual' | 'ruleset' = 'finalize'
): Promise<RateMatchResult | null> {
  const ruleset = await getActiveRuleset();
  if (!ruleset) return null;

  // --- B1: bối cảnh trận ---
  const match = await queryOne<{
    id: number;
    home_team_id: number;
    away_team_id: number;
    home_score: number;
    away_score: number;
    status: string;
  }>(
    'SELECT id, home_team_id, away_team_id, home_score, away_score, status FROM matches WHERE id = $1',
    [matchId]
  );

  if (!match) {
    logger.warn('[Rating] Không tìm thấy trận #' + matchId);
    return null;
  }

  // --- B2: đọc số liệu + đếm sự kiện trong MỘT truy vấn ---
  /**
   * 🔑 BÀN THẮNG VÀ THẺ PHẠT ĐẾM TỪ `match_events`, KHÔNG LƯU TRÙNG SANG
   * `player_match_stats`.
   *
   * Vì sao? Nếu lưu cả hai nơi, đến lúc VAR huỷ một bàn thắng thì phải nhớ sửa
   * đủ hai chỗ. Quên một chỗ là số liệu lệch nhau vĩnh viễn, và không ai biết
   * bên nào đúng.
   *
   * Nguyên tắc: MỖI SỰ THẬT CHỈ LƯU Ở MỘT NƠI (single source of truth).
   * Ở đây `match_events` là nguồn duy nhất, mọi con số khác đếm ra từ nó.
   */
  const { rows } = await query<RatingInputRow>(
    `SELECT
       pms.player_id,
       pms.team_id,
       p.position,
       pms.minutes_played,
       pms.key_passes,
       pms.shots_on_target,
       pms.tackles,
       pms.interceptions,
       pms.saves,
       pms.goals_conceded,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.player_id = pms.player_id
           AND e.type IN ('goal','penalty'))::text                       AS goals,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.assist_player_id = pms.player_id
           AND e.type = 'goal')::text                                    AS assists,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.player_id = pms.player_id
           AND e.type = 'yellow_card')::text                             AS yellow_cards,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.player_id = pms.player_id
           AND e.type IN ('red_card','second_yellow'))::text             AS red_cards,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.player_id = pms.player_id
           AND e.type = 'own_goal')::text                                AS own_goals,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.player_id = pms.player_id
           AND e.type = 'missed_penalty')::text                          AS missed_penalties
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     WHERE pms.match_id = $1`,
    [matchId]
  );

  if (rows.length === 0) {
    logger.info('[Rating] Trận #' + matchId + ' chưa có số liệu cầu thủ — bỏ qua.');
    return null;
  }

  const isFinished = match.status === 'finished';

  // --- B3: chấm điểm từng người ---
  const results: Array<{
    player_id: number;
    rating: number | null;
    breakdown: RatingBreakdownItem[];
    minutes_played: number;
    is_winner: boolean;
  }> = [];

  for (const row of rows) {
    const isHome = row.team_id === match.home_team_id;
    const teamGoals = isHome ? match.home_score : match.away_score;
    const opponentGoals = isHome ? match.away_score : match.home_score;

    const result = rate(
      {
        minutes_played: row.minutes_played,
        // COUNT() của Postgres trả CHUỖI -> phải Number() (xem team.service.ts)
        goals: Number(row.goals),
        assists: Number(row.assists),
        key_passes: row.key_passes,
        shots_on_target: row.shots_on_target,
        tackles: row.tackles,
        interceptions: row.interceptions,
        saves: row.saves,
        goals_conceded: row.goals_conceded,
        yellow_cards: Number(row.yellow_cards),
        red_cards: Number(row.red_cards),
        own_goals: Number(row.own_goals),
        missed_penalties: Number(row.missed_penalties),
      },
      row.position,
      { team_goals: teamGoals, opponent_goals: opponentGoals, is_finished: isFinished },
      ruleset
    );

    results.push({
      player_id: row.player_id,
      rating: result.rating,
      breakdown: result.breakdown,
      minutes_played: row.minutes_played,
      is_winner: isFinished && teamGoals > opponentGoals,
    });
  }

  // --- B4: chọn cầu thủ xuất sắc nhất trận ---
  const motm = isFinished ? pickManOfTheMatch(results) : null;

  // --- B5: ghi xuống database ---
  for (const r of results) {
    await query(
      `UPDATE player_match_stats
       SET rating = $1,
           rating_source = 'computed',
           rating_breakdown = $2,
           is_motm = $3,
           updated_at = NOW()
       WHERE match_id = $4 AND player_id = $5`,
      [r.rating, JSON.stringify(r.breakdown), r.player_id === motm, matchId, r.player_id]
    );
  }

  // --- B6: ghi vết để truy được "lần chấm nào đã đổi điểm" ---
  await query(
    `INSERT INTO rating_runs (match_id, trigger, data_version, ruleset_version, changed_players, finished_at)
     VALUES ($1, $2, 0, $3, $4, NOW())`,
    [matchId, trigger, ruleset.version, results.length]
  );

  /**
   * Xoá cache liên quan. Thiếu bước này thì app vẫn nhận điểm CŨ trong 24 giờ
   * tiếp theo — và người dùng sẽ tưởng engine không chạy.
   */
  await cacheDel('squad:*');
  await cacheDel(`match:${matchId}*`);

  const rated = results.filter((r) => r.rating !== null).length;

  logger.info(
    '[Rating] Trận #' + matchId + ': chấm ' + rated + '/' + results.length + ' cầu thủ' +
      (motm ? ', MOTM = cầu thủ #' + motm : '') +
      ' (ruleset ' + ruleset.version + ')'
  );

  return {
    match_id: matchId,
    ruleset_version: ruleset.version,
    rated,
    skipped: results.length - rated,
    motm,
  };
}

// ---------------------------------------------------------------------------
// ĐỌC KẾT QUẢ
// ---------------------------------------------------------------------------

export interface PlayerRating {
  player_id: number;
  full_name: string;
  short_name: string | null;
  position: PlayerPosition;
  shirt_number: number | null;
  minutes_played: number;
  rating: number | null;
  rating_source: string | null;
  is_motm: boolean;
  /** Bảng giải thích "Vì sao 8.3?" */
  breakdown: RatingBreakdownItem[];
  goals: number;
  assists: number;
  yellow_cards: number;
  red_cards: number;
}

/**
 * Đọc điểm của mọi cầu thủ trong một trận, kèm bảng giải thích.
 *
 * Dùng cho: sơ đồ đội hình (điểm trên đầu cầu thủ) và tab Thống kê.
 */
export async function getMatchRatings(matchId: number): Promise<PlayerRating[]> {
  const { rows } = await query<PlayerRating & { breakdown: unknown }>(
    `SELECT
       pms.player_id,
       p.full_name,
       p.short_name,
       p.position,
       p.shirt_number,
       pms.minutes_played,
       pms.rating,
       pms.rating_source,
       pms.is_motm,
       pms.rating_breakdown AS breakdown,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.player_id = pms.player_id
           AND e.type IN ('goal','penalty'))::int                AS goals,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.assist_player_id = pms.player_id
           AND e.type = 'goal')::int                             AS assists,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.player_id = pms.player_id
           AND e.type = 'yellow_card')::int                      AS yellow_cards,
       (SELECT COUNT(*) FROM match_events e
         WHERE e.match_id = pms.match_id AND e.player_id = pms.player_id
           AND e.type IN ('red_card','second_yellow'))::int      AS red_cards
     FROM player_match_stats pms
     JOIN players p ON p.id = pms.player_id
     WHERE pms.match_id = $1
     ORDER BY pms.rating DESC NULLS LAST`,
    [matchId]
  );

  return rows.map((r) => ({
    ...r,
    // rating là NUMERIC -> driver có thể trả chuỗi "8.3"
    rating: r.rating === null ? null : Number(r.rating),
    breakdown: parseBreakdown(r.breakdown),
  }));
}

/** Đọc bảng giải thích từ JSONB, an toàn với dữ liệu hỏng hoặc rỗng */
function parseBreakdown(value: unknown): RatingBreakdownItem[] {
  if (Array.isArray(value)) return value as RatingBreakdownItem[];
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
}
