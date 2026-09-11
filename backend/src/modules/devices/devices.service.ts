/**
 * ============================================================================
 * MODULES/DEVICES/DEVICES.SERVICE.TS — QUẢN LÝ THIẾT BỊ NHẬN THÔNG BÁO
 * ============================================================================
 *
 * TOKEN THIẾT BỊ LÀ GÌ?
 * Là "địa chỉ nhà" mà Firebase cấp cho mỗi lần cài app trên mỗi máy.
 * Server muốn gửi thông báo tới ai thì phải biết địa chỉ đó.
 *
 * BA ĐIỀU CẦN BIẾT VỀ TOKEN:
 *
 * 1. MỘT NGƯỜI CÓ THỂ CÓ NHIỀU TOKEN
 *    Cùng một tài khoản đăng nhập trên điện thoại và máy tính bảng
 *    -> hai token khác nhau, cả hai đều phải nhận được thông báo.
 *
 * 2. TOKEN CÓ THỂ ĐỔI CHỦ
 *    Người A đăng xuất, người B đăng nhập trên cùng máy -> vẫn token đó
 *    nhưng giờ thuộc về B. Phải CẬP NHẬT user_id, không được tạo bản ghi mới,
 *    nếu không A vẫn nhận được thông báo trên máy của B (lỗi rò rỉ riêng tư!).
 *
 * 3. TOKEN CÓ THỂ CHẾT BẤT CỨ LÚC NÀO
 *    Gỡ app, xoá dữ liệu app, không dùng lâu quá -> Firebase thu hồi.
 *    notification.service.ts tự dọn những token này khi gửi thất bại.
 */

import { query } from '@/config/database';
import { logger } from '@/utils/logger';

export interface RegisterDeviceInput {
  userId: number;
  fcmToken: string;
  platform: 'ios' | 'android' | 'web';
}

/**
 * ĐĂNG KÝ (hoặc cập nhật) một thiết bị.
 *
 * Dùng UPSERT với điều kiện xung đột là fcm_token (cột đã có UNIQUE
 * trong migration 001). Nhờ đó:
 *   - Token mới      -> thêm bản ghi
 *   - Token đã có    -> cập nhật user_id + thời điểm dùng gần nhất
 * Giải quyết trọn vẹn tình huống số 2 nêu ở đầu file.
 */
export async function registerDevice(input: RegisterDeviceInput) {
  const { rows } = await query<{ id: number; created_at: Date }>(
    `INSERT INTO device_tokens (user_id, fcm_token, platform, last_used_at)
     VALUES ($1, $2, $3, NOW())
     ON CONFLICT (fcm_token) DO UPDATE SET
       user_id      = EXCLUDED.user_id,
       platform     = EXCLUDED.platform,
       last_used_at = NOW()
     RETURNING id, created_at`,
    [input.userId, input.fcmToken, input.platform]
  );

  // ⚠️ KHÔNG log nội dung token — nó cho phép gửi thông báo tới máy người dùng
  logger.info('Đã đăng ký thiết bị nhận thông báo', {
    userId: input.userId,
    platform: input.platform,
  });

  return rows[0]!;
}

/**
 * HUỶ ĐĂNG KÝ — gọi khi người dùng đăng xuất hoặc tắt thông báo.
 *
 * Bắt buộc kiểm tra CẢ user_id: nếu chỉ lọc theo token, kẻ xấu biết token
 * của người khác có thể tắt thông báo của họ.
 */
export async function unregisterDevice(userId: number, fcmToken: string): Promise<boolean> {
  const { rowCount } = await query(
    'DELETE FROM device_tokens WHERE user_id = $1 AND fcm_token = $2',
    [userId, fcmToken]
  );
  return rowCount > 0;
}

/** Danh sách thiết bị của một người dùng — để màn hình cài đặt hiển thị */
export async function listUserDevices(userId: number) {
  const { rows } = await query<{
    id: number; platform: string; created_at: Date; last_used_at: Date | null;
  }>(
    `SELECT id, platform, created_at, last_used_at
     FROM device_tokens
     WHERE user_id = $1
     ORDER BY last_used_at DESC NULLS LAST`,
    [userId]
  );

  // KHÔNG trả fcm_token về client — client đã có token của chính nó rồi,
  // và trả về sẽ làm lộ token của các thiết bị khác.
  return rows;
}
