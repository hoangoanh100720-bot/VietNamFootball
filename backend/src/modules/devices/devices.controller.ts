/** MODULES/DEVICES/DEVICES.CONTROLLER.TS */
import type { Request, Response } from 'express';
import { sendSuccess } from '@/utils/apiResponse';
import { AppError } from '@/utils/AppError';
import * as service from './devices.service';
import { getNotificationStatus } from '@/services/notification.service';
import type { RegisterDeviceBody, UnregisterDeviceBody } from './devices.validator';

/** POST /devices/token — cần đăng nhập */
export async function register(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const body = req.body as RegisterDeviceBody;

  const device = await service.registerDevice({
    userId: req.user.sub,
    fcmToken: body.fcmToken,
    platform: body.platform,
  });

  // Trả kèm trạng thái FCM để app biết thông báo có thật sự hoạt động không
  return sendSuccess(
    res,
    { device, notifications: getNotificationStatus() },
    201
  );
}

/** DELETE /devices/token — tắt thông báo cho thiết bị này */
export async function unregister(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();
  const body = req.body as UnregisterDeviceBody;

  const removed = await service.unregisterDevice(req.user.sub, body.fcmToken);
  return sendSuccess(res, { removed });
}

/** GET /devices — danh sách thiết bị của tôi */
export async function list(req: Request, res: Response) {
  if (!req.user) throw AppError.unauthorized();

  const devices = await service.listUserDevices(req.user.sub);
  return sendSuccess(res, { devices });
}
