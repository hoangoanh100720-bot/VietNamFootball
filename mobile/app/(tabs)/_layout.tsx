/**
 * ============================================================================
 * APP/(TABS)/_LAYOUT.TSX — THANH ĐIỀU HƯỚNG 4 TAB
 * ============================================================================
 *
 * Đúng theo sơ đồ mục 2 của ARCHITECTURE.md:
 *
 *   ┌──────────┬──────────┬──────────┬──────────┐
 *   │ Trận Đấu │ Đội Hình │ Cầu Thủ  │ AI & BXH │
 *   └──────────┴──────────┴──────────┴──────────┘
 *
 * ----------------------------------------------------------------------------
 * NHỮNG QUYẾT ĐỊNH THIẾT KẾ CỦA THANH TAB
 *
 * 1. BỐN TAB LÀ VỪA ĐẸP
 *    3-5 tab là khoảng lý tưởng. Dưới 3 thì thừa thanh tab; trên 5 thì
 *    mỗi ô quá hẹp, chữ bị cắt và ngón tay bấm nhầm.
 *
 * 2. MỘT KIỂU "ĐANG CHỌN" DUY NHẤT
 *    Tab đang mở: icon TÔ ĐẶC + màu đỏ nhấn + chữ đậm.
 *    Tab khác:    icon VIỀN RỖNG + màu mờ.
 *    Đổi cùng lúc 3 tín hiệu (hình dạng, màu, độ đậm) để người mù màu
 *    vẫn nhận ra mình đang ở đâu.
 *
 * 3. CHỮ NGẮN GỌN
 *    "Trận đấu" chứ không phải "Lịch thi đấu & Kết quả". Ô tab rất hẹp.
 *
 * 4. THANH TAB LÀ THỨ THẬT SỰ "NỔI" -> đây là một trong số ít chỗ dùng bóng đổ.
 */

import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform } from 'react-native';
import { useTheme } from '@/theme';

/** Cỡ icon tab cố định — xem giải thích ở tabBarLabelStyle bên dưới */
const ICON_SIZE = 22;

export default function TabsLayout() {
  const t = useTheme();

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // mỗi màn hình tự vẽ tiêu đề riêng cho linh hoạt

        // ----- Màu sắc -----
        tabBarActiveTintColor: t.colors.accentText,
        tabBarInactiveTintColor: t.colors.textFaint,

        // ----- Kiểu dáng thanh tab -----
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
          /**
           * ⚠️ CỐ Ý KHÔNG đặt height / paddingBottom ở đây.
           *
           * Bản đầu tiên ghi đè height = 58 (rồi 64) + tự cộng vùng an toàn,
           * và ảnh chụp cho thấy chữ nhãn tab bị CẮT MẤT NỬA DƯỚI ở cả hai lần.
           * Lý do: thư viện điều hướng TỰ tính chiều cao (icon + nhãn + vùng an
           * toàn đáy máy). Ghi đè bằng tay là làm lệch phép tính đó.
           * Bài học: khi thư viện đã lo một việc, đừng làm thay nó.
           */
          // Bóng nhẹ — thanh tab thực sự nổi trên nội dung
          ...Platform.select({
            ios: {
              shadowColor: '#000',
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          }),
        },

        tabBarLabelStyle: {
          fontSize: 11,
          // lineHeight rõ ràng: chữ 11px cần ô cao 14px (xem tabBarIconStyle)
          lineHeight: 14,
          fontWeight: t.fontWeight.semibold,
          // Không cho ô chữ bị bóp nhỏ hơn lineHeight (mặc định flex-shrink: 1)
          flexShrink: 0,
        },

        /**
         * NGUYÊN NHÂN GỐC của lỗi chữ tab bị cắt (tìm ra bằng cách ĐO trên Chrome,
         * sau hai lần đoán sai): thư viện đặt ô chứa icon CỐ ĐỊNH 28px, không co
         * được, bất kể icon to hay nhỏ. Ô tab chỉ có 38px -> còn 10px cho chữ.
         * Hạ ô icon xuống 24px: 24 + 14 = 38px, vừa khít.
         * Bài học: khi sửa giao diện hai lần không ăn, hãy ĐO chứ đừng đoán tiếp.
         */
        tabBarIconStyle: { height: 24 },

        // Chạm vào tab có rung nhẹ (chỉ Android hỗ trợ sẵn)
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* ---------------- TAB 1: TRẬN ĐẤU ---------------- */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trận đấu',
          tabBarAccessibilityLabel: 'Tab Trận đấu và tỷ số trực tiếp',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              // TÔ ĐẶC khi đang chọn, VIỀN RỖNG khi không
              name={focused ? 'football' : 'football-outline'}
              size={ICON_SIZE}
              color={color}
            />
          ),
        }}
      />

      {/* ---------------- TAB 2: ĐỘI HÌNH ---------------- */}
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Đội hình',
          tabBarAccessibilityLabel: 'Tab Đội hình ra sân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={ICON_SIZE} color={color} />
          ),
        }}
      />

      {/* ---------------- TAB 3: CẦU THỦ ---------------- */}
      <Tabs.Screen
        name="players"
        options={{
          title: 'Cầu thủ',
          tabBarAccessibilityLabel: 'Tab Cầu thủ và huấn luyện viên',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={ICON_SIZE} color={color} />
          ),
        }}
      />

      {/* ---------------- TAB 4: AI & BXH ---------------- */}
      <Tabs.Screen
        name="ai"
        options={{
          title: 'AI & BXH',
          tabBarAccessibilityLabel: 'Tab Dự đoán AI và bảng xếp hạng FIFA',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={ICON_SIZE} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
