/**
 * ============================================================================
 * MODULES/MATCHES/MATCHES.VALIDATOR.TS
 * ============================================================================
 *
 * BÀI HỌC: tham số trên URL LUÔN là chuỗi.
 *   /matches/12?page=2  ->  { id: "12" }, { page: "2" }
 *
 * z.coerce.number() tự ép "12" -> 12. Nhờ đó controller nhận được số thật,
 * không phải tự Number() rồi kiểm tra NaN thủ công.
 */

import { z } from 'zod';

/** Kiểm tra :id trên đường dẫn — phải là số nguyên dương */
export const idParamSchema = z.object({
  id: z.coerce
    .number({ invalid_type_error: 'ID phải là số' })
    .int('ID phải là số nguyên')
    .positive('ID phải lớn hơn 0'),
});

/**
 * Phân trang dùng chung.
 * .max(50) rất quan trọng: không chặn thì ai đó gọi ?limit=999999
 * sẽ kéo sập server. Luôn đặt trần cho mọi tham số do client quyết định.
 */
export const paginationSchema = z.object({
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
});

export type PaginationQuery = z.infer<typeof paginationSchema>;
