/** MODULES/RANKING/RANKING.CONTROLLER.TS */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { getQuery } from '@/middlewares/validate.middleware';
import * as service from './ranking.service';
import type { RankingQuery } from './ranking.validator';

/** GET /ranking/fifa?limit=20 */
export async function fifa(req: Request, res: Response) {
  const { limit } = getQuery<RankingQuery>(req);

  const [rankings, vietnam] = await Promise.all([
    service.getLatestRanking(limit),
    service.getVietnamRanking(),
  ]);

  return sendSuccess(res, {
    rankings,
    vietnam,
    snapshot_date: rankings[0]?.snapshot_date ?? null,
  });
}
