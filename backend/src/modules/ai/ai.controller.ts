/** MODULES/AI/AI.CONTROLLER.TS */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import * as service from './ai.service';

/**
 * GET /ai/predict/:matchId
 * Thêm ?refresh=true để bắt buộc gọi lại AI (bỏ qua cache).
 */
export async function predict(req: Request, res: Response) {
  const matchId = Number(req.params.matchId);

  // Chặn dự đoán trận đã đá xong
  await service.assertPredictable(matchId);

  const forceRefresh = req.query.refresh === 'true';
  const prediction = await service.getPrediction(matchId, forceRefresh);

  return sendSuccess(res, { prediction });
}

/** GET /ai/status — app dùng để biết đang chạy Gemini thật hay mô hình dự phòng */
export async function status(_req: Request, res: Response) {
  return sendSuccess(res, service.getAiStatus());
}
