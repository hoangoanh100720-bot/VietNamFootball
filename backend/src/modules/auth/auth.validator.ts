/**
 * ============================================================================
 * MODULES/AUTH/AUTH.VALIDATOR.TS — LUẬT KIỂM TRA DỮ LIỆU ĐẦU VÀO
 * ============================================================================
 *
 * Mọi thông báo lỗi viết bằng tiếng Việt để hiển thị thẳng lên app,
 * không cần dịch lại ở phía mobile.
 */

import { z } from 'zod';

/** Luật đặt mật khẩu — dùng chung cho đăng ký và đổi mật khẩu sau này */
const passwordSchema = z
  .string()
  .min(8, 'Mật khẩu phải có ít nhất 8 ký tự')
  .max(72, 'Mật khẩu tối đa 72 ký tự') // bcrypt cắt cụt sau 72 byte
  .regex(/[a-z]/, 'Mật khẩu phải có ít nhất 1 chữ thường')
  .regex(/[A-Z]/, 'Mật khẩu phải có ít nhất 1 chữ hoa')
  .regex(/[0-9]/, 'Mật khẩu phải có ít nhất 1 chữ số');

export const registerSchema = z.object({
  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Email không đúng định dạng')
    .max(255, 'Email quá dài'),
  password: passwordSchema,
  full_name: z
    .string()
    .trim()
    .min(2, 'Họ tên phải có ít nhất 2 ký tự')
    .max(120, 'Họ tên tối đa 120 ký tự'),
});

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email không đúng định dạng'),
  // Khi ĐĂNG NHẬP thì KHÔNG áp luật độ mạnh mật khẩu.
  // Lý do: người dùng đăng ký từ trước, luật có thể đã thay đổi; và ta không
  // muốn tiết lộ quy tắc mật khẩu qua thông báo lỗi ở màn đăng nhập.
  password: z.string().min(1, 'Vui lòng nhập mật khẩu'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().min(10, 'Thiếu refresh token'),
});

// z.infer lấy ngược kiểu TypeScript TỪ schema zod.
// Nhờ vậy schema và kiểu dữ liệu luôn khớp nhau, sửa một chỗ là xong.
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type RefreshInput = z.infer<typeof refreshSchema>;
