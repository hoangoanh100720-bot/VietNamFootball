/**
 * ============================================================================
 * COMPONENTS/COMMON/ACCOUNTBUTTON.TSX — NÚT TÀI KHOẢN
 * ============================================================================
 *
 * Nút nhỏ ở góc phải tiêu đề màn hình chính. Hai trạng thái:
 *   • Chưa đăng nhập -> icon người, bấm vào mở màn hình đăng nhập
 *   • Đã đăng nhập   -> chữ cái đầu tên, bấm vào hỏi đăng xuất
 *
 * VÌ SAO KHÔNG LÀM HẲN MỘT TAB "TÀI KHOẢN"?
 * Vì app này chủ yếu để XEM thông tin công khai. Tài khoản chỉ phục vụ
 * thông báo bàn thắng. Dành trọn 25% thanh tab cho tính năng phụ là lãng phí
 * — bốn tab hiện tại đều là nội dung chính.
 */

import { Alert, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './Text';
import { useAuthStore } from '@/store/authStore';

export function AccountButton() {
  const t = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  const handlePress = () => {
    if (!user) {
      router.push('/(auth)/login');
      return;
    }

    // Alert.alert là hộp thoại gốc của hệ điều hành — dùng cho hành động
    // cần XÁC NHẬN. Đăng xuất nhầm rất khó chịu nên phải hỏi lại.
    Alert.alert(
      user.full_name,
      user.email,
      [
        { text: 'Đóng', style: 'cancel' },
        {
          text: 'Đăng xuất',
          // style 'destructive' -> iOS tự hiển thị chữ màu đỏ
          style: 'destructive',
          onPress: () => void logout(),
        },
      ],
      { cancelable: true }
    );
  };

  const initial = user?.full_name?.trim().charAt(0).toUpperCase() ?? '';

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={user ? `Tài khoản ${user.full_name}` : 'Đăng nhập'}
      style={({ pressed }) => ({
        width: 38,
        height: 38,
        borderRadius: t.radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: user ? t.colors.accent : t.colors.surfaceRaised,
        borderWidth: 1,
        borderColor: user ? t.colors.accent : t.colors.border,
        opacity: pressed ? 0.75 : 1,
      })}
    >
      {user ? (
        <AppText style={{ fontSize: 15, fontWeight: t.fontWeight.bold, color: t.colors.accentFg }}>
          {initial}
        </AppText>
      ) : (
        <Ionicons name="person-outline" size={18} color={t.colors.textMuted} />
      )}
    </Pressable>
  );
}
