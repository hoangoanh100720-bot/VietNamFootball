/** MODULES/SQUAD/SQUAD.ROUTE.TS */
import { Router } from 'express';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './squad.controller';

export const squadRouter = Router();

squadRouter.get('/current', asyncHandler(controller.current));
squadRouter.get('/value', asyncHandler(controller.value));
