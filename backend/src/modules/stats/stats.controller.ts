/**
 * MODULES/STATS/STATS.CONTROLLER.TS
 *
 * Controller chỉ đọc tham số đã kiểm tra -> gọi service -> trả kết quả.
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { getQuery } from '@/middlewares/validate.middleware';
import { queryOne } from '@/config/database';
import * as service from './stats.service';
import type { LeaderboardQuery, StatsMatchesQuery } from './stats.validator';

/** GET /api/v1/stats/overview — trận vừa đá + MOTM + top 5 cầu thủ */
export async function overview(_req: Request, res: Response) {
  return sendSuccess(res, await service.getOverview());
}

/** GET /api/v1/stats/matches?limit=10&cursor=... — các trận đã đá, kèm thông số */
export async function matches(req: Request, res: Response) {
  const { limit, cursor } = getQuery<StatsMatchesQuery>(req);
  const { matches: items, nextCursor } = await service.getStatsMatches(limit, cursor);

  // nextCursor đặt trong `meta` theo quy ước chung của API (ARCHITECTURE.md mục 8.1)
  return sendSuccess(res, { matches: items }, 200, { nextCursor });
}

/** GET /api/v1/stats/players/leaderboard?period=year&key=2026&metric=goals */
export async function leaderboard(req: Request, res: Response) {
  const { period, key, metric, limit } = getQuery<LeaderboardQuery>(req);

  /**
   * Không truyền `key` -> tự chọn kỳ MỚI NHẤT có dữ liệu của loại kỳ đó.
   *
   * Nhờ vậy app gọi `?period=year` là đủ, không phải tự đoán "năm nay là năm
   * nào và đã có số liệu chưa" — việc đó thuộc về backend, nơi biết dữ liệu.
   */
  let periodKey = key;
  if (!periodKey) {
    const latest = await queryOne<{ period_key: string }>(
      `SELECT period_key FROM player_rating_stats
       WHERE period_type = $1 ORDER BY period_key DESC LIMIT 1`,
      [period]
    );
    periodKey = latest?.period_key ?? String(new Date().getFullYear());
  }

  const [board, periods] = await Promise.all([
    service.getLeaderboard(period, periodKey, metric, limit),
    service.getLeaderboardPeriods(),
  ]);

  return sendSuccess(res, { ...board, periods });
}
