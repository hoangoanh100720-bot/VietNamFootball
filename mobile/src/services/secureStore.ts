/**
 * ============================================================================
 * SERVICES/SECURESTORE.TS — CẤT GIỮ TOKEN AN TOÀN
 * ============================================================================
 *
 * ⚠️ VÌ SAO KHÔNG DÙNG AsyncStorage CHO TOKEN?
 *
 * AsyncStorage lưu dữ liệu dưới dạng VĂN BẢN THUẦN trong thư mục của app.
 * Trên máy đã root/jailbreak, hoặc qua bản sao lưu, người khác đọc được hết.
 *
 * expo-secure-store thì khác — nó dùng kho bảo mật của chính hệ điều hành:
 *   • iOS     : Keychain (được mã hoá bằng chip bảo mật Secure Enclave)
 *   • Android : Keystore (khoá nằm trong vùng phần cứng tách biệt)
 *
 * QUY TẮC CHO CẢ DỰ ÁN:
 *   Token, mật khẩu, dữ liệu nhạy cảm  -> SecureStore (file này)
 *   Cài đặt giao diện, cache dữ liệu   -> AsyncStorage (không sao)
 *
 * ----------------------------------------------------------------------------
 * LƯU Ý VỀ NỀN TẢNG WEB:
 * SecureStore KHÔNG chạy trên trình duyệt. Khi chạy `npm run web` để xem thử,
 * ta lùi về localStorage. Điều này CHỈ chấp nhận được cho môi trường dev.
 */

import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

/** Tên khoá lưu trữ — gom vào một chỗ để không gõ sai chuỗi ở nhiều nơi */
const KEYS = {
  ACCESS_TOKEN: 'vnf_access_token',
  REFRESH_TOKEN: 'vnf_refresh_token',
  USER: 'vnf_user',
} as const;

const isWeb = Platform.OS === 'web';

/** Ghi một giá trị */
async function setItem(key: string, value: string): Promise<void> {
  if (isWeb) {
    localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

/** Đọc một giá trị, trả null nếu chưa có */
async function getItem(key: string): Promise<string | null> {
  if (isWeb) return localStorage.getItem(key);
  return SecureStore.getItemAsync(key);
}

/** Xoá một giá trị */
async function removeItem(key: string): Promise<void> {
  if (isWeb) {
    localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

// ---------------------------------------------------------------------------
// API CÔNG KHAI — phần còn lại của app chỉ dùng những hàm dưới đây
// ---------------------------------------------------------------------------

/** Lưu cả cặp token sau khi đăng nhập/đăng ký thành công */
export async function saveTokens(accessToken: string, refreshToken: string): Promise<void> {
  // Promise.all để hai lệnh ghi chạy song song, nhanh gấp đôi
  await Promise.all([
    setItem(KEYS.ACCESS_TOKEN, accessToken),
    setItem(KEYS.REFRESH_TOKEN, refreshToken),
  ]);
}

export async function getAccessToken(): Promise<string | null> {
  return getItem(KEYS.ACCESS_TOKEN);
}

export async function getRefreshToken(): Promise<string | null> {
  return getItem(KEYS.REFRESH_TOKEN);
}

/** Lưu hồ sơ người dùng để lần mở app sau hiển thị được ngay, chưa cần gọi API */
export async function saveUser(user: unknown): Promise<void> {
  await setItem(KEYS.USER, JSON.stringify(user));
}

export async function getUser<T>(): Promise<T | null> {
  const raw = await getItem(KEYS.USER);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as T;
  } catch {
    // Dữ liệu hỏng (do đổi cấu trúc, do ghi dở dang) -> dọn đi, coi như chưa có
    await removeItem(KEYS.USER);
    return null;
  }
}

/** Xoá sạch khi đăng xuất — PHẢI xoá đủ cả ba khoá */
export async function clearAuth(): Promise<void> {
  await Promise.all([
    removeItem(KEYS.ACCESS_TOKEN),
    removeItem(KEYS.REFRESH_TOKEN),
    removeItem(KEYS.USER),
  ]);
}
