/**
 * MODULES/SQUADS/SQUADS.CONTROLLER.TS
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { AppError } from '@/utils/AppError';
import * as service from './squads.service';

/** GET /api/v1/squads/current — đợt triệu tập mới nhất đã công bố */
export async function current(_req: Request, res: Response) {
  // null là trạng thái hợp lệ (chưa có đợt nào), KHÔNG phải 404: app hiện
  // "Chưa có danh sách triệu tập" thay vì màn hình lỗi.
  return sendSuccess(res, await service.getCurrentSquad());
}

/** GET /api/v1/squads?limit=20 — lịch sử các đợt */
export async function list(req: Request, res: Response) {
  const limit = Math.min(50, Math.max(1, Number(req.query.limit ?? 20) || 20));
  return sendSuccess(res, { squads: await service.listSquads(limit) });
}

/** GET /api/v1/squads/:id — một đợt cụ thể */
export async function detail(req: Request, res: Response) {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) throw AppError.badRequest('id phải là số nguyên dương');

  const squad = await service.getSquadById(id);
  if (!squad) throw AppError.notFound('Không tìm thấy đợt triệu tập.');
  return sendSuccess(res, squad);
}
