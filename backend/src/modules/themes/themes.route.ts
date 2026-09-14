/**
 * MODULES/THEMES/THEMES.ROUTE.TS
 */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { optionalAuth, requireAdmin, requireAuth } from '@/middlewares/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './themes.controller';
import { activeQuerySchema, createThemeBodySchema, preferenceBodySchema } from './themes.validator';

export const themesRouter = Router();

themesRouter.get('/', asyncHandler(controller.list));

themesRouter.get(
  '/active',
  optionalAuth,
  validate({ query: activeQuerySchema }),
  asyncHandler(controller.active)
);

themesRouter.put(
  '/preference',
  requireAuth,
  validate({ body: preferenceBodySchema }),
  asyncHandler(controller.savePreference)
);

// requireAuth TRƯỚC requireAdmin — requireAdmin cần req.user đã được gắn
themesRouter.post(
  '/',
  requireAuth,
  requireAdmin,
  validate({ body: createThemeBodySchema }),
  asyncHandler(controller.create)
);
