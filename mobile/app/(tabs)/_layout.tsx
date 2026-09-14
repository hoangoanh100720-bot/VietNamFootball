/**
 * ============================================================================
 * APP/(TABS)/_LAYOUT.TSX — THANH ĐIỀU HƯỚNG 5 TAB
 * ============================================================================
 *
 * Đúng theo sơ đồ mục 2 của ARCHITECTURE.md:
 *
 *   ┌───────────┬──────────┬──────────┬─────────┬──────────┐
 *   │ Giới thiệu│ Trận đấu │ Đội hình │ Cầu thủ │ AI & BXH │
 *   └───────────┴──────────┴──────────┴─────────┴──────────┘
 *
 * ----------------------------------------------------------------------------
 * NHỮNG QUYẾT ĐỊNH THIẾT KẾ CỦA THANH TAB
 *
 * 1. NĂM TAB LÀ TRẦN TRÊN
 *    3-5 tab là khoảng lý tưởng. Dưới 3 thì thừa thanh tab; QUÁ 5 thì mỗi ô
 *    quá hẹp, chữ bị cắt và ngón tay bấm nhầm.
 *
 *    ⚠️ Đang ở đúng mức trần. Muốn thêm tính năng mới thì KHÔNG thêm tab thứ 6 —
 *    hãy gộp vào một tab sẵn có (như Trợ lý AI được đặt trong tab AI & BXH),
 *    hoặc mở từ nút tài khoản góc phải màn hình.
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

import { useEffect } from 'react';
import { Tabs, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Platform, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { TricolorStripe } from '@/components/decor';
import { useSettingsStore } from '@/store/settingsStore';

/** Cỡ icon tab cố định — xem giải thích ở tabBarLabelStyle bên dưới */
const ICON_SIZE = 22;
/** Senior mode: icon 30, nhãn 15 (bảng thông số ARCHITECTURE.md mục 7.2) */
const SENIOR_ICON_SIZE = 30;

