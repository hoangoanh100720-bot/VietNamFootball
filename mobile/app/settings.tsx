/**
 * ============================================================================
 * APP/SETTINGS.TSX — MÀN HÌNH CÀI ĐẶT
 * ============================================================================
 *
 * Đặc tả: ARCHITECTURE.md mục 5.5
 *
 * Mở từ ảnh đại diện ở góc phải mỗi tab — giống nút tài khoản của App Store.
 *
 * ----------------------------------------------------------------------------
 * 🗂️ VÌ SAO KHÔNG LÀM CÀI ĐẶT THÀNH MỘT TAB RIÊNG?
 *
 * Vì thanh tab chỉ nên chứa những nơi người dùng ĐI LẠI THƯỜNG XUYÊN. Cài đặt
 * thì mỗi tháng mở một lần — chiếm một ô tab vĩnh viễn cho nó là lãng phí
 * 20% diện tích điều hướng.
 *
 * ⚠️ NGOẠI LỆ: ở Senior mode, Cài đặt TRỞ THÀNH một trong ba tab (mục 7.3).
 * Người lớn tuổi khó tìm nút nhỏ ở góc màn hình, nên với họ thì việc dễ tìm
 * quan trọng hơn việc tiết kiệm chỗ.
 *
 * ----------------------------------------------------------------------------
 * 📐 CÁCH NHÓM CÁC MỤC
 *
 * Gom theo CÂU HỎI người dùng đang có trong đầu, không gom theo cấu trúc code:
 *
 *   TÀI KHOẢN — "thông tin của tôi"
 *   GIAO DIỆN — "app trông thế nào"
 *   KHÁC      — "những thứ còn lại"
 *
 * Danh sách 15 mục phẳng lì thì không ai tìm thấy gì. Ba nhóm 3-5 mục thì
 * mắt lướt qua là biết phải nhìn vào đâu.
 */

import { Stack } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';
import { Seo } from '@/components/common/Seo';
import { SettingsContent } from '@/components/settings/SettingsContent';

export default function SettingsScreen() {
  const t = useTheme();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['bottom']}>
      <Stack.Screen options={{ title: 'Cài đặt', headerShown: true }} />
      {/* Luôn sáng: thanh tiêu đề phía trên có nền xanh tre cố định */}
      <StatusBar style="light" />

      {/* noIndex: cài đặt cá nhân không được lọt vào kết quả tìm kiếm */}
      <Seo
        title="Cài đặt"
        description="Tuỳ chỉnh giao diện và thông báo của ứng dụng Đội tuyển Việt Nam."
        path="/settings"
        noIndex
      />

      {/* Toàn bộ nội dung nằm ở components/settings/SettingsContent.tsx — dùng chung với tab Senior mode */}
      <SettingsContent />
    </SafeAreaView>
  );
}
