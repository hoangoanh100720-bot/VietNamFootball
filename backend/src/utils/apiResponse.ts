/**
 * ============================================================================
 * UTILS/APIRESPONSE.TS — KHUÔN MẪU JSON TRẢ VỀ
 * ============================================================================
 *
 * MỌI endpoint đều trả về đúng MỘT trong hai hình dạng dưới đây.
 * Nhờ vậy app mobile chỉ cần viết một chỗ xử lý duy nhất.
 *
 * Thành công:
 *   { "success": true, "data": {...}, "meta": { "page": 1, "total": 42 } }
 *
 * Thất bại:
 *   { "success": false, "error": { "code": "NOT_FOUND", "message": "..." } }
 */

import type { Response } from 'express';

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

/** Trả về dữ liệu thành công */
export function sendSuccess<T>(
  res: Response,
  data: T,
  statusCode = 200,
  meta?: PaginationMeta | Record<string, unknown>
) {
  return res.status(statusCode).json({
    success: true,
    data,
    ...(meta ? { meta } : {}),
  });
}

/** Trả về lỗi (thường chỉ error.middleware gọi hàm này) */
export function sendError(
  res: Response,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message, ...(details ? { details } : {}) },
  });
}

/** Tính thông tin phân trang từ tổng số bản ghi */
export function buildPagination(page: number, limit: number, total: number): PaginationMeta {
  return { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) };
}
