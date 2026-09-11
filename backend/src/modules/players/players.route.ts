/** MODULES/PLAYERS/PLAYERS.ROUTE.TS */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import { idParamSchema } from '@/modules/matches/matches.validator';
import * as controller from './players.controller';
import { listPlayersSchema } from './players.validator';

export const playersRouter = Router();

playersRouter.get('/', validate({ query: listPlayersSchema }), asyncHandler(controller.list));
playersRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.detail));
playersRouter.get('/:id/clubs', validate({ params: idParamSchema }), asyncHandler(controller.clubs));

/** HLV có đường dẫn riêng /coach nên tách thành router nhỏ */
export const coachRouter = Router();
coachRouter.get('/', asyncHandler(controller.coach));
