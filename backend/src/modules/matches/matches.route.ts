/**
 * ============================================================================
 * MODULES/MATCHES/MATCHES.ROUTE.TS
 * ============================================================================
 *
 * ⚠️ THỨ TỰ KHAI BÁO ROUTE RẤT QUAN TRỌNG!
 *
 * Express so khớp TỪ TRÊN XUỐNG, gặp cái nào khớp trước thì dừng.
 * Nếu đặt '/:id' lên trước '/latest' thì khi gọi /matches/latest,
 * Express sẽ hiểu id = "latest" -> ép kiểu số thất bại -> lỗi 400.
 *
 * QUY TẮC: đường dẫn CỐ ĐỊNH đặt trước, đường dẫn CÓ THAM SỐ đặt sau.
 */

import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './matches.controller';
import { idParamSchema, paginationSchema } from './matches.validator';

export const matchesRouter = Router();

// ---- Đường dẫn cố định (phải đứng trước) ----
matchesRouter.get('/latest', asyncHandler(controller.latest));

matchesRouter.get(
  '/upcoming',
  validate({ query: paginationSchema }),
  asyncHandler(controller.upcoming)
);

matchesRouter.get(
  '/results',
  validate({ query: paginationSchema }),
  asyncHandler(controller.results)
);

// ---- Đường dẫn có tham số (đứng sau) ----
matchesRouter.get('/:id', validate({ params: idParamSchema }), asyncHandler(controller.detail));

matchesRouter.get('/:id/live', validate({ params: idParamSchema }), asyncHandler(controller.live));

matchesRouter.get('/:id/h2h', validate({ params: idParamSchema }), asyncHandler(controller.h2h));
