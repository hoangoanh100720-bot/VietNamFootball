/**
 * MODULES/TEAM/TEAM.ROUTE.TS
 *
 * Hai endpoint này chỉ đọc database, KHÔNG gọi AI -> không cần aiLimiter.
 * Chúng dùng hạn mức chung (generalLimiter gắn ở app.ts).
 */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './team.controller';
import { achievementsQuerySchema } from './team.validator';

export const teamRouter = Router();

/**
 * ⚠️ THỨ TỰ ĐĂNG KÝ ROUTE CÓ QUAN TRỌNG KHÔNG?
 * Ở đây thì không, vì '/overview' và '/achievements' là hai đường dẫn TĨNH,
 * không chồng lấn nhau. Thứ tự chỉ quan trọng khi có route động kiểu '/:id' —
 * lúc đó '/:id' phải đặt SAU mọi route tĩnh, nếu không nó sẽ nuốt hết:
 * '/overview' sẽ bị hiểu thành id = "overview".
 */
teamRouter.get('/overview', asyncHandler(controller.overview));

teamRouter.get(
  '/achievements',
  validate({ query: achievementsQuerySchema }),
  asyncHandler(controller.achievements)
);
