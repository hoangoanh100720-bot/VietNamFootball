/**
 * ============================================================================
 * MODULES/RANKING/RANKING.SERVICE.TS — BẢNG XẾP HẠNG FIFA
 * ============================================================================
 *
 * Bảng fifa_rankings lưu NHIỀU ĐỢT công bố (mỗi đợt một snapshot_date).
 * Ta luôn muốn đợt MỚI NHẤT -> phải tìm ngày lớn nhất trước rồi mới lọc.
 *
 * Kỹ thuật dùng ở đây gọi là SUBQUERY (truy vấn con):
 *   WHERE snapshot_date = (SELECT MAX(snapshot_date) FROM fifa_rankings)
 * Postgres chạy câu trong ngoặc trước, lấy ra một giá trị, rồi mới lọc.
 */

import { query } from '@/config/database';
import { cached } from '@/utils/cache';
import { env } from '@/config/env';
import type { FifaRanking } from '@/types';

/** BXH đợt mới nhất, kèm tên và logo đội */
export async function getLatestRanking(limit = 50) {
  return cached(`ranking:fifa:${limit}`, env.CACHE_TTL_STATIC, async () => {
    const { rows } = await query<FifaRanking>(
      `SELECT r.id, r.team_id, r.rank, r.points, r.previous_rank,
              r.confederation, r.snapshot_date,
              t.name AS team_name, t.logo_url AS team_logo, t.fifa_code
       FROM fifa_rankings r
       JOIN teams t ON t.id = r.team_id
       WHERE r.snapshot_date = (SELECT MAX(snapshot_date) FROM fifa_rankings)
       ORDER BY r.rank ASC
       LIMIT $1`,
      [limit]
    );

    return rows.map((r) => ({
      ...r,
      points: Number(r.points),
      // Tính sẵn mức thay đổi để app chỉ việc hiển thị mũi tên lên/xuống.
      // previous_rank 113 -> rank 109 nghĩa là TĂNG 4 bậc (số nhỏ hơn = tốt hơn)
      change: r.previous_rank !== null ? r.previous_rank - r.rank : 0,
    }));
  });
}

/** Thứ hạng riêng của Việt Nam — dùng cho thẻ nổi bật ở Tab 4 */
export async function getVietnamRanking() {
  const all = await getLatestRanking(250);
  return all.find((r) => r.fifa_code === 'VIE') ?? null;
}
