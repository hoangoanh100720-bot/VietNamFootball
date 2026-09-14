/**
 * MODULES/THEMES/THEMES.CONTROLLER.TS
 */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { getQuery } from '@/middlewares/validate.middleware';
import { AppError } from '@/utils/AppError';
import { query } from '@/config/database';
import { cacheDel } from '@/utils/cache';
import * as service from './themes.service';
import type { ActiveQuery, CreateThemeBody, PreferenceBody } from './themes.validator';

/** GET /api/v1/themes — các theme được phép chọn cố định */
export async function list(_req: Request, res: Response) {
  return sendSuccess(res, { themes: await service.listSelectable() });
}

/**
 * GET /api/v1/themes/active
 *
 * Dùng optionalAuth: đăng nhập thì đọc cài đặt trên server, khách thì dùng
 * ?mode=&code= gửi từ máy. Một endpoint phục vụ cả hai, app không phải rẽ nhánh.
 */
export async function active(req: Request, res: Response) {
  const { mode, code } = getQuery<ActiveQuery>(req);
  return sendSuccess(res, await service.resolveActive({ userId: req.user?.sub, mode, code }));
}

/** PUT /api/v1/themes/preference — cần đăng nhập */
export async function savePreference(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const { mode, code } = req.body as PreferenceBody;
  return sendSuccess(res, await service.savePreference(req.user.sub, mode, code));
}

/**
 * POST /api/v1/themes — CHỈ ADMIN. Từ chối 422 nếu chữ không đọc được.
 */
export async function create(req: Request, res: Response) {
  const body = req.body as CreateThemeBody;

  const issues = service.validatePalette(body.palette_light, body.palette_dark);
  if (issues.length > 0) {
    /**
     * 422 kèm TỶ LỆ ĐO ĐƯỢC từng cặp màu. Admin đọc "accentText / bg ở chế độ
     * tối: 3.1 (cần ≥ 4.5)" là biết phải chỉnh màu nào, sáng thêm bao nhiêu.
     */
    throw AppError.unprocessable('Màu theme không đủ độ tương phản (cần tối thiểu 4.5:1).', issues);
  }

  const { rows } = await query<{ id: number }>(
    `INSERT INTO themes (code, name, kind, palette_light, palette_dark, assets, is_selectable, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
     ON CONFLICT (code) DO NOTHING
     RETURNING id`,
    [
      body.code, body.name, body.kind,
      JSON.stringify(body.palette_light), JSON.stringify(body.palette_dark),
      JSON.stringify({ greeting: body.greeting ?? null, effect: body.effect ?? null }),
      body.is_selectable, req.user?.sub ?? null,
    ]
  );

  if (rows.length === 0) throw AppError.conflict(`Mã theme "${body.code}" đã tồn tại.`, 'THEME_CODE_TAKEN');

  await cacheDel('themes:*');
  return sendSuccess(res, { id: rows[0]!.id }, 201);
}
