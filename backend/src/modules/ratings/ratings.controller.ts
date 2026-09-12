/**
 * MODULES/RATINGS/RATINGS.CONTROLLER.TS
 *
 * API điểm cầu thủ — phục vụ sơ đồ đội hình (điểm trên đầu cầu thủ) và
 * bottom sheet "Vì sao 8.3?".
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { AppError } from '@/utils/AppError';
import * as service from '@/services/rating/rating.service';

/**
 * GET /api/v1/ratings/match/:matchId
 *
 * Trả điểm của mọi cầu thủ trong trận, KÈM bảng giải thích từng điểm.
 * Đây là thứ FotMob và SofaScore không có.
 */
export async function matchRatings(req: Request, res: Response) {
  const matchId = Number(req.params.matchId);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    throw AppError.badRequest('matchId phải là số nguyên dương');
  }

  const ratings = await service.getMatchRatings(matchId);

  return sendSuccess(
    res,
    {
      match_id: matchId,
      ratings,
      motm: ratings.find((r) => r.is_motm)?.player_id ?? null,
    },
    200,
    { count: ratings.length }
  );
}

/**
 * POST /api/v1/ratings/match/:matchId/recompute
 *
 * Chấm lại toàn bộ cầu thủ của trận.
 *
 * ⚠️ CẦN QUYỀN ADMIN (gắn ở route). Đây là thao tác GHI, và nếu để công khai
 * thì bất kỳ ai cũng có thể bắt server chấm lại liên tục để làm nghẽn database.
 *
 * Bình thường job tự chạy khi có `match.updated`; endpoint này dành cho lúc
 * cần đính chính bằng tay (VAR huỷ bàn, nhà cung cấp sửa số liệu).
 */
export async function recompute(req: Request, res: Response) {
  const matchId = Number(req.params.matchId);
  if (!Number.isFinite(matchId) || matchId <= 0) {
    throw AppError.badRequest('matchId phải là số nguyên dương');
  }

  const result = await service.rateMatch(matchId, 'manual');

  if (!result) {
    throw AppError.unprocessable(
      'Không chấm được: trận chưa có số liệu cầu thủ, hoặc chưa bật bộ quy tắc nào.'
    );
  }

  return sendSuccess(res, result);
}
