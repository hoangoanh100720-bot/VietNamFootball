/** MODULES/SQUAD/SQUAD.CONTROLLER.TS */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import * as service from './squad.service';

/** GET /squad/current — sơ đồ + 11 chính + dự bị */
export async function current(_req: Request, res: Response) {
  const squad = await service.getCurrentSquad();
  return sendSuccess(res, squad);
}

/** GET /squad/value — tổng giá trị đội hình */
export async function value(_req: Request, res: Response) {
  const data = await service.getSquadValue();
  return sendSuccess(res, data);
}
