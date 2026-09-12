/**
 * MODULES/TEAM/TEAM.VALIDATOR.TS
 *
 * Kiểm tra tham số của API hồ sơ đội tuyển.
 */
import { z } from 'zod';

export const achievementsQuerySchema = z.object({
  /**
   * Chỉ lấy thành tích nổi bật (dùng cho "Tủ danh hiệu").
   *
   * ⚠️ Mọi tham số trên URL đều là CHUỖI, kể cả khi người dùng gõ ?highlight=true.
   * Nên phải khai z.enum(['true','false']) rồi .transform() sang boolean —
   * viết thẳng z.boolean() sẽ luôn báo lỗi vì nó nhận được chuỗi "true".
   */
  highlight: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default('false'),

  /**
   * Trần 200: đội tuyển quốc gia lâu đời nhất cũng chưa tới 200 danh hiệu.
   * Đặt trần để một request ?limit=999999 không kéo cả bảng lên RAM.
   */
  limit: z.coerce.number().int().positive().max(200).default(50),
});

export type AchievementsQuery = z.infer<typeof achievementsQuerySchema>;
