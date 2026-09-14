/**
 * ============================================================================
 * MODULES/SQUADS/SQUADS.SERVICE.TS — DANH SÁCH TRIỆU TẬP
 * ============================================================================
 *
 * ARCHITECTURE.md mục 5.8 — phân đoạn "Triệu tập" ở Tab Đội hình.
 *
 * ⚠️ ĐỪNG NHẦM VỚI MODULE `squad` (số ít) ĐÃ CÓ:
 *
 *   modules/squad/   -> ĐỘI HÌNH RA SÂN: 11 người đá chính + dự bị của MỘT TRẬN,
 *                       vẽ lên sơ đồ sân. Đổi theo từng trận.
 *   modules/squads/  -> DANH SÁCH TRIỆU TẬP: 23–30 cầu thủ HLV gọi lên cho MỘT
 *                       ĐỢT TẬP TRUNG (thường đá 2 trận). Đổi theo từng đợt.
 *
 * Một cầu thủ có thể được triệu tập nhưng không ra sân phút nào — hai khái
 * niệm khác nhau, hai bảng khác nhau (`lineups` vs `squads`).
 *
 * ----------------------------------------------------------------------------
 *   ┌───────────────────────────────────┐
 *   │ Đợt tập trung tháng 10/2026       │
 *   │ Công bố 01/10 · 28 cầu thủ        │
 *   │ THỦ MÔN (3)                       │
 *   │  Cầu thủ B · CLB Y   [Mới]    ›   │ ◄ is_new
 *   │ Bổ sung: Cầu thủ C                │ ◄ status = 'added'
 *   │ Rút lui: Cầu thủ D (chấn thương)  │ ◄ status = 'withdrawn'
 *   └───────────────────────────────────┘
 * ============================================================================
 */

import { query, queryOne } from '@/config/database';
import { cached } from '@/utils/cache';
import { env } from '@/config/env';
import { getVietnamTeamId } from '@/modules/matches/matches.service';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

export type MemberStatus = 'called' | 'added' | 'withdrawn';

export interface SquadMember {
  player_id: number;
  full_name: string;
  short_name: string | null;
  position: 'GK' | 'DF' | 'MF' | 'FW';
  shirt_number: number | null;
  current_club: string | null;
  photo_url: string | null;
  status: MemberStatus;
  note: string | null;
  /** Lần đầu được gọi lên đội tuyển — app gắn nhãn "Mới" */
  is_new: boolean;
}

export interface SquadSummary {
  id: number;
  title: string;
  gather_from: string | null;
  gather_to: string | null;
  announced_at: string;
  /** Số cầu thủ ĐANG ở đội (không tính người đã rút lui) */
  player_count: number;
}

// ---------------------------------------------------------------------------
// ĐIỀU KIỆN "ĐÃ CÔNG BỐ"
// ---------------------------------------------------------------------------

/**
 * 🔐 CHỈ HIỆN ĐỢT ĐÃ CÔNG BỐ — `announced_at` phải có VÀ đã tới giờ.
 *
 * Admin thường nhập danh sách TRƯỚC giờ HLV họp báo (để app bắn thông báo
 * đúng lúc công bố). Nếu chỉ kiểm `announced_at IS NOT NULL`, danh sách sẽ lộ
 * ra app trước cả buổi họp báo — một sự cố truyền thông thật sự với liên đoàn.
 *
 * Điều kiện này đặt ở MỘT chỗ và mọi truy vấn đều dùng lại, để không bao giờ
 * có một đường nào đó quên kiểm tra.
 */
const ANNOUNCED = `s.announced_at IS NOT NULL AND s.announced_at <= NOW()`;

// ---------------------------------------------------------------------------
// TRUY VẤN
// ---------------------------------------------------------------------------

