/**
 * MODULES/THEMES/THEMES.VALIDATOR.TS
 */
import { z } from 'zod';

const code = z.string().regex(/^[a-z0-9-]{1,40}$/, 'Mã theme không hợp lệ');
const hex = z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'Màu phải là mã HEX 6 ký tự, ví dụ #DA251D');

/** GET /themes/active?mode=auto|fixed|off&code=tet — tham số dành cho KHÁCH */
export const activeQuerySchema = z.object({
  mode: z.enum(['auto', 'fixed', 'off']).default('auto'),
  code: code.optional(),
});

/** PUT /themes/preference — người đã đăng nhập lưu lựa chọn lên server */
export const preferenceBodySchema = z.object({
  mode: z.enum(['auto', 'fixed', 'off']),
  code: code.optional(),
});

/**
 * POST /themes — admin tạo theme (mục 6.5).
 *
 * zod chỉ kiểm HÌNH DẠNG (đủ khoá, đúng mã HEX). Kiểm tra ĐỘ TƯƠNG PHẢN là
 * nghiệp vụ, nằm ở service (validatePalette) — zod không biết "đọc được" là gì.
 */
const palette = z.object({
  accent: hex,
  accentText: hex,
  accentSoft: hex.optional(),
  accentFg: hex.optional(),
  gold: hex.optional(),
  goldSoft: hex.optional(),
  pitch: hex.optional(),
  pitchStripe: hex.optional(),
}).strict(); // .strict(): khoá lạ như "bg" hay "text" bị TỪ CHỐI, không lặng lẽ bỏ qua

export const createThemeBodySchema = z.object({
  code,
  name: z.string().trim().min(2).max(80),
  kind: z.enum(['event', 'result_win', 'result_lose']),
  palette_light: palette,
  palette_dark: palette,
  greeting: z.string().trim().max(80).optional(),
  effect: z.enum(['fireworks', 'blossoms']).optional(),
  is_selectable: z.boolean().default(true),
});

export type ActiveQuery = z.infer<typeof activeQuerySchema>;
export type PreferenceBody = z.infer<typeof preferenceBodySchema>;
export type CreateThemeBody = z.infer<typeof createThemeBodySchema>;
