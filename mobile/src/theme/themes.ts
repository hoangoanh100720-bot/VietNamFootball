/**
 * ============================================================================
 * THEME/THEMES.TS — GỘP BẢNG MÀU GỐC VỚI THEME SỰ KIỆN
 * ============================================================================
 *
 * ARCHITECTURE.md mục 6.4. Một hàm thuần duy nhất: buildPalette(gốc, ghi đè).
 *
 *   darkColors (40 token)  +  theme "Tết" { accent, accentText, gold }
 *                          ↓
 *   bảng màu mới: 37 token GIỮ NGUYÊN, 3 token đổi sang màu Tết
 *
 * ----------------------------------------------------------------------------
 * 🔐 VÌ SAO LỌC LẠI Ở APP khi server ĐÃ lọc rồi?
 *
 * Phòng thủ hai lớp. Server lọc bằng THEMABLE_KEYS của NÓ. Nhưng app đã phát
 * hành thì nằm trên máy người dùng hàng tháng trời, trong khi server có thể
 * được cập nhật bất cứ lúc nào. Nếu một ngày server (vô tình hay có lỗi) gửi
 * về { text: '#DA251D' }, bản app cũ vẫn phải từ chối — nếu không cả app
 * sẽ chữ đỏ trên nền đỏ và KHÔNG CÓ CÁCH NÀO sửa ngoài phát hành bản mới.
 *
 * Nguyên tắc: dữ liệu từ mạng là dữ liệu KHÔNG ĐÁNG TIN, kể cả từ server nhà.
 * ============================================================================
 */

import type { ColorPalette } from './colors';

/**
 * ⭐ DANH SÁCH TRẮNG — PHẢI KHỚP với backend/src/modules/themes/themes.service.ts.
 *
 * Nằm ngoài danh sách (không bao giờ bị theme đổi):
 *   bg, surface*, text*, border*   -> chữ luôn đọc được
 *   win / draw / lose              -> ý nghĩa kết quả không bị đảo
 *   rating*                        -> thang điểm cầu thủ nhất quán
 *   bamboo*                        -> bản sắc tre của app giữ nguyên qua mọi mùa lễ
 */
export const THEMABLE_KEYS = [
  'accent', 'accentText', 'accentSoft', 'accentFg',
  'gold', 'goldSoft', 'pitch', 'pitchStripe',
] as const satisfies ReadonlyArray<keyof ColorPalette>;

const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Gộp bảng màu gốc với phần ghi đè của theme.
 *
 * @param base     darkColors hoặc lightColors
 * @param override palette_dark hoặc palette_light nhận từ server; undefined = không có theme
 *
 * ⚠️ `satisfies` ở THEMABLE_KEYS phía trên bảo đảm lúc BIÊN DỊCH rằng mọi khoá
 * trong danh sách trắng đều thật sự tồn tại trong ColorPalette. Ai đó đổi tên
 * token `accentSoft` trong colors.ts mà quên sửa ở đây -> TypeScript báo lỗi
 * ngay, thay vì theme lặng lẽ không áp dụng được màu đó.
 */
export function buildPalette(
  base: ColorPalette,
  override?: Record<string, string> | null
): ColorPalette {
  if (!override) return base;

  const safe: Partial<ColorPalette> = {};
  for (const key of THEMABLE_KEYS) {
    const value = override[key];
    // Bỏ qua mọi giá trị không phải HEX 6 ký tự: "red", "#FFF", "rgba(...)", chuỗi rỗng
    if (typeof value === 'string' && HEX.test(value)) safe[key] = value;
  }

  /**
   * Không có token hợp lệ nào -> trả về ĐÚNG object gốc (cùng tham chiếu).
   * Nhờ vậy useMemo phía trên nhận ra "không có gì đổi" và không bắt cả app
   * render lại chỉ vì một theme rỗng.
   */
  return Object.keys(safe).length === 0 ? base : { ...base, ...safe };
}
