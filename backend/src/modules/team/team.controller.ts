/**
 * MODULES/TEAM/TEAM.CONTROLLER.TS
 *
 * Controller chỉ làm ba việc: đọc tham số đã kiểm tra, gọi service, trả kết quả.
 * Không có một dòng logic nghiệp vụ nào ở đây — nhờ vậy service test được mà
 * không cần dựng cả HTTP server.
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { getQuery } from '@/middlewares/validate.middleware';
import * as service from './team.service';
import type { AchievementsQuery } from './team.validator';

/**
 * GET /api/v1/team/overview
 *
 * Một lời gọi trả đủ dữ liệu cho Tab Giới thiệu:
 *   { profile, trophies, achievements }
 *
 * Xem giải thích "một request, không phải ba" ở đầu team.service.ts.
 */
export async function overview(_req: Request, res: Response) {
  return sendSuccess(res, await service.getTeamOverview());
}

/**
 * GET /api/v1/team/achievements?highlight=true&limit=50
 *
 * Dùng cho màn hình "Xem tất cả thành tích" — nơi người dùng muốn xem đầy đủ
 * dòng thời gian chứ không chỉ 5 mục mới nhất như ở tab.
 */
export async function achievements(req: Request, res: Response) {
  const { highlight, limit } = getQuery<AchievementsQuery>(req);

  const rows = await service.getAchievements(undefined, highlight, limit);

  return sendSuccess(res, { achievements: rows }, 200, { count: rows.length });
}
