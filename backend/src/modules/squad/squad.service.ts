/**
 * ============================================================================
 * MODULES/SQUAD/SQUAD.SERVICE.TS — ĐỘI HÌNH THI ĐẤU
 * ============================================================================
 *
 * Tab 2 của app cần 3 thứ:
 *   1. Sơ đồ chiến thuật (3-4-3) + 11 cầu thủ đá chính KÈM TOẠ ĐỘ để vẽ lên sân
 *   2. Danh sách dự bị
 *   3. Tổng giá trị đội hình (đơn vị euro)
 */

import { query, queryOne } from '@/config/database';
import { cached } from '@/utils/cache';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import type { LineupPlayer } from '@/types';

/** Cột cầu thủ lấy kèm khi JOIN — khai báo một lần để khỏi lặp lại */
const LINEUP_SELECT = `
  SELECT
    lp.id, lp.player_id, lp.is_starting, lp.position_x, lp.position_y,
    lp.shirt_number, lp.is_captain,
    p.full_name, p.short_name, p.position, p.photo_url,
    p.market_value_eur, p.current_club, p.caps, p.goals
  FROM lineup_players lp
  JOIN players p ON p.id = lp.player_id
  WHERE lp.lineup_id = $1
`;

/**
 * ĐỘI HÌNH HIỆN TẠI
 *
 * Chú ý cách sắp xếp: ORDER BY lp.position_y ASC
 * -> thủ môn (y nhỏ) đứng đầu danh sách, tiền đạo (y lớn) đứng cuối.
 * App vẽ theo đúng thứ tự này là ra sơ đồ từ dưới lên trên.
 */
export async function getCurrentSquad() {
  return cached('squad:current', env.CACHE_TTL_STATIC, async () => {
    const { rows: lineups } = await query<{ id: number; formation: string; updated_at: Date }>(
      `SELECT l.id, l.formation, l.updated_at
       FROM lineups l
       JOIN teams t ON t.id = l.team_id
       WHERE t.fifa_code = 'VIE' AND l.is_current = TRUE
       ORDER BY l.updated_at DESC
       LIMIT 1`
    );

    const lineup = lineups[0];
    if (!lineup) {
      throw AppError.notFound('Chưa có dữ liệu đội hình. Hãy chạy: npm run seed');
    }

    const { rows: players } = await query<LineupPlayer>(
      `${LINEUP_SELECT} ORDER BY lp.is_starting DESC, lp.position_y ASC NULLS LAST, lp.shirt_number ASC`
    , [lineup.id]);

    return {
      formation: lineup.formation,
      updated_at: lineup.updated_at,
      // Tách làm hai mảng cho app dễ dùng: một để vẽ sân, một để liệt kê ghế dự bị
      starting: players.filter((p) => p.is_starting),
      bench: players.filter((p) => !p.is_starting),
    };
  });
}

/**
 * TỔNG GIÁ TRỊ ĐỘI HÌNH
 *
 * Trả về tổng + phân tích theo tuyến + top 5 cầu thủ đắt giá nhất.
 *
 * LƯU Ý KIỂU DỮ LIỆU: market_value_eur là BIGINT. Driver Postgres trả BIGINT
 * dưới dạng CHUỖI (vì số JS chỉ an toàn tới 2^53). Ta phải Number() lại.
 * Với giá trị cầu thủ (vài trăm nghìn euro) thì hoàn toàn an toàn.
 */
