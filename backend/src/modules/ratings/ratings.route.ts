/**
 * MODULES/RATINGS/RATINGS.ROUTE.TS
 */
import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import { requireAuth, requireAdmin } from '@/middlewares/auth.middleware';
import * as controller from './ratings.controller';

export const ratingsRouter = Router();

/** Đọc điểm — công khai, ai cũng xem được */
ratingsRouter.get('/match/:matchId', asyncHandler(controller.matchRatings));

/**
 * Chấm lại — CHỈ ADMIN.
 *
 * ⚠️ Thứ tự middleware quan trọng: requireAuth phải chạy TRƯỚC requireAdmin,
 * vì requireAdmin cần biết req.user là ai. Đảo ngược là lỗi ngay.
 */
ratingsRouter.post(
  '/match/:matchId/recompute',
  requireAuth,
  requireAdmin,
  asyncHandler(controller.recompute)
);
