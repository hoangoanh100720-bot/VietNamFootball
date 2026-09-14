/**
 * MODULES/COMPETITIONS/COMPETITIONS.ROUTE.TS — công khai, chỉ đọc
 */
import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './competitions.controller';

export const competitionsRouter = Router();

competitionsRouter.get('/', asyncHandler(controller.list));

/**
 * ⚠️ '/standings' (TĨNH) phải khai TRƯỚC '/:seasonId/standings' (ĐỘNG).
 * Thực ra hai đường này khác số đoạn nên không nuốt nhau, nhưng giữ thói quen
 * "tĩnh trước, động sau" giúp khỏi phải nghĩ lại mỗi lần thêm route.
 */
competitionsRouter.get('/standings', asyncHandler(controller.standings));
competitionsRouter.get('/:seasonId/standings', asyncHandler(controller.standings));
