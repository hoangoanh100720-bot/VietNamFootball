/**
 * ============================================================================
 * APP/(AUTH)/_LAYOUT.TSX — VỎ NHÓM MÀN HÌNH ĐĂNG NHẬP
 * ============================================================================
 *
 * Nhóm (auth) gồm login và register. Cả hai tự vẽ giao diện riêng nên
 * ta ẩn thanh tiêu đề mặc định.
 */

import { Stack } from 'expo-router';
import { useTheme } from '@/theme';

export default function AuthLayout() {
  const t = useTheme();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: t.colors.bg },
        // Trượt từ dưới lên: cảm giác "mở một lớp mới" chứ không phải
        // đi sâu vào nội dung
        animation: 'slide_from_bottom',
      }}
    />
  );
}
