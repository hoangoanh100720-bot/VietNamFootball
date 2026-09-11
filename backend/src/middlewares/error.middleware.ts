/**
 * ============================================================================
 * MIDDLEWARES/ERROR.MIDDLEWARE.TS — XỬ LÝ LỖI TẬP TRUNG
 * ============================================================================
 *
 * MIDDLEWARE LÀ GÌ?
 * Hình dung request như hành khách đi qua nhiều cửa kiểm tra:
 *
 *   Request -> [helmet] -> [cors] -> [rate-limit] -> [auth] -> [controller]
 *                                                                   |
 *   Response <---------------------------------------------------- /
 *
 * Mỗi "cửa" là một middleware: nhận (req, res, next).
 *   - Gọi next()      -> đi tiếp cửa sau
 *   - Gọi next(error) -> nhảy thẳng tới middleware LỖI (file này)
 *   - Trả res.json()  -> dừng, không đi tiếp
 *
 * Express nhận biết middleware lỗi nhờ nó có ĐÚNG 4 tham số
 * (err, req, res, next) — thiếu tham số next là Express hiểu nhầm ngay.
 */

import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';
import { AppError } from '@/utils/AppError';
import { sendError } from '@/utils/apiResponse';
import { logger } from '@/utils/logger';
import { isProd } from '@/config/env';

/**
 * Bắt request tới đường dẫn không tồn tại.
 * Đặt SAU tất cả route, TRƯỚC errorHandler.
 */
export function notFoundHandler(req: Request, _res: Response, next: NextFunction) {
  next(AppError.notFound('Không tìm thấy endpoint: ' + req.method + ' ' + req.originalUrl));
}

/**
 * Middleware lỗi cuối cùng. Mọi lỗi trong app đều rơi về đây.
 */
export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  // ---- 1. Lỗi do zod (dữ liệu client gửi lên sai định dạng) ----
  if (err instanceof ZodError) {
    const details = err.issues.map((i) => ({
      field: i.path.join('.'),
      message: i.message,
    }));
    logger.warn('Dữ liệu đầu vào không hợp lệ', { path: req.originalUrl, details });
    return sendError(res, 400, 'VALIDATION_ERROR', 'Dữ liệu gửi lên không hợp lệ', details);
  }

  // ---- 2. Lỗi CÓ CHỦ ĐÍCH do ta tự ném ra ----
  if (err instanceof AppError) {
    // 4xx là lỗi phía client -> chỉ cảnh báo. 5xx là lỗi phía ta -> log error.
    const logAt = err.statusCode >= 500 ? 'error' : 'warn';
    logger[logAt](err.message, { code: err.code, path: req.originalUrl });
    return sendError(res, err.statusCode, err.code, err.message, err.details);
  }

  // ---- 3. Lỗi BẤT NGỜ (bug) ----
  const error = err instanceof Error ? err : new Error(String(err));
  logger.error('Lỗi không lường trước: ' + error.message, {
    stack: error.stack,
    path: req.originalUrl,
    method: req.method,
  });

  // Ở production KHÔNG trả chi tiết lỗi ra ngoài (tránh lộ cấu trúc hệ thống).
  return sendError(
    res,
    500,
    'INTERNAL_ERROR',
    isProd ? 'Đã có lỗi xảy ra, vui lòng thử lại sau' : error.message,
    isProd ? undefined : { stack: error.stack?.split('\n').slice(0, 5) }
  );
}