export async function getSquadValue() {
  return cached('squad:value', env.CACHE_TTL_STATIC, async () => {
    const { rows } = await query<{
      total: string; count: string; position: string; avg_value: string;
    }>(
      `SELECT
         p.position,
         COUNT(*)                       AS count,
         SUM(p.market_value_eur)        AS total,
         ROUND(AVG(p.market_value_eur)) AS avg_value
       FROM players p
       JOIN teams t ON t.id = p.team_id
       WHERE t.fifa_code = 'VIE' AND p.is_active = TRUE
       GROUP BY p.position
       ORDER BY p.position`
    );

    // Nhãn tiếng Việt cho từng tuyến
    const labels: Record<string, string> = {
      GK: 'Thủ môn', DF: 'Hậu vệ', MF: 'Tiền vệ', FW: 'Tiền đạo',
    };

    const byPosition = rows.map((r) => ({
      position: r.position,
      label: labels[r.position] ?? r.position,
      count: Number(r.count),
      total_eur: Number(r.total),
      avg_eur: Number(r.avg_value),
    }));

    const totalEur = byPosition.reduce((sum, p) => sum + p.total_eur, 0);
    const totalPlayers = byPosition.reduce((sum, p) => sum + p.count, 0);

    // Top 5 cầu thủ giá trị cao nhất
    const { rows: topPlayers } = await query<{
      id: number; full_name: string; short_name: string; position: string;
      market_value_eur: string; current_club: string; photo_url: string | null;
    }>(
      `SELECT p.id, p.full_name, p.short_name, p.position,
              p.market_value_eur, p.current_club, p.photo_url
       FROM players p
       JOIN teams t ON t.id = p.team_id
       WHERE t.fifa_code = 'VIE' AND p.is_active = TRUE
       ORDER BY p.market_value_eur DESC
       LIMIT 5`
    );

    return {
      total_eur: totalEur,
      total_players: totalPlayers,
      average_eur: totalPlayers > 0 ? Math.round(totalEur / totalPlayers) : 0,
      by_position: byPosition,
      most_valuable: topPlayers.map((p) => ({
        ...p,
        market_value_eur: Number(p.market_value_eur),
      })),
    };
  });
}

/**
 * ============================================================================
 * ⭐ ĐỘI HÌNH TRẬN VỪA ĐÁ — KÈM ĐIỂM CẦU THỦ (ARCHITECTURE.md mục 5.3)
 * ============================================================================
 *
 * Khác `getCurrentSquad()` ở chỗ: hàm này trả về đội hình của MỘT TRẬN ĐÃ ĐÁ,
 * kèm điểm số, thẻ phạt và bàn thắng của từng người — thứ để vẽ badge lên đầu
 * cầu thủ trên sơ đồ sân.
 *
 * ----------------------------------------------------------------------------
 * 🔗 GHÉP DỮ LIỆU TỪ BA NGUỒN
 *
 *   lineup_players    — ai đá chính, đứng ở toạ độ nào
 *   player_match_stats— điểm, số phút, chỉ số chi tiết
 *   match_events      — bàn thắng, thẻ phạt, thay người
 *
 * LEFT JOIN với player_match_stats chứ không INNER JOIN: cầu thủ dự bị không
 * vào sân sẽ KHÔNG có dòng nào trong player_match_stats. Dùng INNER JOIN là
 * họ biến mất khỏi danh sách dự bị — mà người dùng vẫn muốn thấy đủ đội hình.
 */
