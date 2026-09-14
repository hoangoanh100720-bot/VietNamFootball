/**
 * MODULES/SQUADS/SQUADS.ROUTE.TS — công khai, chỉ đọc
 */
import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './squads.controller';

export const squadsRouter = Router();

// ⚠️ '/current' (tĩnh) PHẢI đứng trước '/:id' (động) — nếu không Express hiểu
// "current" là một id và trả lỗi "id phải là số nguyên dương".
squadsRouter.get('/current', asyncHandler(controller.current));
squadsRouter.get('/', asyncHandler(controller.list));
squadsRouter.get('/:id', asyncHandler(controller.detail));
