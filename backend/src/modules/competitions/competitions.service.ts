/**
 * ============================================================================
 * MODULES/COMPETITIONS/COMPETITIONS.SERVICE.TS — GIẢI ĐẤU & BXH BẢNG ĐẤU
 * ============================================================================
 *
 * ARCHITECTURE.md mục 5.8. Trả lời câu hỏi người hâm mộ hay hỏi nhất khi đang
 * có giải: "Việt Nam đứng thứ mấy bảng? Có đi tiếp không?"
 *
 *   ┌───────────────────────────────────┐
 *   │ Vòng loại Asian Cup 2027 · Bảng F │
 *   │ #  Đội          Tr  T-H-B  HS  Đ  │
 *   │ 1  Việt Nam      3  3-0-0 +10  9  │ ◄ is_vietnam = true
 *   │ ── 1 đội đầu đi tiếp ──           │ ◄ advance_count
 *   │ 2  Malaysia      3  2-0-1  +2  6  │
 *   └───────────────────────────────────┘
 *
 * ----------------------------------------------------------------------------
 * 🗄️ QUAN HỆ BẢNG:  competitions 1─n seasons 1─n competition_standings
 *
 * "ASEAN Cup" là một GIẢI (competition); "ASEAN Cup 2024" là một MÙA (season).
 * BXH luôn gắn với MÙA — bảng đấu năm 2024 và năm 2026 là hai bảng khác nhau.
 * ============================================================================
 */

import { query, queryOne } from '@/config/database';
import { cached } from '@/utils/cache';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import { getVietnamTeamId } from '@/modules/matches/matches.service';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

export interface StandingRow {
  position: number;
  team_id: number;
  team_name: string;
  fifa_code: string | null;
  logo_url: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  /** Hiệu số — tính sẵn ở server để app không phải tự trừ */
  goal_diff: number;
  points: number;
  is_vietnam: boolean;
}

export interface StandingGroup {
  /** 'Bảng F'. Giải không có vòng bảng thì là chuỗi rỗng */
  group_name: string;
  /** Số đội đầu bảng được đi tiếp — app vẽ vạch ngăn sau dòng này */
  advance_count: number;
  rows: StandingRow[];
}

// ---------------------------------------------------------------------------
// LUẬT ĐI TIẾP
// ---------------------------------------------------------------------------

/**
 * Số đội đi tiếp mỗi bảng, theo mã giải.
 *
 * ⚠️ Vì sao KHÔNG lưu trong database?
 * Vì bảng `competitions` chưa có cột này (migration 003), và luật đi tiếp
 * của các giải Việt Nam hay dự rất ít đổi. Một bảng tra ở đây là đủ. Khi có
 * giải mới với luật khác, thêm một dòng — hoặc lúc đó mới thêm cột vào DB.
 *
 * ⚠️ Luật thật đôi khi phức tạp hơn một con số (vd vòng loại Asian Cup: đội
 * nhất bảng + một số đội nhì có thành tích tốt nhất). App chỉ vẽ vạch cho
 * suất CHẮC CHẮN, và ghi rõ luật bằng chữ ở `advance_note` — không để người
 * dùng hiểu nhầm rằng đứng thứ 2 là chắc chắn bị loại.
 */
const ADVANCE_RULES: Record<string, { count: number; note: string }> = {
  'asian-cup-q': { count: 1, note: 'Đội nhất bảng giành vé; một số đội nhì có thành tích tốt nhất cũng đi tiếp' },
  'asean-cup': { count: 2, note: '2 đội đầu mỗi bảng vào bán kết' },
};
const DEFAULT_ADVANCE = { count: 2, note: '2 đội đầu bảng đi tiếp' };

// ---------------------------------------------------------------------------
// HÀM THUẦN
// ---------------------------------------------------------------------------

/**
 * Câu tóm tắt cho Senior mode và cho trợ lý AI đọc to.
 *
 * Đặc tả 5.8: "Thay bảng bằng một câu: Việt Nam đang đứng thứ 2 bảng B với
 * 6 điểm". Người lớn tuổi đọc một câu nhanh hơn đọc một bảng 8 cột nhiều.
 *
 * "bảng F" viết thường chữ "bảng" vì nó nằm giữa câu; tên bảng giữ nguyên.
 */
export function describeVietnamPosition(groupName: string, row: StandingRow | undefined): string | null {
  if (!row) return null;
  const where = groupName ? ` ${groupName.replace(/^Bảng/, 'bảng')}` : '';
  return `Việt Nam đang đứng thứ ${row.position}${where} với ${row.points} điểm sau ${row.played} trận.`;
}

// ---------------------------------------------------------------------------
// TRUY VẤN
// ---------------------------------------------------------------------------

