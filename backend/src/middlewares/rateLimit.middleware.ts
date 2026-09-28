/**
 * ============================================================================
 * MIDDLEWARES/RATELIMIT.MIDDLEWARE.TS — GIỚI HẠN SỐ REQUEST
 * ============================================================================
 *
 * Ba mức giới hạn khác nhau vì mức độ nguy hiểm khác nhau:
 *
 *   generalLimiter : 100 req / 15 phút  -> chống spam chung
 *   authLimiter    :   5 req / 15 phút  -> chống DÒ MẬT KHẨU (brute force).
 *                                          Kẻ tấn công thử 1 triệu mật khẩu
 *                                          sẽ mất ~5 năm thay vì 1 giờ.
 *   aiLimiter      :  20 req / 1 giờ    -> chống ĐỐT TIỀN. Mỗi lần gọi Gemini
 *                                          đều tốn phí, phải chặn từ đầu.
 */

import rateLimit, { type Options } from 'express-rate-limit';
import { env } from '@/config/env';

/** Cấu hình dùng chung cho cả 3 limiter */
const baseOptions: Partial<Options> = {
  standardHeaders: 'draft-7', // trả về header RateLimit-* theo chuẩn mới
  legacyHeaders: false,
  // Khi vượt giới hạn, trả về đúng khuôn mẫu lỗi của dự án
  handler: (_req, res, _next, options) => {
    res.status(options.statusCode).json({
      success: false,
      error: {
        code: 'RATE_LIMITED',
        message: 'Bạn thao tác quá nhanh. Vui lòng thử lại sau ít phút.',
      },
    });
  },
};

/** Áp cho toàn bộ /api/v1 */
export const generalLimiter = rateLimit({
  ...baseOptions,
  windowMs: env.RATE_LIMIT_WINDOW_MS,
  max: env.RATE_LIMIT_MAX,
});

/** Áp riêng cho /auth/login và /auth/register */
export const authLimiter = rateLimit({
  ...baseOptions,
  /**
   * ⚠️ Cửa sổ 15 phút RIÊNG, không dùng chung RATE_LIMIT_WINDOW_MS.
   * Giới hạn chung đã rút xuống 1 phút; nếu đăng nhập dùng chung thì "5 lần sai"
   * sẽ thành 5 lần sai MỖI PHÚT — kẻ dò mật khẩu nhanh gấp 15 lần.
   */
  windowMs: 15 * 60 * 1000,
  max: env.AUTH_RATE_LIMIT_MAX,
  // Chỉ đếm những lần THẤT BẠI -> đăng nhập đúng nhiều lần không bị chặn
  skipSuccessfulRequests: true,
});

/** Áp riêng cho /ai/* — bảo vệ hầu bao */
export const aiLimiter = rateLimit({
  ...baseOptions,
  windowMs: 60 * 60 * 1000, // 1 giờ
  max: env.AI_RATE_LIMIT_MAX,
});
