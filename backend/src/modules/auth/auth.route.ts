/**
 * ============================================================================
 * MODULES/AUTH/AUTH.ROUTE.TS — KHAI BÁO ĐƯỜNG DẪN
 * ============================================================================
 *
 * Đọc một dòng route theo THỨ TỰ TỪ TRÁI SANG PHẢI, mỗi phần là một "cửa":
 *
 *   router.post('/login',  authLimiter,  validate({...}),  asyncHandler(ctrl))
 *                  ^           ^              ^                  ^
 *               đường dẫn   chặn spam    kiểm tra dữ liệu    xử lý chính
 *
 * Nếu bất kỳ cửa nào chặn lại (gọi next(error)), các cửa sau KHÔNG chạy.
 * -> Dữ liệu bẩn không bao giờ chạm tới controller.
 */

import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { authLimiter } from '@/middlewares/rateLimit.middleware';
import { requireAuth } from '@/middlewares/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './auth.controller';
import { loginSchema, refreshSchema, registerSchema } from './auth.validator';

export const authRouter = Router();

/** Đăng ký — có giới hạn tần suất để chặn tạo tài khoản hàng loạt */
authRouter.post(
  '/register',
  authLimiter,
  validate({ body: registerSchema }),
  asyncHandler(controller.register)
);

/** Đăng nhập — giới hạn 5 lần SAI / 15 phút / IP */
authRouter.post(
  '/login',
  authLimiter,
  validate({ body: loginSchema }),
  asyncHandler(controller.login)
);

/**
 * Làm mới token — KHÔNG gắn requireAuth.
 * Lý do: endpoint này tồn tại chính vì access token đã hết hạn.
 * Bản thân refresh token đóng vai trò "chứng minh thư" ở đây.
 */
authRouter.post(
  '/refresh',
  validate({ body: refreshSchema }),
  asyncHandler(controller.refresh)
);

/** Đăng xuất — cần cả access token (biết là ai) lẫn refresh token (thu hồi cái nào) */
authRouter.post(
  '/logout',
  requireAuth,
  validate({ body: refreshSchema }),
  asyncHandler(controller.logout)
);

/** Lấy hồ sơ bản thân */
authRouter.get('/me', requireAuth, asyncHandler(controller.me));
