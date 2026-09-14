/**
 * MODULES/STATS/STATS.VALIDATOR.TS
 *
 * Kiểm tra tham số của API Thống kê.
 *
 * 🔐 `metric` và `period` dùng z.enum — đây là lớp chặn ĐẦU TIÊN để chuỗi tuỳ ý
 * không bao giờ lọt tới câu SQL (xem bảng METRIC_SQL ở stats.service.ts, lớp
 * chặn thứ hai).
 */
import { z } from 'zod';

export const statsMatchesQuerySchema = z.object({
  /** Trần 30: một lần cuộn đủ lấp màn hình vài lần, không kéo cả bảng về */
  limit: z.coerce.number().int().positive().max(30).default(10),
  /** Chuỗi mờ lấy từ meta.nextCursor của lần gọi trước. Bỏ trống = trang đầu */
  cursor: z.string().max(200).optional(),
});

export const leaderboardQuerySchema = z.object({
  period: z.enum(['week', 'month', 'year', 'competition', 'squad']).default('year'),
  /**
   * Khoá kỳ: '2026', '2026-09', 'season:12', 'squad:7'.
   *
   * Regex chỉ cho chữ, số, dấu gạch và dấu hai chấm — đủ cho mọi khoá hợp lệ,
   * đồng thời chặn luôn dấu nháy, khoảng trắng, dấu chấm phẩy.
   * Bỏ trống = backend tự chọn kỳ mới nhất có dữ liệu.
   */
  key: z.string().regex(/^[A-Za-z0-9:-]{1,30}$/, 'Khoá kỳ không hợp lệ').optional(),
  metric: z.enum(['avg_rating', 'goals', 'assists', 'motm', 'cards']).default('avg_rating'),
  limit: z.coerce.number().int().positive().max(50).default(20),
});

export type StatsMatchesQuery = z.infer<typeof statsMatchesQuerySchema>;
export type LeaderboardQuery = z.infer<typeof leaderboardQuerySchema>;