/**
 * Chi tiết một đợt triệu tập, chia theo vị trí.
 *
 * ⭐ NHÃN "MỚI" ĐƯỢC TÍNH NHƯ THẾ NÀO?
 *
 *   is_new = cầu thủ KHÔNG có mặt trong BẤT KỲ đợt đã công bố nào TRƯỚC đợt này
 *            (bỏ qua các lần anh ấy từng rút lui — bị gọi rồi rút thì vẫn
 *            tính là đã từng được gọi)
 *
 * Kèm điều kiện "phải CÓ ít nhất một đợt trước đó". Thiếu điều kiện này thì
 * ĐỢT ĐẦU TIÊN trong database sẽ gắn "Mới" cho cả 28 người — không sai về
 * logic, nhưng vô nghĩa và trông như lỗi. Dữ liệu lịch sử có điểm bắt đầu,
 * còn đội tuyển thì không.
 */
async function loadSquad(squad: SquadSummary) {
  const { rows } = await query<SquadMember>(
    `SELECT p.id AS player_id, p.full_name, p.short_name, p.position, p.shirt_number,
            p.current_club, p.photo_url, sm.status, sm.note,
            (
              EXISTS (SELECT 1 FROM squads prev
                      WHERE prev.team_id = s.team_id
                        AND prev.announced_at < s.announced_at
                        AND prev.announced_at IS NOT NULL)
              AND NOT EXISTS (SELECT 1 FROM squad_members pm
                              JOIN squads prev ON prev.id = pm.squad_id
                              WHERE pm.player_id = sm.player_id
                                AND prev.team_id = s.team_id
                                AND prev.announced_at < s.announced_at)
            ) AS is_new
     FROM squad_members sm
     JOIN squads s  ON s.id = sm.squad_id
     JOIN players p ON p.id = sm.player_id
     WHERE sm.squad_id = $1
     ORDER BY p.shirt_number NULLS LAST, p.full_name`,
    [squad.id]
  );

  const active = rows.filter((m) => m.status !== 'withdrawn');

  /**
   * Chia nhóm theo vị trí. Người RÚT LUI không nằm trong nhóm vị trí nào —
   * họ có mục riêng ở cuối. Để họ lẫn trong "Hậu vệ (9)" thì con số 9 sai,
   * và người đọc lướt nhanh sẽ tưởng cầu thủ đó vẫn ở đội.
   */
  const groups = (['GK', 'DF', 'MF', 'FW'] as const).map((pos) => ({
    position: pos,
    members: active.filter((m) => m.position === pos),
  }));

  return {
    squad: { ...squad, player_count: active.length },
    groups,
    added: active.filter((m) => m.status === 'added'),
    withdrawn: rows.filter((m) => m.status === 'withdrawn'),
    new_count: active.filter((m) => m.is_new).length,
  };
}

const SUMMARY_SELECT = `
  SELECT s.id, s.title, s.gather_from, s.gather_to, s.announced_at,
         (SELECT COUNT(*) FROM squad_members sm
          WHERE sm.squad_id = s.id AND sm.status <> 'withdrawn')::int AS player_count
  FROM squads s
`;

/** GET /squads/current — đợt công bố gần nhất */
export async function getCurrentSquad() {
  return cached('squads:current', env.CACHE_TTL_LIVE * 4, async () => {
    const vieId = await getVietnamTeamId();
    const squad = await queryOne<SquadSummary>(
      `${SUMMARY_SELECT}
       WHERE s.team_id = $1 AND ${ANNOUNCED}
       ORDER BY s.announced_at DESC LIMIT 1`,
      [vieId]
    );
    return squad ? loadSquad(squad) : null;
  });
}

/** GET /squads/:id — xem lại một đợt cũ */
export async function getSquadById(id: number) {
  const squad = await queryOne<SquadSummary>(
    `${SUMMARY_SELECT} WHERE s.id = $1 AND ${ANNOUNCED}`,
    [id]
  );
  // Đợt chưa công bố trả về null y như đợt không tồn tại — KHÔNG để lộ rằng
  // "có một đợt id 7 nhưng chưa công bố" (đó cũng là rò rỉ thông tin).
  return squad ? loadSquad(squad) : null;
}

/** GET /squads — lịch sử các đợt, mới nhất trước */
export async function listSquads(limit: number) {
  const vieId = await getVietnamTeamId();
  const { rows } = await query<SquadSummary>(
    `${SUMMARY_SELECT}
     WHERE s.team_id = $1 AND ${ANNOUNCED}
     ORDER BY s.announced_at DESC
     LIMIT $2`,
    [vieId, limit]
  );
  return rows;
}

