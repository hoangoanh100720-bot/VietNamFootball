/**
 * ============================================================================
 * COMPONENTS/COMMON/TEXT.TSX — CHỮ CÓ KỶ LUẬT
 * ============================================================================
 *
 * VÌ SAO KHÔNG DÙNG THẲNG <Text> CỦA REACT NATIVE?
 *
 * Vì khi đó mỗi màn hình sẽ tự chọn cỡ chữ, độ đậm, màu... theo cảm tính:
 *
 *   <Text style={{ fontSize: 16, color: '#888' }}>      ❌ màu thô, cỡ ngoài thang
 *   <Text style={{ fontSize: 17, fontWeight: '600' }}>  ❌ lặp lại ở 20 file
 *
 * Component này chỉ cho phép chọn trong danh sách kiểu ĐÃ ĐỊNH SẴN:
 *
 *   <AppText variant="h2">Đội hình ra sân</AppText>
 *   <AppText variant="caption" tone="muted">Cập nhật 5 phút trước</AppText>
 *
 * Kết quả: toàn app dùng chung một thang chữ, một bộ màu. Muốn chỉnh nhịp điệu
 * chữ của cả ứng dụng thì sửa đúng file này.
 */

import { Text as RNText, type TextProps, type TextStyle } from 'react-native';
import { useTheme } from '@/theme';

/** Các kiểu chữ được phép dùng — không có kiểu nào ngoài danh sách này */
export type TextVariant =
  | 'display'  // 40px — CHỈ dành cho tỷ số trực tiếp
  | 'h1'       // 28px — số liệu lớn
  | 'h2'       // 22px — tiêu đề màn hình
  | 'h3'       // 17px — tiêu đề thẻ
  | 'body'     // 15px — nội dung mặc định
  | 'bodyBold'
  | 'label'    // 13px — nhãn
  | 'caption'  // 13px — chú thích
  | 'overline'; // 11px IN HOA, giãn chữ — nhãn phần ("LỊCH THI ĐẤU")

/** Màu chữ — cũng chỉ chọn trong danh sách */
export type TextTone =
  | 'default' | 'muted' | 'faint' | 'inverse'
  | 'accent' | 'gold' | 'win' | 'draw' | 'lose';

interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  /** Bật cho MỌI con số cần thẳng hàng (tỷ số, bảng xếp hạng, %) */
  tabular?: boolean;
  center?: boolean;
}

export function AppText({
  variant = 'body',
  tone = 'default',
  tabular = false,
  center = false,
  style,
  children,
  ...rest
}: AppTextProps) {
  const t = useTheme();

  /**
   * Bảng tra kiểu chữ. Mỗi kiểu quy định đủ 3 yếu tố tạo phân cấp:
   * CỠ CHỮ + ĐỘ ĐẬM + ĐỘ CAO DÒNG.
   */
  const variantStyles: Record<TextVariant, TextStyle> = {
    display: {
      fontSize: t.fontSize.display,
      fontWeight: t.fontWeight.black,
      lineHeight: t.fontSize.display * t.lineHeight.tight,
      letterSpacing: -1, // số lớn thì siết chữ lại cho chắc chắn
    },
    h1: {
      fontSize: t.fontSize.xl,
      fontWeight: t.fontWeight.bold,
      lineHeight: t.fontSize.xl * t.lineHeight.tight,
      letterSpacing: -0.5,
    },
    h2: {
      fontSize: t.fontSize.lg,
      fontWeight: t.fontWeight.bold,
      lineHeight: t.fontSize.lg * t.lineHeight.snug,
      letterSpacing: -0.3,
    },
    h3: {
      fontSize: t.fontSize.md,
      fontWeight: t.fontWeight.semibold,
      lineHeight: t.fontSize.md * t.lineHeight.snug,
    },
    body: {
      fontSize: t.fontSize.base,
      fontWeight: t.fontWeight.regular,
      lineHeight: t.fontSize.base * t.lineHeight.normal,
    },
    bodyBold: {
      fontSize: t.fontSize.base,
      fontWeight: t.fontWeight.semibold,
      lineHeight: t.fontSize.base * t.lineHeight.normal,
    },
    label: {
      fontSize: t.fontSize.sm,
      fontWeight: t.fontWeight.medium,
      lineHeight: t.fontSize.sm * t.lineHeight.snug,
    },
    caption: {
      fontSize: t.fontSize.sm,
      fontWeight: t.fontWeight.regular,
      lineHeight: t.fontSize.sm * t.lineHeight.normal,
    },
    overline: {
      fontSize: t.fontSize.xs,
      fontWeight: t.fontWeight.bold,
      lineHeight: t.fontSize.xs * 1.4,
      // Chữ IN HOA nhỏ cần giãn ra mới dễ đọc — đây là quy tắc kinh điển
      letterSpacing: 0.8,
      textTransform: 'uppercase',
    },
  };

  const toneColors: Record<TextTone, string> = {
    default: t.colors.text,
    muted: t.colors.textMuted,
    faint: t.colors.textFaint,
    inverse: t.colors.textInverse,
    accent: t.colors.accentText, // dùng bản SÁNG để đủ tương phản
    gold: t.colors.gold,
    win: t.colors.win,
    draw: t.colors.draw,
    lose: t.colors.lose,
  };

  return (
    <RNText
      // Thứ tự gộp style rất quan trọng: `style` truyền vào đứng CUỐI
      // để component gọi có thể ghi đè khi thật sự cần.
      style={[
        variantStyles[variant],
        { color: toneColors[tone] },
        tabular && t.tabularNums,
        center && { textAlign: 'center' },
        style,
      ]}
      {...rest}
    >
      {children}
    </RNText>
  );
}
