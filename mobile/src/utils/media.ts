/**
 * ============================================================================
 * UTILS/MEDIA.TS — ĐỔI ĐƯỜNG DẪN ẢNH TƯƠNG ĐỐI THÀNH ĐẦY ĐỦ
 * ============================================================================
 *
 * Ảnh chân dung cầu thủ nằm TRÊN SERVER CỦA APP (backend/public/players), và
 * database lưu đường dẫn tương đối: "/static/players/nguyen-quang-hai.jpg".
 *
 * Vì sao không lưu sẵn "http://localhost:5000/static/..."?
 * Vì địa chỉ server khác nhau trên mỗi máy: localhost khi chạy web, IP mạng LAN
 * (192.168.x.x) khi chạy trên điện thoại thật, tên miền khi phát hành. Lưu
 * cứng một địa chỉ vào DB thì ảnh vỡ ở mọi môi trường còn lại.
 *
 * -> App tự ghép với ĐÚNG gốc server mà nó đang gọi API (EXPO_PUBLIC_API_URL).
 *    URL đầy đủ (logo cờ từ CDN…) thì giữ nguyên.
 * ============================================================================
 */

import { API_URL } from '@/api/client';

/** "http://192.168.1.10:5000/api/v1" -> "http://192.168.1.10:5000" */
const SERVER_ORIGIN = API_URL.replace(/^(https?:\/\/[^/]+).*$/, '$1');

export function resolveMediaUrl(uri: string | null | undefined): string | null {
  if (!uri) return null;
  return uri.startsWith('/') ? SERVER_ORIGIN + uri : uri;
}
