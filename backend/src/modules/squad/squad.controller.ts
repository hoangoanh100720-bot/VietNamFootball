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

/**
 * GET /squad/last-match
 *
 * Đội hình trận vừa đá, KÈM điểm cầu thủ và thẻ phạt.
 * Dùng cho phân đoạn "Trận vừa đá" ở Tab Đội hình (ARCHITECTURE.md mục 5.3).
 */
export async function lastMatch(_req: Request, res: Response) {
  return sendSuccess(res, await service.getLastMatchSquad());
}
