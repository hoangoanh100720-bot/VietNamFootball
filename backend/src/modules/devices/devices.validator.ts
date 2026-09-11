/** MODULES/DEVICES/DEVICES.VALIDATOR.TS */
import { z } from 'zod';

export const registerDeviceSchema = z.object({
  // Token FCM thật dài khoảng 140-200 ký tự. Đặt khoảng rộng để không chặn
  // nhầm khi Firebase đổi định dạng, nhưng vẫn có trần chống spam dữ liệu rác.
  fcmToken: z
    .string()
    .trim()
    .min(20, 'Token thiết bị không hợp lệ')
    .max(4096, 'Token thiết bị quá dài'),

  platform: z.enum(['ios', 'android', 'web'], {
    errorMap: () => ({ message: 'Nền tảng phải là ios, android hoặc web' }),
  }),
});

export const unregisterDeviceSchema = z.object({
  fcmToken: z.string().trim().min(20, 'Token thiết bị không hợp lệ'),
});

export type RegisterDeviceBody = z.infer<typeof registerDeviceSchema>;
export type UnregisterDeviceBody = z.infer<typeof unregisterDeviceSchema>;
