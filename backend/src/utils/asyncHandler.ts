/**
 * ============================================================================
 * UTILS/ASYNCHANDLER.TS — BỌC CONTROLLER BẤT ĐỒNG BỘ
 * ============================================================================
 *
 * VẤN ĐỀ: Express 4 KHÔNG tự bắt lỗi trong hàm async.
 *
 *   app.get('/x', async (req, res) => {
 *     const data = await db.query(...);   // <-- nếu ném lỗi ở đây
 *     res.json(data);
 *   });
 *   // ...request sẽ TREO mãi mãi, client chờ tới timeout.
 *
 * Cách thủ công là bọc try/catch trong MỌI controller -> lặp lại rất nhiều.
 *
 * GIẢI PHÁP: asyncHandler bọc hàm lại, tự động .catch(next)
 * để lỗi chảy về errorHandler.
 *
 *   router.get('/x', asyncHandler(async (req, res) => { ... }));
 */

import type { NextFunction, Request, RequestHandler, Response } from 'express';

type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>;

export function asyncHandler(fn: AsyncFn): RequestHandler {
  return (req, res, next) => {
    // Promise.resolve(...) để hàm đồng bộ ném lỗi cũng được bắt
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
