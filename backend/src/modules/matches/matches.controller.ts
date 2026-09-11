/**
 * ============================================================================
 * MODULES/MATCHES/MATCHES.CONTROLLER.TS
 * ============================================================================
 */

import type { Request, Response } from 'express';
import { buildPagination, sendSuccess } from '@/utils/apiResponse';
import { getQuery } from '@/middlewares/validate.middleware';
import * as service from './matches.service';
import type { PaginationQuery } from './matches.validator';

/** GET /matches/latest — thẻ lớn đầu Tab 1 */
export async function latest(_req: Request, res: Response) {
  const match = await service.getLatestMatch();
  return sendSuccess(res, { match });
}

/** GET /matches/upcoming?page=1&limit=10 */
export async function upcoming(req: Request, res: Response) {
  const { page, limit } = getQuery<PaginationQuery>(req);

  const { items, total } = await service.getUpcomingMatches(page, limit);
  return sendSuccess(res, { matches: items }, 200, buildPagination(page, limit, total));
}

/** GET /matches/results?page=1&limit=10 */
export async function results(req: Request, res: Response) {
  const { page, limit } = getQuery<PaginationQuery>(req);

  const { items, total } = await service.getFinishedMatches(page, limit);
  return sendSuccess(res, { matches: items }, 200, buildPagination(page, limit, total));
}

/** GET /matches/:id */
export async function detail(req: Request, res: Response) {
  const id = Number(req.params.id);

  // Gọi song song 2 truy vấn độc lập bằng Promise.all -> nhanh gấp đôi so với
  // chờ lần lượt. Đây là thói quen tốt nên áp dụng ở mọi nơi có thể.
  const [match, events] = await Promise.all([
    service.getMatchById(id),
    service.getMatchEvents(id),
  ]);

  return sendSuccess(res, { match, events });
}

/** GET /matches/:id/live — app gọi mỗi 15s khi mất kết nối WebSocket */
export async function live(req: Request, res: Response) {
  const data = await service.getLiveScore(Number(req.params.id));
  return sendSuccess(res, data);
}

/** GET /matches/:id/h2h — lịch sử đối đầu */
export async function h2h(req: Request, res: Response) {
  const data = await service.getHeadToHead(Number(req.params.id));
  return sendSuccess(res, data);
}