export default function TabsLayout() {
  const t = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  /**
   * ⭐ SENIOR MODE: 5 TAB -> 3 TAB (mục 7.2)
   *
   *   Thường :  Giới thiệu · Trận đấu · Đội hình · Cầu thủ · Thống kê
   *   Senior :               Trận đấu · Đội hình · Cài đặt
   *
   * Cách ẩn tab trong Expo Router là "href: null" — tab vẫn tồn tại (đường dẫn
   * vẫn mở được, ví dụ từ thông báo đẩy), chỉ không hiện trên thanh tab.
   * KHÔNG xoá hẳn khối <Tabs.Screen>: Expo Router sẽ tự thêm lại tab đó với
   * tên file làm nhãn ("players") — còn tệ hơn là không ẩn.
   */
  const senior = t.isSenior;
  const hideInSenior = senior ? null : undefined;
  const iconSize = senior ? SENIOR_ICON_SIZE : ICON_SIZE;

  /**
   * ⭐ ĐIỀU HƯỚNG SANG PHẦN GIỚI THIỆU KHI MỞ APP LẦN ĐẦU (mục 4.1).
   *
   * Ba điều kiện phải đúng cùng lúc:
   *   1. `hydrated` — đã đọc xong cài đặt từ ổ đĩa. Chưa đọc xong mà điều
   *      hướng thì người dùng cũ cũng bị bắt xem lại onboarding.
   *   2. `!seenOnboarding` — thật sự chưa xem lần nào
   *   3. Chạy trong useEffect, KHÔNG chạy khi đang render
   *
   * ⚠️ Điểm 3 rất quan trọng: gọi router.replace() ngay trong thân component
   * sẽ khiến React báo lỗi "Cannot update a component while rendering a
   * different component". Mọi tác dụng phụ điều hướng đều phải nằm trong effect.
   */
  const hydrated = useSettingsStore((s) => s.hydrated);
  const seenOnboarding = useSettingsStore((s) => s.seenOnboarding);

  useEffect(() => {
    if (hydrated && !seenOnboarding) {
      router.replace('/onboarding');
    }
  }, [hydrated, seenOnboarding, router]);

  return (
    <Tabs
      screenOptions={{
        headerShown: false, // mỗi màn hình tự vẽ tiêu đề riêng cho linh hoạt

        // ----- Màu sắc -----
        tabBarActiveTintColor: t.colors.accentText,
        tabBarInactiveTintColor: t.colors.textFaint,

        // ----- Kiểu dáng thanh tab -----
        /**
         * ⭐ Nền thanh tab tự vẽ: màu surface + VẠCH BA MÀU đỏ·vàng·xanh ở mép trên,
         * thay cho đường viền xám. tabBarBackground phủ tuyệt đối sau các ô tab
         * nên KHÔNG làm đổi chiều cao thư viện tự tính (xem cảnh báo bên dưới).
         */
        tabBarBackground: () => (
          <View style={{ flex: 1, backgroundColor: t.colors.surface }}>
            <TricolorStripe />
          </View>
        ),
        tabBarStyle: {
          backgroundColor: t.colors.surface,
          borderTopWidth: 0,
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
              shadowColor: t.static.black,
              shadowOffset: { width: 0, height: -2 },
              shadowOpacity: 0.08,
              shadowRadius: 8,
            },
            android: { elevation: 8 },
          }),
          /**
           * ⚠️ NGOẠI LỆ DUY NHẤT cho luật "không tự đặt height" ở trên — CHỈ ở Senior mode.
           *
           * Chiều cao thư viện tự tính dành cho icon 22 + chữ 11. Icon 30 + chữ 15
           * cần: 8 (đệm trên) + 32 (ô icon) + 20 (ô chữ) + 12 (đệm dưới) = 72pt,
           * cộng vùng an toàn đáy máy (thanh home iPhone).
           *
           * 🐛 Bản đầu tính 6 + 32 + 20 + 6 = 64pt và ẢNH CHỤP khi chạy app cho thấy
           * nhãn "Trận đấu", "Cài đặt" vẫn sát/cụt mép dưới: phép tính quên phần
           * đệm nội bộ mà mỗi ô tab của thư viện tự thêm quanh nhãn. Phép tính giúp
           * khỏi đoán mò, nhưng chỉ ảnh chụp thật mới xác nhận được là đúng.
           */
          ...(senior ? { height: 72 + insets.bottom, paddingTop: 8, paddingBottom: 12 + insets.bottom } : {}),
        },

        tabBarLabelStyle: {
          fontSize: senior ? 15 : 11,
          // lineHeight rõ ràng: chữ 11px cần ô cao 14px (xem tabBarIconStyle)
          lineHeight: senior ? 20 : 14,
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
        tabBarIconStyle: { height: senior ? 32 : 24 },

        // Chạm vào tab có rung nhẹ (chỉ Android hỗ trợ sẵn)
        tabBarHideOnKeyboard: true,
      }}
    >
      {/* ---------------- TAB 1: GIỚI THIỆU ---------------- */}
      {/*
        ⚠️ THỨ TỰ KHAI BÁO <Tabs.Screen> QUYẾT ĐỊNH THỨ TỰ TRÊN THANH TAB.
        Không có prop nào để sắp xếp — cứ khai trước thì nằm bên trái.
        Muốn đổi vị trí một tab thì di chuyển cả khối <Tabs.Screen> của nó.

        📌 Vì sao "Giới thiệu" đứng đầu chứ không phải "Trận đấu"?
        Theo đặc tả ARCHITECTURE.md mục 5.1. Người mở app lần đầu cần biết
        "đội tuyển này là ai" trước; người dùng thường xuyên thì chỉ cần một
        cú chạm sang tab Trận đấu — và app tự nhớ tab họ đang ở khi quay lại.
      */}
      <Tabs.Screen
        name="intro"
        options={{
          href: hideInSenior, // ẩn ở Senior mode (mục 7.2)
          title: 'Giới thiệu',
          tabBarAccessibilityLabel: 'Tab Giới thiệu và thành tích đội tuyển',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'flag' : 'flag-outline'} size={iconSize} color={color} />
          ),
        }}
      />

      {/* ---------------- TAB 2: TRẬN ĐẤU ---------------- */}
      <Tabs.Screen
        name="index"
        options={{
          title: 'Trận đấu',
          tabBarAccessibilityLabel: 'Tab Trận đấu và tỷ số trực tiếp',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons
              // TÔ ĐẶC khi đang chọn, VIỀN RỖNG khi không
              name={focused ? 'football' : 'football-outline'}
              size={iconSize}
              color={color}
            />
          ),
        }}
      />

      {/* ---------------- TAB 3: ĐỘI HÌNH ---------------- */}
      <Tabs.Screen
        name="squad"
        options={{
          title: 'Đội hình',
          tabBarAccessibilityLabel: 'Tab Đội hình ra sân',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'grid' : 'grid-outline'} size={iconSize} color={color} />
          ),
        }}
      />

      {/* ---------------- TAB 4: CẦU THỦ ---------------- */}
      <Tabs.Screen
        name="players"
        options={{
          href: hideInSenior, // ẩn ở Senior mode (mục 7.2)
          title: 'Cầu thủ',
          tabBarAccessibilityLabel: 'Tab Cầu thủ và huấn luyện viên',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'people' : 'people-outline'} size={iconSize} color={color} />
          ),
        }}
      />

      {/* ---------------- TAB 5: AI & BXH ---------------- */}
      <Tabs.Screen
        name="ai"
        options={{
          href: hideInSenior, // ẩn ở Senior mode (mục 7.2)
          title: 'Thống kê',
          tabBarAccessibilityLabel: 'Tab Dự đoán AI và bảng xếp hạng FIFA',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'sparkles' : 'sparkles-outline'} size={iconSize} color={color} />
          ),
        }}
      />

      {/* ---------------- TAB CÀI ĐẶT — CHỈ SENIOR MODE ---------------- */}
      {/*
        Giao diện thường: ẩn (Cài đặt mở từ ảnh đại diện góc phải).
        Senior mode: hiện ở cuối thanh tab, để công tắc TẮT Senior mode luôn dễ tìm.
      */}
      <Tabs.Screen
        name="account"
        options={{
          href: senior ? undefined : null,
          title: 'Cài đặt',
          tabBarAccessibilityLabel: 'Tab Cài đặt',
          tabBarIcon: ({ color, focused }) => (
            <Ionicons name={focused ? 'settings' : 'settings-outline'} size={iconSize} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
