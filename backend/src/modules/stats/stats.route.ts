/**
 * MODULES/STATS/STATS.ROUTE.TS
 *
 * Mọi endpoint đều CÔNG KHAI và chỉ đọc database (không gọi AI) -> dùng hạn
 * mức chung, không cần aiLimiter hay requireAuth.
 */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './stats.controller';
import { leaderboardQuerySchema, statsMatchesQuerySchema } from './stats.validator';

export const statsRouter = Router();

statsRouter.get('/overview', asyncHandler(controller.overview));

statsRouter.get(
  '/matches',
  validate({ query: statsMatchesQuerySchema }),
  asyncHandler(controller.matches)
);

statsRouter.get(
  '/players/leaderboard',
  validate({ query: leaderboardQuerySchema }),
  asyncHandler(controller.leaderboard)
);
