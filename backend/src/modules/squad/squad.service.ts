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

import { query } from '@/config/database';
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
