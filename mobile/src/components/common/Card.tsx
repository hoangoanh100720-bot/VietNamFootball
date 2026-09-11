/**
 * ============================================================================
 * COMPONENTS/COMMON/CARD.TSX — THẺ, HUY HIỆU, HÀNG THÔNG TIN
 * ============================================================================
 *
 * TRIẾT LÝ THIẾT KẾ ĐÃ CHỌN CHO DỰ ÁN NÀY:
 * "Viền 1px + đổi nhẹ màu nền" thay vì "bóng đổ dưới mọi thứ".
 *
 * Vì sao? Ở chế độ tối, bóng đổ gần như vô hình (đen trên đen). Nhiều app
 * vẫn cố dùng bóng rồi tăng độ mờ lên -> thành một quầng xám bẩn.
 * Viền mảnh cho cạnh sắc nét, sạch sẽ, hiện đại.
 *
 * Bóng CHỈ dùng cho thứ thật sự nổi lên: thanh tab, hộp thoại, thông báo.
 */

import { Pressable, View, type ViewProps, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from './Text';

interface CardProps extends ViewProps {
  /** 'flat' = phẳng (mặc định) | 'raised' = nổi hơn | 'sunken' = lõm xuống */
  level?: 'flat' | 'raised' | 'sunken';
  padded?: boolean;
  onPress?: () => void;
  style?: ViewStyle;
}

export function Card({ level = 'flat', padded = true, onPress, style, children, ...rest }: CardProps) {
  const t = useTheme();

  const backgrounds = {
    flat: t.colors.surface,
    raised: t.colors.surfaceRaised,
    sunken: t.colors.surfaceSunken,
  };

  const baseStyle: ViewStyle = {
    backgroundColor: backgrounds[level],
    borderRadius: t.radius.lg,
    borderWidth: 1,
    borderColor: t.colors.border,
    padding: padded ? t.spacing.lg : 0,
    overflow: 'hidden', // để nội dung bên trong không tràn qua góc bo
  };

  // Thẻ bấm được thì phải có phản hồi khi nhấn
  if (onPress) {
    return (
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        style={({ pressed }) => [
          baseStyle,
          pressed && {
            backgroundColor: t.colors.surfaceRaised,
            transform: [{ scale: 0.995 }], // co lại rất nhẹ, đủ để cảm nhận
          },
          style,
        ]}
      >
        {children}
      </Pressable>
    );
  }

  return (
    <View style={[baseStyle, style]} {...rest}>
      {children}
    </View>
  );
}

// ===========================================================================
// HUY HIỆU (BADGE)
// ===========================================================================
export type BadgeTone = 'neutral' | 'accent' | 'live' | 'win' | 'draw' | 'lose' | 'gold';

/**
 * Huy hiệu nhỏ dạng viên thuốc: "ĐANG ĐÁ", "T", "H", "B", "AI".
 *
 * ⭐ Chú ý nguyên tắc tiếp cận: badge LUÔN có CHỮ bên trong, không bao giờ
 * chỉ là một chấm màu. Người mù màu vẫn phải đọc được thông tin.
 */
export function Badge({
  label,
  tone = 'neutral',
  size = 'md',
}: {
  label: string;
  tone?: BadgeTone;
  size?: 'sm' | 'md';
}) {
  const t = useTheme();

  /** Mỗi tone gồm cặp: nền nhạt + chữ đậm cùng sắc -> hài hoà, dễ đọc */
  const tones: Record<BadgeTone, { bg: string; fg: string }> = {
    neutral: { bg: t.colors.surfaceRaised, fg: t.colors.textMuted },
    accent: { bg: t.colors.accentSoft, fg: t.colors.accentText },
    live: { bg: t.colors.accent, fg: '#FFFFFF' }, // nền ĐẶC để nổi bật nhất app
    win: { bg: t.colors.winSoft, fg: t.colors.win },
    draw: { bg: t.colors.drawSoft, fg: t.colors.draw },
    lose: { bg: t.colors.loseSoft, fg: t.colors.lose },
    gold: { bg: t.colors.goldSoft, fg: t.colors.gold },
  };

  const { bg, fg } = tones[tone];
  const isSmall = size === 'sm';

  return (
    <View
      style={{
        backgroundColor: bg,
        paddingHorizontal: isSmall ? t.spacing.sm : t.spacing.md,
        paddingVertical: isSmall ? 2 : 4,
        borderRadius: t.radius.pill,
        alignSelf: 'flex-start',
      }}
    >
      <AppText
        style={{
          fontSize: isSmall ? 10 : t.fontSize.xs,
          fontWeight: t.fontWeight.bold,
          color: fg,
          letterSpacing: 0.5,
        }}
      >
        {label}
      </AppText>
    </View>
  );
}

// ===========================================================================
// HÀNG THÔNG TIN (nhãn bên trái — giá trị bên phải)
// ===========================================================================
/**
 * Dùng cho hồ sơ cầu thủ, chi tiết trận đấu:
 *
 *   Quê quán            Đông Anh, Hà Nội
 *   Chiều cao                     168 cm
 *   Giá trị                     500 N €
 *
 * Giá trị căn PHẢI: mắt dễ so sánh theo cột dọc hơn là căn trái.
 */
export function InfoRow({
  label,
  value,
  tabular = false,
  last = false,
}: {
  label: string;
  value: string | number;
  tabular?: boolean;
  last?: boolean;
}) {
  const t = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: t.spacing.md,
        // Không kẻ vạch dưới hàng cuối -> tránh "đường thừa" sát mép thẻ
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
        gap: t.spacing.lg,
      }}
    >
      <AppText variant="body" tone="muted">
        {label}
      </AppText>
      <AppText
        variant="bodyBold"
        tabular={tabular}
        style={{ flexShrink: 1, textAlign: 'right' }}
      >
        {value}
      </AppText>
    </View>
  );
}

/**
 * TIÊU ĐỀ PHẦN — chữ IN HOA nhỏ, màu mờ.
 *
 * Quyết định thiết kế: dùng cỡ 11px in hoa + màu mờ thay vì cỡ chữ to.
 * Nhãn phần là thứ để LƯỚT QUA, không phải để đọc kỹ, nên nó cần "im lặng"
 * và nhường sự chú ý cho nội dung bên dưới.
 */
export function SectionHeader({
  title,
  action,
}: {
  title: string;
  action?: React.ReactNode;
}) {
  const t = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: t.spacing.md,
        // Khoảng cách TRÊN gấp đôi khoảng cách DƯỚI -> tiêu đề "dính" vào
        // nội dung của nó, tách khỏi phần phía trên. Đây chính là nguyên tắc
        // "khoảng cách tạo phân cấp".
        marginTop: t.spacing.xl,
      }}
    >
      <AppText variant="overline" tone="muted">
        {title}
      </AppText>
      {action}
    </View>
  );
}