/**
 * Danh sách giải + mùa giải — cho ô chọn "[Giải ▾]".
 *
 * Mỗi mùa kèm cờ `has_standings`: chỉ những mùa CÓ BXH mới đáng hiện trong ô
 * chọn của màn BXH (giao hữu không có bảng đấu).
 */
export async function listCompetitions() {
  return cached('competitions:list', env.CACHE_TTL_STATIC, async () => {
    const { rows } = await query<{
      season_id: number;
      season_name: string;
      is_current: boolean;
      start_date: string | null;
      end_date: string | null;
      competition_id: number;
      code: string;
      name: string;
      type: string;
      confederation: string | null;
      has_standings: boolean;
    }>(
      `SELECT s.id AS season_id, s.name AS season_name, s.is_current, s.start_date, s.end_date,
              c.id AS competition_id, c.code, c.name, c.type, c.confederation,
              EXISTS (SELECT 1 FROM competition_standings cs WHERE cs.season_id = s.id) AS has_standings
       FROM seasons s
       JOIN competitions c ON c.id = s.competition_id
       ORDER BY s.is_current DESC, s.start_date DESC NULLS LAST`
    );
    return rows;
  });
}

/**
 * BXH của một mùa giải, chia theo bảng.
 *
 * @param seasonId Bỏ trống -> tự chọn mùa ĐANG DIỄN RA mà Việt Nam có tên
 *                 trong BXH. Đây là trường hợp của 95% lượt mở màn hình.
 */
export async function getStandings(seasonId?: number) {
  const vieId = await getVietnamTeamId();

  const season = await queryOne<{ id: number; name: string; competition_name: string; code: string }>(
    seasonId
      ? `SELECT s.id, s.name, c.name AS competition_name, c.code
         FROM seasons s JOIN competitions c ON c.id = s.competition_id
         WHERE s.id = $1`
      : /**
         * Ưu tiên: mùa đang diễn ra (is_current) có Việt Nam -> mùa gần nhất
         * có Việt Nam. `$1` dùng trong EXISTS để bảo đảm không bao giờ tự chọn
         * một giải mà Việt Nam không tham dự.
         */
        `SELECT s.id, s.name, c.name AS competition_name, c.code
         FROM seasons s JOIN competitions c ON c.id = s.competition_id
         WHERE EXISTS (SELECT 1 FROM competition_standings cs
                       WHERE cs.season_id = s.id AND cs.team_id = $1)
         ORDER BY s.is_current DESC, s.start_date DESC NULLS LAST
         LIMIT 1`,
    [seasonId ?? vieId]
  );

  if (!season) {
    if (seasonId) throw AppError.notFound('Không tìm thấy mùa giải.');
    // Không có giải nào đang có bảng đấu — trạng thái BÌNH THƯỜNG giữa các
    // giải, không phải lỗi. App hiện "Hiện chưa có giải đấu vòng bảng nào".
    return { season: null, groups: [], vietnam_summary: null };
  }

  return cached(`competitions:standings:${season.id}`, env.CACHE_TTL_LIVE * 4, async () => {
    const { rows } = await query<Omit<StandingRow, 'goal_diff' | 'is_vietnam'> & { group_name: string }>(
      `SELECT cs.group_name, cs.position, cs.team_id, t.name AS team_name, t.fifa_code, t.logo_url,
              cs.played, cs.won, cs.drawn, cs.lost, cs.goals_for, cs.goals_against, cs.points
       FROM competition_standings cs
       JOIN teams t ON t.id = cs.team_id
       WHERE cs.season_id = $1
       ORDER BY cs.group_name, cs.position`,
      [season.id]
    );

    const rule = ADVANCE_RULES[season.code] ?? DEFAULT_ADVANCE;

    // Gom dòng theo bảng. Dùng Map để GIỮ THỨ TỰ bảng như SQL đã sắp (A, B, C…)
    const byGroup = new Map<string, StandingRow[]>();
    for (const r of rows) {
      const { group_name, ...rest } = r;
      const list = byGroup.get(group_name) ?? [];
      list.push({
        ...rest,
        goal_diff: rest.goals_for - rest.goals_against,
        is_vietnam: rest.team_id === vieId,
      });
      byGroup.set(group_name, list);
    }

    const groups: StandingGroup[] = [...byGroup.entries()].map(([group_name, list]) => ({
      group_name,
      advance_count: rule.count,
      rows: list,
    }));

    const vietnamGroup = groups.find((g) => g.rows.some((r) => r.is_vietnam));

    return {
      season: {
        id: season.id,
        name: season.name,
        competition_name: season.competition_name,
        advance_note: rule.note,
      },
      groups,
      vietnam_summary: vietnamGroup
        ? describeVietnamPosition(vietnamGroup.group_name, vietnamGroup.rows.find((r) => r.is_vietnam))
        : null,
    };
  });
}
