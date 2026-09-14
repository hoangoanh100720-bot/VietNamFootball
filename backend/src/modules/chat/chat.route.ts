/**
 * MODULES/CHAT/CHAT.ROUTE.TS
 *
 * ⚠️ MỌI ENDPOINT Ở ĐÂY ĐỀU CẦN ĐĂNG NHẬP (requireAuth).
 *
 * Ba lý do, mỗi lý do đủ để bắt buộc:
 *   1. Mỗi câu hỏi tốn tiền gọi API -> phải biết ai đang tiêu để tính hạn mức
 *   2. Lịch sử hội thoại là dữ liệu cá nhân, phải gắn với một tài khoản
 *   3. Không có tài khoản thì không chặn được kẻ lạm dụng — họ chỉ cần đổi IP
 *
 * Ngoài ra `aiLimiter` chặn thêm theo IP: hai lớp bảo vệ cho hai kiểu lạm dụng
 * khác nhau (một tài khoản hỏi quá nhiều, và một máy tạo hàng loạt tài khoản).
 */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { aiLimiter } from '@/middlewares/rateLimit.middleware';
import { requireAuth } from '@/middlewares/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './chat.controller';
import { chatBodySchema } from './chat.validator';

export const chatRouter = Router();

chatRouter.post(
  '/',
  requireAuth,
  aiLimiter,
  validate({ body: chatBodySchema }),
  asyncHandler(controller.ask)
);

chatRouter.get('/:conversationId', requireAuth, asyncHandler(controller.getConversation));
chatRouter.delete('/:conversationId', requireAuth, asyncHandler(controller.deleteConversation));
