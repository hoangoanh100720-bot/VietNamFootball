/**
 * ============================================================================
 * COMPONENTS/COMMON/BUTTON.TSX — NÚT BẤM
 * ============================================================================
 *
 * MỘT NÚT TỬ TẾ PHẢI XỬ LÝ ĐỦ 4 TRẠNG THÁI. Người mới thường chỉ làm cái đầu:
 *
 *   1. Bình thường  — nhìn là biết bấm được
 *   2. Đang nhấn    — phản hồi tức thì (đổi màu + thu nhỏ + rung nhẹ)
 *   3. Đang xử lý   — hiện vòng quay, KHOÁ không cho bấm tiếp
 *                     (không có bước này, người dùng bấm 5 lần -> 5 tài khoản!)
 *   4. Bị vô hiệu   — mờ đi VÀ phải có lý do đi kèm ở đâu đó
 *
 * VỀ PHẢN HỒI XÚC GIÁC (haptic):
 * Rung nhẹ khi bấm làm nút "có cảm giác thật". Nhưng chỉ dùng cho hành động
 * QUAN TRỌNG (đăng nhập, gửi form). Rung mọi thứ thì thành phiền.
 */

import { ActivityIndicator, Pressable, View, type ViewStyle } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './Text';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  fullWidth?: boolean;
  haptic?: boolean;
  style?: ViewStyle;
}

export function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
  haptic = true,
  style,
}: ButtonProps) {
  const t = useTheme();

  // Đang tải cũng coi như bị khoá -> chặn bấm hai lần
  const isDisabled = disabled || loading;

  /** Chiều cao và lề trong theo kích cỡ. Chiều cao tối thiểu 44px = chuẩn vùng chạm. */
  const sizeStyles: Record<ButtonSize, ViewStyle> = {
    sm: { height: 36, paddingHorizontal: t.spacing.md },
    md: { height: 48, paddingHorizontal: t.spacing.lg },
    lg: { height: 56, paddingHorizontal: t.spacing.xl },
  };

  /** Màu nền + màu viền theo biến thể */
  const variantStyles: Record<ButtonVariant, ViewStyle> = {
    primary: { backgroundColor: t.colors.accent },
    secondary: {
      backgroundColor: t.colors.surfaceRaised,
      borderWidth: 1,
      borderColor: t.colors.borderStrong,
    },
    ghost: { backgroundColor: 'transparent' },
    danger: { backgroundColor: t.colors.lose },
  };

  /** Màu chữ tương ứng — phải tương phản đủ với nền ở trên */
  const textColors: Record<ButtonVariant, string> = {
    primary: t.colors.accentFg,
    secondary: t.colors.text,
    ghost: t.colors.accentText,
    danger: '#FFFFFF',
  };

  const textSize = size === 'sm' ? t.fontSize.sm : t.fontSize.base;

  return (
    <Pressable
      onPress={() => {
        if (isDisabled) return;
        // Rung nhẹ TRƯỚC khi xử lý -> cảm giác phản hồi tức thì
        if (haptic) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        onPress();
      }}
      disabled={isDisabled}
      // Hỗ trợ trình đọc màn hình cho người khiếm thị
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      /**
       * `style` của Pressable nhận được HÀM với tham số { pressed }.
       * Đây là cách React Native thể hiện trạng thái "đang nhấn".
       */
      style={({ pressed }) => [
        {
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.spacing.sm,
          borderRadius: t.radius.md,
          ...sizeStyles[size],
          ...variantStyles[variant],
          width: fullWidth ? '100%' : undefined,

          // Trạng thái 4: mờ đi khi bị khoá
          opacity: isDisabled ? 0.5 : 1,

          // Trạng thái 2: thu nhỏ 2% + mờ nhẹ khi đang nhấn.
          // Chỉ dùng transform + opacity vì hai thuộc tính này chạy trên
          // luồng đồ hoạ -> luôn mượt, không làm bố cục tính lại.
          transform: [{ scale: pressed && !isDisabled ? 0.98 : 1 }],
        },
        pressed && !isDisabled && { opacity: 0.9 },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColors[variant]} />
      ) : (
        <>
          {icon && <Ionicons name={icon} size={18} color={textColors[variant]} />}
          <AppText
            style={{
              fontSize: textSize,
              fontWeight: t.fontWeight.semibold,
              color: textColors[variant],
            }}
          >
            {label}
          </AppText>
        </>
      )}
    </Pressable>
  );
}

/**
 * NÚT BIỂU TƯỢNG TRÒN — dùng cho nút quay lại, nút làm mới trên thanh tiêu đề.
 * Kích thước 44px là mức tối thiểu để ngón tay bấm không trượt.
 */
export function IconButton({
  icon,
  onPress,
  size = 44,
  color,
  accessibilityLabel,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  size?: number;
  color?: string;
  accessibilityLabel: string; // BẮT BUỘC: nút chỉ có icon thì trình đọc màn hình
                              // không biết nó làm gì nếu thiếu nhãn này
}) {
  const t = useTheme();

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      style={({ pressed }) => ({
        width: size,
        height: size,
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? t.colors.surfaceRaised : 'transparent',
      })}
    >
      <Ionicons name={icon} size={size * 0.5} color={color ?? t.colors.text} />
    </Pressable>
  );
}

/** Khoảng trống dọc — dùng thay cho margin lung tung */
export function Spacer({ size = 16 }: { size?: number }) {
  return <View style={{ height: size }} />;
}
