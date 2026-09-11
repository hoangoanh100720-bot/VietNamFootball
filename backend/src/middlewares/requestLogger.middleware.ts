/**
 * ============================================================================
 * MIDDLEWARES/REQUESTLOGGER.MIDDLEWARE.TS — GHI LOG MỖI REQUEST
 * ============================================================================
 *
 * In ra dòng dạng:  GET /api/v1/matches/latest 200 - 12ms
 *
 * Kỹ thuật: đăng ký lắng nghe sự kiện 'finish' của response.
 * Sự kiện này bắn ra khi Express đã gửi xong dữ liệu về client,
 * lúc đó mới biết được status code và thời gian xử lý thật sự.
 */

import type { NextFunction, Request, Response } from 'express';
import { logger } from '@/utils/logger';

export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - startedAt;
    const line = req.method + ' ' + req.originalUrl + ' ' + res.statusCode + ' - ' + ms + 'ms';

    // Request lỗi thì nâng mức log lên để dễ thấy
    if (res.statusCode >= 500) logger.error(line);
    else if (res.statusCode >= 400) logger.warn(line);
    else logger.http(line);
  });

  next();
}
