/**
 * MODULES/SEARCH/SEARCH.CONTROLLER.TS
 *
 * Controller chỉ làm đúng ba việc: đọc dữ liệu đã kiểm tra, gọi service,
 * trả kết quả. Mọi logic nghiệp vụ nằm ở service — nhờ vậy service test được
 * mà không cần dựng cả HTTP server.
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { getQuery } from '@/middlewares/validate.middleware';
import { AppError } from '@/utils/AppError';
import { env } from '@/config/env';
import * as service from './search.service';
import type { SearchQuery } from './search.validator';

/**
 * GET /api/v1/search?q=...&limit=8&source=crawl&debug=true
 *
 * Tìm kiếm lai trong kho tri thức: vector (hiểu ý nghĩa) + từ khoá (khớp
 * chính xác tên riêng, con số).
 */
export async function search(req: Request, res: Response) {
  if (!env.SEARCH_ENABLED) {
    throw AppError.serviceUnavailable('Tính năng tìm kiếm đang tắt (SEARCH_ENABLED=false)');
  }

  const { q, limit, source, debug } = getQuery<SearchQuery>(req);

  const started = Date.now();
  const hits = await service.hybridSearch(q, { limit, source, debug });

  return sendSuccess(
    res,
    { query: q, hits },
    200,
    {
      count: hits.length,
      /** Thời gian xử lý — để bạn theo dõi hiệu năng ngay trên phản hồi */
      took_ms: Date.now() - started,
      engine: env.DB_DRIVER === 'postgres' ? 'pgvector' : 'javascript',
    }
  );
}

/**
 * GET /api/v1/search/stats
 *
 * Sức khoẻ kho tri thức: đã có bao nhiêu tài liệu, bao nhiêu đoạn đã nhúng
 * vector, còn bao nhiêu đoạn đang chờ. `pending > 0` nghĩa là nên chạy
 * `npm run index` để xử lý nốt.
 */
export async function stats(_req: Request, res: Response) {
  return sendSuccess(res, await service.getIndexStats());
}
