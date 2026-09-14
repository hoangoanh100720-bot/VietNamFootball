/**
 * MODULES/CHAT/CHAT.CONTROLLER.TS — API TRỢ LÝ AI
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { AppError } from '@/utils/AppError';
import * as service from '@/services/chat/chat.service';
import type { ChatBody } from './chat.validator';

/**
 * 🔐 LẤY ID NGƯỜI DÙNG TỪ TOKEN — KHÔNG BAO GIỜ LẤY TỪ BODY.
 *
 * Đây là quy tắc bảo mật quan trọng nhất của cả module chat (đặc tả mục 10.6).
 *
 * Nếu nhận `userId` từ body, bất kỳ ai cũng gửi được `{ userId: 999 }` để đọc
 * hội thoại của người khác và tiêu quota của họ. `req.user` do middleware
 * requireAuth gắn vào sau khi đã xác minh chữ ký JWT — không giả mạo được.
 */
function getUserId(req: Request): number {
  const user = req.user;
  if (!user) throw AppError.unauthorized('Cần đăng nhập để dùng trợ lý AI');

  /**
   * ⚠️ TRƯỜNG LÀ `sub`, KHÔNG PHẢI `id`.
   *
   * 🐛 LỖI ĐÃ GẶP THẬT: bản đầu viết `user.id` và database từ chối với thông
   * báo `null value in column "user_id" violates not-null constraint` —
   * một thông điệp chẳng nói gì về nguyên nhân thật.
   *
   * Lý do: JwtPayload theo chuẩn RFC 7519 dùng tên `sub` (subject) cho định
   * danh chủ thể, không dùng `id`. TypeScript không bắt được vì bản đầu ép
   * kiểu bằng `as Request & { user?: { id: number } }` — tự khai một hình
   * dạng không có thật.
   *
   * 👉 Bài học: ép kiểu bằng `as` là TỰ HỨA với TypeScript rằng bạn biết rõ
   *    hình dạng dữ liệu. Hứa sai thì trình biên dịch im lặng, và lỗi chỉ lộ
   *    ra lúc chạy. Ở đây bỏ hẳn `as` để dùng đúng kiểu `req.user` mà
   *    middleware đã khai.
   */
  return user.sub;
}

/**
 * POST /api/v1/chat
 * Body: { message, conversationId? }
 *
 * Gửi một câu hỏi cho trợ lý và nhận câu trả lời.
 */
export async function ask(req: Request, res: Response) {
  const { message, conversationId } = req.body as ChatBody;

  const result = await service.chat({
    userId: getUserId(req),
    message,
    conversationId,
  });

  return sendSuccess(res, result);
}

/** GET /api/v1/chat/:conversationId — đọc lại một cuộc hội thoại */
export async function getConversation(req: Request, res: Response) {
  const id = String(req.params.conversationId ?? '');
  return sendSuccess(res, await service.getConversation(getUserId(req), id));
}

/**
 * DELETE /api/v1/chat/:conversationId
 *
 * Người dùng có quyền xoá lịch sử chat của mình (đặc tả mục 10.6 — quyền
 * riêng tư). Tin nhắn tự xoá theo nhờ ON DELETE CASCADE.
 */
export async function deleteConversation(req: Request, res: Response) {
  const id = String(req.params.conversationId ?? '');
  await service.deleteConversation(getUserId(req), id);
  return sendSuccess(res, { deleted: true });
}
