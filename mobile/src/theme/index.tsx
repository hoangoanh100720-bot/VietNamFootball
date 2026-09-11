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
} from './tokens';

export interface Theme {
  colors: ColorPalette;
  static: typeof staticColors;
  spacing: typeof spacing;
  radius: typeof radius;
  shadow: typeof shadow;
  fontSize: typeof fontSize;
  fontWeight: typeof fontWeight;
  lineHeight: typeof lineHeight;
  fontFamily: typeof fontFamily;
  tabularNums: typeof tabularNums;
  duration: typeof duration;
  isDark: boolean;
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
  const scheme = useColorScheme();
  const isDark = scheme !== 'light'; // mặc định TỐI khi không xác định được

  /**
   * useMemo: chỉ tạo lại object theme khi isDark đổi.
   * Không có nó, mỗi lần render lại sinh object mới -> MỌI component dùng
   * useTheme đều render lại vô ích -> app giật.
   */
  const value = useMemo<Theme>(
    () => ({
      colors: isDark ? darkColors : lightColors,
      static: staticColors,
      spacing, radius, shadow,
      fontSize, fontWeight, lineHeight, fontFamily, tabularNums,
      duration,
      isDark,
    }),
    [isDark]
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
