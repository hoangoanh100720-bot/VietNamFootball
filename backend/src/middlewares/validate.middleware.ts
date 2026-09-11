/**
 * ============================================================================
 * MIDDLEWARES/VALIDATE.MIDDLEWARE.TS — KIỂM TRA DỮ LIỆU ĐẦU VÀO (zod)
 * ============================================================================
 *
 * NGUYÊN TẮC VÀNG: "Không bao giờ tin dữ liệu từ client".
 * Người dùng có thể sửa app, dùng Postman, gửi bất cứ thứ gì.
 *
 * Middleware này kiểm tra 3 nguồn dữ liệu của một request:
 *   body   : dữ liệu trong thân request  (POST /auth/login  { email, password })
 *   params : biến trên đường dẫn         (GET /matches/:id  -> { id: "12" })
 *   query  : tham số sau dấu ?           (GET /players?page=2 -> { page: "2" })
 *
 * Lợi ích kép: vừa chặn dữ liệu bẩn, vừa GHI ĐÈ giá trị đã chuẩn hoá
 * (vd chuỗi "2" -> số 2) để controller dùng luôn, khỏi ép kiểu thủ công.
 */

import type { NextFunction, Request, Response } from 'express';
import type { ZodTypeAny } from 'zod';

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

export function validate(schemas: ValidationSchemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (schemas.body) req.body = schemas.body.parse(req.body);
      if (schemas.params) Object.assign(req.params, schemas.params.parse(req.params));
      if (schemas.query) {
        // Express 5 đặt req.query là thuộc tính chỉ đọc -> gắn kết quả sang
        // biến riêng để controller đọc, thay vì gán đè.
        (req as Request & { validatedQuery?: unknown }).validatedQuery =
          schemas.query.parse(req.query);
      }
      next();
    } catch (err) {
      // ZodError sẽ được errorHandler dịch thành thông báo tiếng Việt
      next(err);
    }
  };
}

/** Đọc query đã qua kiểm tra, có kiểu dữ liệu rõ ràng */
export function getQuery<T>(req: Request): T {
  return (req as Request & { validatedQuery: T }).validatedQuery;
}
