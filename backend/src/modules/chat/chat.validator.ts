/**
 * MODULES/CHAT/CHAT.VALIDATOR.TS
 *
 * Kiểm tra đầu vào của trợ lý AI.
 *
 * ⚠️ Lớp kiểm tra này QUAN TRỌNG HƠN bình thường, vì mỗi request đều tốn tiền
 * gọi API. Dữ liệu rác lọt qua đây là tiền thật bị đốt.
 */
import { z } from 'zod';

export const chatBodySchema = z.object({
  /**
   * Câu hỏi của người dùng.
   *
   * Trần 1000 ký tự: đủ cho mọi câu hỏi hợp lý về bóng đá, nhưng chặn được
   * script gửi câu hỏi 1MB để đốt quota. Đây là lớp chặn ĐẦU TIÊN — service
   * còn kiểm tra lại lần nữa (phòng thủ nhiều tầng).
   */
  message: z
    .string()
    .trim()
    .min(2, 'Câu hỏi quá ngắn')
    .max(1000, 'Câu hỏi quá dài, tối đa 1000 ký tự'),

  /**
   * Id cuộc hội thoại đang tiếp tục. Bỏ trống = bắt đầu cuộc mới.
   *
   * 🔐 Kiểu UUID được kiểm tra ở đây, nhưng QUYỀN SỞ HỮU thì kiểm ở service
   * (`WHERE id = $1 AND user_id = $2`). Hai việc khác nhau: đúng định dạng
   * không có nghĩa là được phép truy cập.
   */
  conversationId: z.string().uuid('conversationId không hợp lệ').optional(),
});

export type ChatBody = z.infer<typeof chatBodySchema>;
