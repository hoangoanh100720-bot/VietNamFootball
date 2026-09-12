/**
 * MODULES/SEARCH/SEARCH.VALIDATOR.TS
 *
 * Kiểm tra tham số của API tìm kiếm.
 *
 * ⚠️ VÌ SAO GIỚI HẠN ĐỘ DÀI CÂU HỎI Ở 500 KÝ TỰ?
 * Mỗi lần tìm kiếm đều gọi API nhúng vector — tức là tốn quota. Không chặn
 * độ dài thì một script nghịch ngợm có thể gửi câu hỏi 1MB và đốt sạch quota
 * của bạn trong vài giây. Giới hạn đầu vào là lớp bảo vệ hầu bao, không phải
 * sự cầu kỳ thừa thãi.
 */
import { z } from 'zod';

export const searchQuerySchema = z.object({
  /** Câu hỏi / từ khoá cần tìm */
  q: z
    .string()
    .trim()
    .min(2, 'Từ khoá phải có ít nhất 2 ký tự')
    .max(500, 'Câu hỏi quá dài, tối đa 500 ký tự'),

  /** Số kết quả trả về */
  limit: z.coerce.number().int().positive().max(30).default(8),

  /**
   * Lọc theo nguồn tài liệu. Danh sách này khớp với ràng buộc CHECK của cột
   * kb_documents.source (xem migration 006) — khai báo ở cả hai nơi để lỗi
   * bị chặn ngay tại tầng API, thay vì để database ném lỗi 500 khó hiểu.
   */
  source: z
    .enum(['history', 'achievement', 'player_bio', 'coach_bio', 'faq', 'rules', 'crawl', 'ocr', 'news'])
    .optional(),

  /** Bật để xem điểm vector và điểm từ khoá riêng rẽ — rất hữu ích khi tinh chỉnh */
  debug: z
    .enum(['true', 'false'])
    .transform((v) => v === 'true')
    .optional()
    .default('false'),
});

export type SearchQuery = z.infer<typeof searchQuerySchema>;
