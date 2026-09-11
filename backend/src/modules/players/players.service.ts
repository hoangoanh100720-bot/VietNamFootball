/**
 * ============================================================================
 * MODULES/PLAYERS/PLAYERS.SERVICE.TS — CẦU THỦ & HUẤN LUYỆN VIÊN
 * ============================================================================
 *
 * BÀI HỌC: XÂY CÂU SQL ĐỘNG MỘT CÁCH AN TOÀN
 *
 * Danh sách cầu thủ có 2 bộ lọc tuỳ chọn: theo vị trí và theo từ khoá.
 * Người dùng có thể dùng cả hai, một, hoặc không dùng cái nào.
 *
 * CÁCH SAI (mở toang cửa cho SQL Injection):
 *   let sql = 'SELECT * FROM players WHERE 1=1';
 *   if (search) sql += " AND full_name LIKE '%" + search + "%'";  // ❌ NGUY HIỂM
 *
 * CÁCH ĐÚNG: ghép ĐIỀU KIỆN vào chuỗi SQL, nhưng GIÁ TRỊ luôn đi qua mảng params
 * với số thứ tự $1, $2 tăng dần. Chuỗi SQL do ta kiểm soát 100%, dữ liệu
 * người dùng không bao giờ chạm vào nó.
 */

import { query } from '@/config/database';
import { cached } from '@/utils/cache';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import type { Coach, Player, PlayerPosition } from '@/types';

export interface ListPlayersOptions {
  position?: PlayerPosition;
  search?: string;
  page: number;
  limit: number;
}

/** DANH SÁCH CẦU THỦ (lọc + tìm kiếm + phân trang) */
export async function listPlayers(options: ListPlayersOptions) {
  const { position, search, page, limit } = options;

  // conditions: các mảnh WHERE. params: giá trị tương ứng.
  const conditions: string[] = ["t.fifa_code = 'VIE'", 'p.is_active = TRUE'];
  const params: unknown[] = [];

  if (position) {
    params.push(position);
    conditions.push(`p.position = $${params.length}`); // $1
  }

  if (search) {
    params.push(`%${search}%`);
    // ILIKE = LIKE nhưng KHÔNG phân biệt hoa/thường (chỉ Postgres mới có).
    // Tìm cả trong tên đầy đủ, tên gọi tắt và tên CLB.
    conditions.push(
      `(p.full_name ILIKE $${params.length}
        OR p.short_name ILIKE $${params.length}
        OR p.current_club ILIKE $${params.length})`
    );
  }

  const where = 'WHERE ' + conditions.join(' AND ');

  // Hai tham số cuối luôn là LIMIT và OFFSET
  params.push(limit, (page - 1) * limit);

  const { rows } = await query<Player>(
    `SELECT p.*
     FROM players p
     JOIN teams t ON t.id = p.team_id
     ${where}
     ORDER BY
       -- Sắp theo tuyến: thủ môn -> hậu vệ -> tiền vệ -> tiền đạo
       CASE p.position
         WHEN 'GK' THEN 1 WHEN 'DF' THEN 2 WHEN 'MF' THEN 3 ELSE 4
       END,
       p.shirt_number ASC NULLS LAST
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  );

  // Đếm tổng: dùng lại đúng điều kiện WHERE nhưng BỎ 2 tham số cuối
  const { rows: countRows } = await query<{ count: string }>(
    `SELECT COUNT(*) AS count
     FROM players p JOIN teams t ON t.id = p.team_id
     ${where}`,
    params.slice(0, -2)
  );

  return {
    items: rows.map(normalizePlayer),
    total: Number(countRows[0]?.count ?? 0),
  };
}

/**
 * BIGINT của Postgres về JS là chuỗi -> đổi sang số để app khỏi phải xử lý.
 * Đồng thời tính sẵn tuổi, tránh việc mỗi màn hình lại tự tính một kiểu.
 */
function normalizePlayer(p: Player) {
  return {
    ...p,
    market_value_eur: Number(p.market_value_eur),
    age: p.birth_date ? calculateAge(p.birth_date) : null,
  };
}

/** Tính tuổi chính xác (có xét đã qua sinh nhật năm nay hay chưa) */
function calculateAge(birthDate: string | Date): number {
  const birth = new Date(birthDate);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();

  const monthDiff = now.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birth.getDate())) {
    age--; // chưa tới sinh nhật năm nay
  }
  return age;
}

/** CHI TIẾT MỘT CẦU THỦ */
export async function getPlayerById(id: number) {
  const { rows } = await query<Player>('SELECT * FROM players WHERE id = $1', [id]);
  const player = rows[0];
  if (!player) throw AppError.notFound('Không tìm thấy cầu thủ này');
  return normalizePlayer(player);
}

/** LỊCH SỬ THI ĐẤU CLB */
export async function getPlayerClubs(playerId: number) {
  const { rows } = await query(
    `SELECT id, club_name, club_logo, from_date, to_date, apps, goals, is_loan
     FROM player_clubs
     WHERE player_id = $1
     -- NULLS FIRST: CLB hiện tại (to_date = NULL) hiện lên đầu
     ORDER BY to_date DESC NULLS FIRST, from_date DESC`,
    [playerId]
  );
  return rows;
}

/** THÔNG TIN HUẤN LUYỆN VIÊN TRƯỞNG */
export async function getCurrentCoach() {
  return cached('coach:current', env.CACHE_TTL_STATIC, async () => {
    const { rows } = await query<Coach>(
      `SELECT c.*
       FROM coaches c
       JOIN teams t ON t.id = c.team_id
       WHERE t.fifa_code = 'VIE' AND c.is_current = TRUE
       LIMIT 1`
    );

    const coach = rows[0];
    if (!coach) throw AppError.notFound('Chưa có dữ liệu HLV. Hãy chạy: npm run seed');

    // Tính thêm vài thông tin hữu ích để app không phải tính lại
    const tenureDays = coach.start_date
      ? Math.floor((Date.now() - new Date(coach.start_date).getTime()) / 86_400_000)
      : null;

    return {
      ...coach,
      age: coach.birth_date ? calculateAge(coach.birth_date) : null,
      tenure_days: tenureDays,
      tenure_text: tenureDays !== null ? formatTenure(tenureDays) : null,
    };
  });
}

/** 780 ngày -> "2 năm 2 tháng" */
function formatTenure(days: number): string {
  const years = Math.floor(days / 365);
  const months = Math.floor((days % 365) / 30);

  if (years > 0 && months > 0) return `${years} năm ${months} tháng`;
  if (years > 0) return `${years} năm`;
  if (months > 0) return `${months} tháng`;
  return `${days} ngày`;
}
