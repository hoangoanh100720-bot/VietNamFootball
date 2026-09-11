/**
 * MODULES/DEVICES/DEVICES.ROUTE.TS
 *
 * Cả ba endpoint đều gắn requireAuth: thông báo là tính năng cá nhân,
 * phải biết token này thuộc về ai thì mới gửi đúng người.
 */
import { Router } from 'express';
import { validate } from '@/middlewares/validate.middleware';
import { requireAuth } from '@/middlewares/auth.middleware';
import { asyncHandler } from '@/utils/asyncHandler';
import * as controller from './devices.controller';
import { registerDeviceSchema, unregisterDeviceSchema } from './devices.validator';

export const devicesRouter = Router();

devicesRouter.post(
  '/token',
  requireAuth,
  validate({ body: registerDeviceSchema }),
  asyncHandler(controller.register)
);

devicesRouter.delete(
  '/token',
  requireAuth,
  validate({ body: unregisterDeviceSchema }),
  asyncHandler(controller.unregister)
);

devicesRouter.get('/', requireAuth, asyncHandler(controller.list));
