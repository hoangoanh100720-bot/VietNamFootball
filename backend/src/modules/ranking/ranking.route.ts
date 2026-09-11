/** MODULES/RANKING/RANKING.ROUTE.TS */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './ranking.controller';
import { rankingQuerySchema } from './ranking.validator';

export const rankingRouter = Router();

rankingRouter.get('/fifa', validate({ query: rankingQuerySchema }), asyncHandler(controller.fifa));
