/** MODULES/SQUAD/SQUAD.ROUTE.TS */
import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './squad.controller';

export const squadRouter = Router();

squadRouter.get('/current', asyncHandler(controller.current));
squadRouter.get('/value', asyncHandler(controller.value));

// ⭐ Đội hình trận vừa đá + điểm cầu thủ (phân đoạn 'Trận vừa đá' ở Tab Đội hình)
squadRouter.get('/last-match', asyncHandler(controller.lastMatch));
