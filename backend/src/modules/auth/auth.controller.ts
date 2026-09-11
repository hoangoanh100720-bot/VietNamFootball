/**
 * ============================================================================
 * MODULES/AUTH/AUTH.CONTROLLER.TS — TẦNG ĐIỀU KHIỂN
 * ============================================================================
 *
 * Controller chỉ làm ĐÚNG 3 việc, không hơn:
 *   1. Lấy dữ liệu từ req (body / params / query / user)
 *   2. Gọi service
 *   3. Trả kết quả qua sendSuccess
 *
 * KHÔNG viết logic nghiệp vụ ở đây. KHÔNG gọi thẳng database ở đây.
 * Controller mà dài quá 15 dòng là dấu hiệu logic đang bị đặt sai chỗ.
 */

import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { AppError } from '@/utils/AppError';
import * as authService from './auth.service';
import type { LoginInput, RefreshInput, RegisterInput } from './auth.validator';

/** POST /api/v1/auth/register */
export async function register(req: Request, res: Response) {
  const body = req.body as RegisterInput;

  const result = await authService.register({
    ...body,
    userAgent: req.headers['user-agent'],
  });

  // 201 Created — chuẩn HTTP cho "đã tạo mới tài nguyên"
  return sendSuccess(res, result, 201);
}

/** POST /api/v1/auth/login */
export async function login(req: Request, res: Response) {
  const body = req.body as LoginInput;

  const result = await authService.login({
    ...body,
    userAgent: req.headers['user-agent'],
  });

  return sendSuccess(res, result);
}

/** POST /api/v1/auth/refresh */
export async function refresh(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshInput;

  const result = await authService.refresh(refreshToken, req.headers['user-agent']);
  return sendSuccess(res, result);
}

/** POST /api/v1/auth/logout — cần đăng nhập */
export async function logout(req: Request, res: Response) {
  const { refreshToken } = req.body as RefreshInput;

  // req.user chắc chắn tồn tại vì route đã gắn requireAuth,
  // nhưng TypeScript không biết điều đó -> kiểm tra cho an toàn.
  if (!req.user) throw AppError.unauthorized();

  await authService.logout(refreshToken, req.user.sub);
  return sendSuccess(res, { message: 'Đã đăng xuất' });
}

/** GET /api/v1/auth/me — cần đăng nhập */
export async function me(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();

  const user = await authService.getProfile(req.user.sub);
  return sendSuccess(res, { user });
}
