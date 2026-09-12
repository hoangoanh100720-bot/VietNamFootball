/**
 * ============================================================================
 * THEME/INDEX.TS — CUNG CẤP THEME CHO TOÀN APP
 * ============================================================================
 *
 * VẤN ĐỀ: component nằm sâu 5 tầng cũng cần biết màu nền là gì.
 * Truyền props qua từng tầng (gọi là "prop drilling") thì cực kỳ mệt.
 *
 * GIẢI PHÁP: React Context — như một "đường ống" xuyên qua mọi tầng.
 *   1. Bọc toàn app trong <ThemeProvider>
 *   2. Bất kỳ component nào gọi useTheme() là lấy được ngay
 *
 * Cách dùng trong component:
 *
 *   const { colors, spacing } = useTheme();
 *   <View style={{ backgroundColor: colors.surface, padding: spacing.lg }} />
 */

import { createContext, useContext, useMemo, type ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { darkColors, lightColors, staticColors, type ColorPalette } from './colors';
import {
  duration, fontFamily, fontSize, fontWeight,
  lineHeight, radius, shadow, spacing, tabularNums,
  seniorFontSize, seniorSpacing,
  TOUCH_TARGET, SENIOR_TOUCH_TARGET, MAX_FONT_SCALE, SENIOR_MAX_FONT_SCALE,
} from './tokens';
import { useSettingsStore } from '@/store/settingsStore';

export interface Theme {
  colors: ColorPalette;
  static: typeof staticColors;

  /**
   * ⚠️ VÌ SAO `Record<keyof typeof spacing, number>` CHỨ KHÔNG PHẢI
   *    `typeof spacing`?
   *
   * Vì `spacing` khai bằng `as const`, nên TypeScript hiểu kiểu của nó là
   * `{ xs: 4, sm: 8, ... }` — tức là "xs BẮT BUỘC phải đúng bằng 4".
   *
   * Với bộ token thường thì không sao, nhưng senior mode có `xs: 5`, và
   * TypeScript sẽ báo: "Type '5' is not assignable to type '4'".
   *
   * `Record<keyof typeof spacing, number>` giữ nguyên DANH SÁCH KHOÁ (xs, sm,
   * md…) — nên gõ sai tên token vẫn bị bắt lỗi — nhưng nới GIÁ TRỊ thành
   * `number` bất kỳ, để cả hai bộ token đều lắp vừa.
   *
   * 👉 Đây là cách giữ được phần kiểm tra có ích (tên khoá) và bỏ phần
   *    cản trở (giá trị cụ thể).
   */
  spacing: Record<keyof typeof spacing, number>;
  radius: typeof radius;
  shadow: typeof shadow;
  fontSize: Record<keyof typeof fontSize, number>;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  fontFamily: typeof fontFamily;
  tabularNums: typeof tabularNums;
  duration: typeof duration;
  /** Vùng chạm tối thiểu (pt): 44 thường, 56 ở chế độ người lớn tuổi */
  touchTarget: number;
  /** Trần phóng chữ theo cài đặt hệ điều hành: 1.3 thường, 1.6 senior */
  maxFontScale: number;
  isDark: boolean;
  /**
   * ⭐ Đang ở chế độ người lớn tuổi (ARCHITECTURE.md mục 7).
   *
   * Phần lớn component KHÔNG cần đọc cờ này — chữ và khoảng cách đã tự to lên
   * nhờ token. Chỉ dùng khi cần đổi HÀNH VI, ví dụ: ẩn bớt số liệu phụ, thay
   * cử chỉ vuốt bằng nút bấm, tắt hiệu ứng chuyển động.
   */
  isSenior: boolean;
}

/**
 * Giá trị mặc định là chế độ tối. Nếu quên bọc ThemeProvider, app vẫn chạy
 * chứ không sập — nhưng nhớ là PHẢI bọc ở app/_layout.tsx.
 */
const ThemeContext = createContext<Theme | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  /**
   * useColorScheme() đọc cài đặt Sáng/Tối của HỆ ĐIỀU HÀNH và tự cập nhật
   * khi người dùng đổi. Nhờ app.json đặt "userInterfaceStyle": "automatic",
   * app sẽ đổi theo điện thoại mà không cần code thêm gì.
   */
  const systemScheme = useColorScheme();

  /**
   * ⭐ Lựa chọn của NGƯỜI DÙNG luôn thắng cài đặt hệ điều hành.
   *
   * Ba trạng thái:
   *   'system' — đi theo điện thoại (mặc định)
   *   'light'  — người dùng chủ động chọn Sáng
   *   'dark'   — người dùng chủ động chọn Tối
   *
   * Vì sao phải cho chọn tay khi đã có 'system'? Vì nhiều người để máy ở chế
   * độ sáng ban ngày nhưng vẫn muốn app bóng đá luôn tối — họ xem bóng đá
   * buổi tối. Ép theo hệ thống là tước mất lựa chọn đó.
   */
  const preference = useSettingsStore((s) => s.colorScheme);
  const isSenior = useSettingsStore((s) => s.isSenior);

  const isDark =
    preference === 'system'
      ? systemScheme !== 'light' // mặc định TỐI khi không xác định được
      : preference === 'dark';

  /**
   * useMemo: chỉ tạo lại object theme khi isDark đổi.
   * Không có nó, mỗi lần render lại sinh object mới -> MỌI component dùng
   * useTheme đều render lại vô ích -> app giật.
   */
  const value = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      static: staticColors,

      /**
       * ⭐ ĐÂY LÀ TOÀN BỘ PHÉP MÀU CỦA SENIOR MODE.
       *
       * Chỉ cần TRÁO hai bộ token, mọi component trong app tự động chuyển sang
       * chữ to và khoảng cách rộng — mà KHÔNG component nào phải sửa một dòng.
       *
       * Component vẫn viết `t.fontSize.base` như cũ; nó chỉ không biết rằng
       * con số nhận về là 20 thay vì 15.
       *
       * 👉 Đây là lợi ích lớn nhất của hệ thống token: đổi cả diện mạo app
       *    bằng một dòng điều kiện, thay vì sửa 40 file.
       */
      fontSize: isSenior ? seniorFontSize : fontSize,
      spacing: isSenior ? seniorSpacing : spacing,

      radius, shadow,
      fontWeight, lineHeight, fontFamily, tabularNums,
      duration,

      /** Vùng chạm tối thiểu — 44pt thường, 56pt cho người lớn tuổi */
      touchTarget: isSenior ? SENIOR_TOUCH_TARGET : TOUCH_TARGET,
      /** Trần phóng chữ theo cài đặt hệ điều hành */
      maxFontScale: isSenior ? SENIOR_MAX_FONT_SCALE : MAX_FONT_SCALE,

      isDark,
      /** Component đọc cờ này khi cần đổi HÀNH VI, không chỉ đổi kích thước */
      isSenior,
    }),
    [isDark, isSenior]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

/** Hook lấy theme. Dùng ở mọi component. */
export function useTheme(): Theme {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme phải được dùng bên trong <ThemeProvider>');
  }
  return ctx;
}

// Xuất lại để nơi khác import gọn hơn
export { darkColors, lightColors, staticColors };
export type { ColorPalette };
export * from './tokens';
