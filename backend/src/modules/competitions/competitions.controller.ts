/**
 * MODULES/COMPETITIONS/COMPETITIONS.CONTROLLER.TS
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { AppError } from '@/utils/AppError';
import * as service from './competitions.service';

/** GET /api/v1/competitions — giải đấu + các mùa giải */
export async function list(_req: Request, res: Response) {
  return sendSuccess(res, { seasons: await service.listCompetitions() });
}

/**
 * GET /api/v1/competitions/standings            -> mùa hiện tại có Việt Nam
 * GET /api/v1/competitions/:seasonId/standings  -> một mùa cụ thể
 *
 * ⚠️ Tham số là SEASON id, không phải competition id — xem giải thích "giải
 * vs mùa" ở đầu competitions.service.ts. Đặc tả ghi `/competitions/:id/standings`;
 * ở đây `:id` được hiểu là id mùa giải, vì BXH chỉ có nghĩa trong một mùa.
 */
export async function standings(req: Request, res: Response) {
  const raw = req.params.seasonId;
  let seasonId: number | undefined;

  if (raw !== undefined) {
    seasonId = Number(raw);
    if (!Number.isInteger(seasonId) || seasonId <= 0) {
      throw AppError.badRequest('seasonId phải là số nguyên dương');
    }
  }

  return sendSuccess(res, await service.getStandings(seasonId));
}