export async function getLastMatchSquad() {
  return cached('squad:last-match', env.CACHE_TTL_LIVE, async () => {
    // --- B1: tìm trận đã kết thúc gần nhất CÓ chấm điểm ---
    const match = await queryOne<{
      id: number;
      kickoff_at: Date;
      home_score: number;
      away_score: number;
      home_name: string;
      away_name: string;
      home_code: string | null;
      away_code: string | null;
      is_home: boolean;
    }>(
      `SELECT m.id, m.kickoff_at, m.home_score, m.away_score,
              h.name AS home_name, a.name AS away_name,
              h.fifa_code AS home_code, a.fifa_code AS away_code,
              (h.fifa_code = 'VIE') AS is_home
       FROM matches m
       JOIN teams h ON h.id = m.home_team_id
       JOIN teams a ON a.id = m.away_team_id
       WHERE m.status = 'finished'
         AND EXISTS (SELECT 1 FROM player_match_stats pms WHERE pms.match_id = m.id)
       ORDER BY m.kickoff_at DESC
       LIMIT 1`
    );

    if (!match) {
      throw AppError.notFound(
        'Chưa có trận nào được chấm điểm. Chạy: npm run db:reset rồi npm run rate'
      );
    }

    // --- B2: đọc đội hình + điểm trong MỘT truy vấn ---
    /**
     * ⚠️ `lineups` gắn với TRẬN qua cột match_id. Nếu trận chưa có bản ghi
     * lineup riêng, ta lùi về đội hình hiện tại — thà hiện đúng người với
     * điểm đúng, còn hơn không hiện gì.
     */
    const { rows: players } = await query<Record<string, unknown>>(
      `SELECT
         lp.id, lp.player_id, lp.is_starting, lp.position_x, lp.position_y,
         lp.shirt_number, lp.is_captain,
         p.full_name, p.short_name, p.position, p.photo_url,
         p.market_value_eur, p.current_club, p.caps, p.goals,

         pms.minutes_played,
         pms.rating,
         pms.rating_source,
         pms.is_motm,
         pms.rating_breakdown,

         (SELECT COUNT(*) FROM match_events e
           WHERE e.match_id = $2 AND e.player_id = lp.player_id
             AND e.type IN ('goal','penalty'))::int          AS match_goals,
         (SELECT COUNT(*) FROM match_events e
           WHERE e.match_id = $2 AND e.assist_player_id = lp.player_id
             AND e.type = 'goal')::int                       AS match_assists,
         (SELECT COUNT(*) FROM match_events e
           WHERE e.match_id = $2 AND e.player_id = lp.player_id
             AND e.type = 'yellow_card')::int                AS yellow_cards,
         (SELECT COUNT(*) FROM match_events e
           WHERE e.match_id = $2 AND e.player_id = lp.player_id
             AND e.type IN ('red_card','second_yellow'))::int AS red_cards,
         (SELECT MIN(e.minute) FROM match_events e
           WHERE e.match_id = $2 AND e.related_player_id = lp.player_id
             AND e.type = 'substitution')                    AS subbed_out_at
       FROM lineup_players lp
       JOIN players p ON p.id = lp.player_id
       LEFT JOIN player_match_stats pms
              ON pms.player_id = lp.player_id AND pms.match_id = $2
       WHERE lp.lineup_id = $1
       ORDER BY lp.is_starting DESC, lp.position_y ASC NULLS LAST, lp.shirt_number ASC`,
      [await resolveLineupId(match.id), match.id]
    );

    /**
     * Chuẩn hoá vài kiểu dữ liệu mà driver trả về không thống nhất.
     *
     * ⚠️ Khai rõ kiểu trả về (`Record<string, unknown> & {...}`) thay vì để
     * TypeScript tự suy: spread `...r` từ một `Record<string, unknown>` làm
     * mất hết thông tin về các khoá, và dòng `.filter(p => p.is_starting)`
     * bên dưới sẽ báo đỏ "thuộc tính không tồn tại".
     */
    const normalized: Array<Record<string, unknown> & { is_starting: boolean }> = players.map(
      (r) => ({
        ...r,
        is_starting: Boolean(r.is_starting),
        // NUMERIC -> driver có thể trả chuỗi "8.8"
        rating: r.rating === null || r.rating === undefined ? null : Number(r.rating),
        rating_breakdown: parseJsonArray(r.rating_breakdown),
      })
    );

    return {
      match: {
        id: match.id,
        kickoff_at: match.kickoff_at,
        home_name: match.home_name,
        away_name: match.away_name,
        home_code: match.home_code,
        away_code: match.away_code,
        home_score: match.home_score,
        away_score: match.away_score,
        is_home: match.is_home,
      },
      starting: normalized.filter((p) => p.is_starting),
      bench: normalized.filter((p) => !p.is_starting),
    };
  });
}

/**
 * Tìm lineup của một trận; không có thì lùi về đội hình hiện tại.
 *
 * Dữ liệu mẫu chỉ có một lineup chung, nên nhánh dự phòng này luôn được dùng
 * khi chạy với `npm run seed`. Với dữ liệu thật từ nhà cung cấp, mỗi trận sẽ
 * có lineup riêng và nhánh đầu tiên sẽ ăn.
 */
async function resolveLineupId(matchId: number): Promise<number> {
  const own = await queryOne<{ id: number }>(
    'SELECT id FROM lineups WHERE match_id = $1 ORDER BY updated_at DESC LIMIT 1',
    [matchId]
  );
  if (own) return own.id;

  const current = await queryOne<{ id: number }>(
    `SELECT l.id FROM lineups l
     JOIN teams t ON t.id = l.team_id
     WHERE t.fifa_code = 'VIE' AND l.is_current = TRUE
     ORDER BY l.updated_at DESC LIMIT 1`
  );
  if (!current) throw AppError.notFound('Chưa có dữ liệu đội hình');
  return current.id;
}

/** Đọc mảng JSONB an toàn — dữ liệu hỏng thì trả mảng rỗng thay vì ném lỗi */
function parseJsonArray(value: unknown): unknown[] {
  if (Array.isArray(value)) return value;
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
