/**
 * ============================================================================
 * COMPONENTS/DECOR/TRICOLORSTRIPE.TSX — DẢI BA MÀU CHỦ ĐẠO
 * ============================================================================
 *
 *   ██████████████████▓▓▓▓▓▓▓▓▓░░░░░░░░░
 *   đỏ cờ (50%)       vàng sao   xanh tre
 *
 * Một vạch mảnh 3px mang cả ba màu chủ đạo. Đặt ở mép trên thanh tab và dưới
 * thanh tiêu đề -> ba màu xuất hiện trên MỌI màn hình mà không chiếm diện tích.
 *
 * ⚠️ Không chia đều ba phần: đỏ rộng nhất, vàng và xanh hẹp hơn — cùng tinh
 * thần tỷ lệ nhấn/điểm xuyết trong theme/colors.ts. Chia đều trông như cờ
 * của một nước khác.
 */

import { View, type ViewStyle } from 'react-native';
import { useTheme } from '@/theme';

export function TricolorStripe({ height = 3, style }: { height?: number; style?: ViewStyle }) {
  const t = useTheme();
  const [red, gold, green] = t.static.tricolor;

  return (
    <View
      // Hoạ tiết thuần tuý — trình đọc màn hình bỏ qua
      accessible={false}
      importantForAccessibility="no-hide-descendants"
      style={[{ flexDirection: 'row', height }, style]}
    >
      <View style={{ flex: 2, backgroundColor: red }} />
      <View style={{ flex: 1, backgroundColor: gold }} />
      <View style={{ flex: 1, backgroundColor: green }} />
    </View>
  );
}
