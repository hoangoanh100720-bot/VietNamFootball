/**
 * MODULES/SEARCH/SEARCH.ROUTE.TS
 *
 * ⚠️ VÌ SAO /search DÙNG aiLimiter CHỨ KHÔNG PHẢI generalLimiter?
 * Vì mỗi lần tìm kiếm đều gọi API nhúng vector của Gemini — tức là TỐN QUOTA
 * y hệt một lượt chat. Để nó dùng hạn mức chung (rộng rãi) thì một người có
 * thể vô tình đốt sạch quota của cả hệ thống.
 *
 * /search/stats thì ngược lại: chỉ đếm số dòng trong database, không gọi AI,
 * nên không cần giới hạn ngặt.
 */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { aiLimiter } from '@/middlewares/rateLimit.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './search.controller';
import { searchQuerySchema } from './search.validator';

export const searchRouter = Router();

searchRouter.get('/stats', asyncHandler(controller.stats));

searchRouter.get(
  '/',
  aiLimiter,
  validate({ query: searchQuerySchema }),
  asyncHandler(controller.search)
);
