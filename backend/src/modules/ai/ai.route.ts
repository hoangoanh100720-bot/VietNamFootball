/**
 * MODULES/AI/AI.ROUTE.TS
 *
 * ⚠️ aiLimiter đứng đầu là CÓ CHỦ ĐÍCH: mỗi lần gọi Gemini đều tốn tiền thật.
 * Giới hạn 20 request/giờ/IP là hàng rào bảo vệ hầu bao của bạn.
 */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { aiLimiter } from '@/middlewares/rateLimit.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './ai.controller';
import { matchIdParamSchema } from './ai.validator';

export const aiRouter = Router();

// /status không tốn tiền -> không cần giới hạn
aiRouter.get('/status', asyncHandler(controller.status));

aiRouter.get(
  '/predict/:matchId',
  aiLimiter,
  validate({ params: matchIdParamSchema }),
  asyncHandler(controller.predict)
);
