/** MODULES/PLAYERS/PLAYERS.CONTROLLER.TS */
import type { Request, Response } from 'express';
import { buildPagination, sendSuccess } from '@/utils/apiResponse';
import { getQuery } from '@/middlewares/validate.middleware';
import * as service from './players.service';
import type { ListPlayersQuery } from './players.validator';

/** GET /players?position=FW&search=son&page=1 */
export async function list(req: Request, res: Response) {
  const q = getQuery<ListPlayersQuery>(req);

  const { items, total } = await service.listPlayers(q);
  return sendSuccess(res, { players: items }, 200, buildPagination(q.page, q.limit, total));
}

/** GET /players/:id */
export async function detail(req: Request, res: Response) {
  const id = Number(req.params.id);

  const [player, clubs] = await Promise.all([
    service.getPlayerById(id),
    service.getPlayerClubs(id),
  ]);

  return sendSuccess(res, { player, clubs });
}

/** GET /players/:id/clubs */
export async function clubs(req: Request, res: Response) {
  const data = await service.getPlayerClubs(Number(req.params.id));
  return sendSuccess(res, { clubs: data });
}

/** GET /coach */
export async function coach(_req: Request, res: Response) {
  const data = await service.getCurrentCoach();
  return sendSuccess(res, { coach: data });
}
