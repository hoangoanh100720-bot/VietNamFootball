/**
 * ============================================================================
 * COMPONENTS/COMMON/INPUT.TSX — Ô NHẬP LIỆU
 * ============================================================================
 *
 * NGUYÊN TẮC THIẾT KẾ FORM (áp dụng cho toàn dự án):
 *
 * 1. NHÃN NẰM TRÊN Ô NHẬP, không phải placeholder bên trong.
 *    Vì sao? Placeholder BIẾN MẤT khi người dùng bắt đầu gõ. Đang điền form
 *    dài mà quên ô này hỏi gì thì phải xoá hết đi để xem lại. Nhãn cố định
 *    luôn nhìn thấy được.
 *    Placeholder chỉ dùng cho VÍ DỤ: "vd: nguyenvana@gmail.com"
 *
 * 2. THÔNG BÁO LỖI NẰM NGAY DƯỚI Ô SAI, không gom thành cục ở đầu form.
 *    Mắt đang ở ô nào thì thấy lỗi của ô đó.
 *
 * 3. VIỀN TIÊU ĐIỂM (focus ring) PHẢI RÕ RÀNG.
 *    Người dùng luôn phải biết mình đang gõ vào ô nào — nhất là khi dùng
 *    bàn phím ngoài hoặc điều hướng bằng phím Tab.
 *
 * 4. BA TRẠNG THÁI VIỀN: bình thường / đang gõ / có lỗi. Mỗi trạng thái
 *    một màu riêng biệt.
 */

import { useState } from 'react';
import { Pressable, TextInput, View, type TextInputProps } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './Text';

interface InputProps extends TextInputProps {
  label: string;
  error?: string;
  /** Ô mật khẩu: hiện nút con mắt để bật/tắt che ký tự */
  isPassword?: boolean;
  icon?: keyof typeof Ionicons.glyphMap;
  hint?: string;
}

export function Input({
  label,
  error,
  isPassword = false,
  icon,
  hint,
  style,
  ...rest
}: InputProps) {
  const t = useTheme();

  const [isFocused, setIsFocused] = useState(false);
  const [isSecret, setIsSecret] = useState(isPassword);

  /**
   * Màu viền theo độ ưu tiên: LỖI > ĐANG GÕ > BÌNH THƯỜNG.
   * Lỗi luôn thắng, kể cả khi ô đang được chọn.
   */
  const borderColor = error
    ? t.colors.lose
    : isFocused
      ? t.colors.accent
      : t.colors.border;

  return (
    <View style={{ gap: 6 }}>
      {/* ---------- NHÃN (luôn hiển thị) ---------- */}
      <AppText variant="label" tone="muted">
        {label}
      </AppText>

      {/* ---------- KHUNG Ô NHẬP ---------- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          backgroundColor: t.colors.surfaceSunken,
          borderRadius: t.radius.md,
          borderWidth: isFocused || error ? 2 : 1, // viền DÀY hơn khi đang gõ
          borderColor,
          paddingHorizontal: t.spacing.md,
          height: 50,
        }}
      >
        {icon && (
          <Ionicons
            name={icon}
            size={18}
            color={isFocused ? t.colors.accentText : t.colors.textFaint}
          />
        )}

        <TextInput
          style={[
            {
              flex: 1,
              color: t.colors.text,
              fontSize: t.fontSize.base,
              paddingVertical: 0, // bỏ padding mặc định của Android
            },
            style,
          ]}
          placeholderTextColor={t.colors.textFaint}
          secureTextEntry={isSecret}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          // Báo cho trình đọc màn hình biết ô đang lỗi
          accessibilityLabel={label}
          accessibilityHint={error ?? hint}
          {...rest}
        />

        {/* ---------- NÚT HIỆN/ẨN MẬT KHẨU ---------- */}
        {isPassword && (
          <Pressable
            onPress={() => setIsSecret((v) => !v)}
            hitSlop={8} // mở rộng vùng chạm quanh icon nhỏ
            accessibilityRole="button"
            accessibilityLabel={isSecret ? 'Hiện mật khẩu' : 'Ẩn mật khẩu'}
          >
            <Ionicons
              name={isSecret ? 'eye-outline' : 'eye-off-outline'}
              size={18}
              color={t.colors.textFaint}
            />
          </Pressable>
        )}
      </View>

      {/* ---------- LỖI hoặc GỢI Ý ---------- */}
      {error ? (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
          {/* Có ICON kèm chữ, không chỉ đổi màu -> người mù màu vẫn nhận ra */}
          <Ionicons name="alert-circle" size={13} color={t.colors.lose} />
          <AppText variant="caption" tone="lose" style={{ flex: 1 }}>
            {error}
          </AppText>
        </View>
      ) : hint ? (
        <AppText variant="caption" tone="faint">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}
