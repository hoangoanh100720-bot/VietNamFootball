/**
 * ============================================================================
 * COMPONENTS/COMMON/ACCOUNTBUTTON.TSX — NÚT TÀI KHOẢN
 * ============================================================================
 *
 * Nút nhỏ ở góc phải tiêu đề màn hình chính. Hai trạng thái:
 *   • Chưa đăng nhập -> icon người, bấm vào mở màn hình đăng nhập
 *   • Đã đăng nhập   -> chữ cái đầu tên
 *
 * Chạm vào -> mở màn hình Cài đặt (app/settings.tsx).
 *
 * VÌ SAO KHÔNG LÀM HẲN MỘT TAB "TÀI KHOẢN"?
 * Vì app này chủ yếu để XEM thông tin công khai. Tài khoản chỉ phục vụ
 * thông báo bàn thắng. Dành trọn một ô tab cho tính năng phụ là lãng phí —
 * năm tab hiện tại đều là nội dung chính.
 *
 * ⚠️ NGOẠI LỆ: ở Senior mode, Cài đặt trở thành MỘT TRONG BA TAB
 * (ARCHITECTURE.md mục 7.3), vì người lớn tuổi khó tìm nút nhỏ ở góc màn hình.
 */

import { Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './Text';
import { useAuthStore } from '@/store/authStore';

export function AccountButton() {
  const t = useTheme();
  const router = useRouter();

  const user = useAuthStore((s) => s.user);

  /**
   * ⭐ CHẠM VÀO ẢNH ĐẠI DIỆN -> MỞ MÀN HÌNH CÀI ĐẶT.
   *
   * Đây chính là mẫu mà App Store dùng: ảnh đại diện ở góc phải là cửa vào
   * mọi thứ thuộc về "tôi" — tài khoản, giao diện, thông báo.
   *
   * 🐛 BẢN TRƯỚC HIỆN MỘT HỘP THOẠI CHỈ CÓ "ĐĂNG XUẤT" — và đó là thiết kế sai:
   * người dùng chạm vào avatar để TÌM CÀI ĐẶT, không phải để đăng xuất. Đưa
   * hành động phá huỷ nhất lên làm lựa chọn duy nhất là mời họ bấm nhầm.
   *
   * Giờ đăng xuất nằm ở cuối màn hình Cài đặt, đúng chỗ của nó.
   */
  const handlePress = () => {
    // Chưa đăng nhập vẫn vào Cài đặt được — ở đó có sẵn nút đăng nhập,
    // và các mục giao diện/senior mode không hề cần tài khoản.
    router.push('/settings');
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
