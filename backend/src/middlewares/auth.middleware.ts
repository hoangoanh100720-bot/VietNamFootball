/**
 * ============================================================================
 * MIDDLEWARES/AUTH.MIDDLEWARE.TS — NGƯỜI SOÁT VÉ
 * ============================================================================
 *
 * App mobile gửi access token trong header theo chuẩn Bearer:
 *
 *   Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9....
 *
 * Middleware này:
 *   1. Lấy token ra khỏi header
 *   2. Kiểm tra chữ ký + hạn dùng
 *   3. Gắn thông tin người dùng vào req.user để controller phía sau dùng
 *
 * JWT TRÔNG NHƯ THẾ NÀO? Ba phần ngăn bởi dấu chấm:
 *
 *   header.payload.signature
 *   eyJhbGci... . eyJzdWIiOjF9 . 4pcPyMD0...
 *
 * ⚠️ Hai phần đầu chỉ là Base64, AI CŨNG ĐỌC ĐƯỢC (không phải mã hoá!).
 *    -> TUYỆT ĐỐI không nhét mật khẩu hay dữ liệu nhạy cảm vào payload.
 *    Phần thứ ba (chữ ký) mới là thứ đảm bảo token không bị sửa: nó được tạo
 *    từ JWT_SECRET mà chỉ server biết. Sửa một ký tự trong payload là chữ ký
 *    lệch ngay, server phát hiện tức thì.
 */

import type { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '@/config/env';
import { AppError } from '@/utils/AppError';
import type { JwtPayload } from '@/types';

/**
 * MỞ RỘNG KIỂU CỦA EXPRESS.
 * Mặc định TypeScript không biết req.user là gì. Khối `declare global` dưới đây
 * dạy cho nó: "Request có thêm thuộc tính user tuỳ chọn".
 * Từ giờ gõ req.user? trong mọi controller đều được gợi ý đầy đủ.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

/** Tách token khỏi chuỗi "Bearer xxx" */
function extractToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header) return null;

  const [scheme, token] = header.split(' ');
  if (scheme !== 'Bearer' || !token) return null;

  return token;
}

/**
 * BẮT BUỘC đăng nhập. Không có token hợp lệ -> chặn ngay với lỗi 401.
 * Dùng cho: POST /devices/token, POST /auth/logout, GET /auth/me
 */
export function requireAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next(AppError.unauthorized('Thiếu access token'));

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
    next();
  } catch (err) {
    // Phân biệt hai lỗi để app mobile biết cách xử lý:
    //   TokenExpiredError -> gọi /auth/refresh để lấy token mới (tự động, người dùng không thấy gì)
    //   Lỗi khác          -> token giả/hỏng, bắt đăng nhập lại
    if (err instanceof jwt.TokenExpiredError) {
      return next(new AppError(401, 'TOKEN_EXPIRED', 'Access token đã hết hạn'));
    }
    next(AppError.unauthorized('Access token không hợp lệ'));
  }
}

/**
 * TUỲ CHỌN đăng nhập: có token thì đọc, không có cũng cho qua.
 * Dùng cho các endpoint công khai nhưng muốn cá nhân hoá nếu người dùng
 * đã đăng nhập (vd: đánh dấu trận đã theo dõi).
 */
export function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  const token = extractToken(req);
  if (!token) return next();

  try {
    req.user = jwt.verify(token, env.JWT_SECRET) as unknown as JwtPayload;
  } catch {
    // Token hỏng thì coi như khách vãng lai, KHÔNG báo lỗi
  }
  next();
}

/**
 * Yêu cầu quyền quản trị. Luôn đặt SAU requireAuth.
 *   router.post('/sync', requireAuth, requireAdmin, controller)
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  if (!req.user) return next(AppError.unauthorized());
  if (req.user.role !== 'admin') return next(AppError.forbidden());
  next();
}
