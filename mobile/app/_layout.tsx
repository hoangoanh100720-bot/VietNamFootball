/**
 * ============================================================================
 * APP/_LAYOUT.TSX — LỚP VỎ NGOÀI CÙNG CỦA TOÀN APP
 * ============================================================================
 *
 * EXPO ROUTER — ĐỊNH TUYẾN THEO FILE
 *
 * Không phải khai báo route bằng tay. Cấu trúc THƯ MỤC chính là bản đồ màn hình:
 *
 *   app/_layout.tsx          -> vỏ ngoài cùng (file này)
 *   app/(auth)/login.tsx     -> /login
 *   app/(tabs)/index.tsx     -> / (tab đầu tiên)
 *   app/(tabs)/squad.tsx     -> /squad
 *   app/match/[id].tsx       -> /match/12  (dấu ngoặc vuông = tham số động)
 *
 * Dấu ngoặc TRÒN như (auth), (tabs) là "nhóm route": chỉ để gom file cho gọn,
 * KHÔNG xuất hiện trong đường dẫn. Nhờ đó /login chứ không phải /(auth)/login.
 *
 * ----------------------------------------------------------------------------
 * THỨ TỰ BỌC PROVIDER — QUAN TRỌNG, KHÔNG ĐƯỢC ĐẢO
 *
 *   GestureHandlerRootView   (cử chỉ vuốt — phải ngoài cùng)
 *    └─ SafeAreaProvider     (đo tai thỏ, viền máy)
 *        └─ QueryClientProvider  (quản lý dữ liệu từ server)
 *            └─ ThemeProvider    (màu sắc, cỡ chữ)
 *                └─ Các màn hình
 *
 * Provider bên ngoài không dùng được thứ của provider bên trong.
 * Ví dụ đảo ThemeProvider ra ngoài SafeAreaProvider là hỏng ngay.
 */

import { useEffect } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Stack } from 'expo-router';
import { ThemeProvider, useTheme } from '@/theme';
import { useAuthStore } from '@/store/authStore';
import { useNotifications } from '@/hooks/useNotifications';

/**
 * REACT QUERY — thư viện quản lý "dữ liệu đến từ server".
 *
 * Nó lo giúp ta những việc mà tự làm sẽ rất mệt:
 *   • Nhớ dữ liệu đã tải (cache) -> quay lại màn hình cũ là hiện ngay
 *   • Tự tải lại khi dữ liệu "cũ" (stale)
 *   • Tự thử lại khi lỗi mạng
 *   • Theo dõi trạng thái isLoading / isError giúp ta
 *
 * CÁC MỐC THỜI GIAN Ở ĐÂY LẤY TỪ MỤC 3.2 CỦA ARCHITECTURE.MD:
 *   Lịch thi đấu   -> 5 phút
 *   Đội hình/cầu thủ -> 24 giờ
 *   Tỷ số live     -> realtime qua WebSocket (không dùng React Query)
 */
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /**
       * staleTime: bao lâu thì coi dữ liệu là "cũ".
       * Trong khoảng này, quay lại màn hình sẽ dùng luôn cache, KHÔNG gọi mạng.
       * Mặc định 5 phút — hợp với lịch thi đấu.
       */
      staleTime: 5 * 60 * 1000,

      /** gcTime: giữ cache trong RAM bao lâu sau khi không còn màn hình nào dùng */
      gcTime: 30 * 60 * 1000,

      /**
       * Thử lại 2 lần khi lỗi. Nhưng KHÔNG thử lại với lỗi 4xx:
       * gửi sai dữ liệu thì thử 100 lần vẫn sai, chỉ tốn pin.
       */
      retry: (failureCount, error: unknown) => {
        const status = (error as { status?: number })?.status;
        if (status && status >= 400 && status < 500) return false;
        return failureCount < 2;
      },

      // Chờ tăng dần giữa các lần thử: 1s, 2s, 4s... tối đa 10s
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, 10_000),

      /** Trên di động, tải lại khi app quay lại tiền cảnh là hợp lý */
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,
    },
  },
});

export default function RootLayout() {
  /**
   * Khôi phục phiên đăng nhập NGAY khi app mở.
   * Mảng phụ thuộc rỗng [] = chỉ chạy đúng một lần trong vòng đời app.
   */
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ThemeProvider>
            <RootNavigator />
          </ThemeProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Tách riêng phần điều hướng để dùng được useTheme()
 * (hook chỉ gọi được BÊN TRONG ThemeProvider, không gọi được ở component cha).
 */
function RootNavigator() {
  const t = useTheme();

  /**
   * Gắn hệ thống thông báo. Đặt ở ĐÂY chứ không phải RootLayout vì hook này
   * dùng useRouter() — chỉ hoạt động bên trong ngữ cảnh điều hướng.
   */
  useNotifications();

  return (
    <Stack
      screenOptions={{
        // Màu nền và chữ của thanh tiêu đề — phải theo theme, không để mặc định
        headerStyle: { backgroundColor: t.colors.bg },
        headerTintColor: t.colors.text,
        headerTitleStyle: {
          fontWeight: t.fontWeight.semibold,
          fontSize: t.fontSize.md,
        },
        headerShadowVisible: false, // bỏ đường kẻ mờ dưới header cho phẳng, hiện đại
        contentStyle: { backgroundColor: t.colors.bg },
        // Hiệu ứng trượt ngang khi mở màn hình mới (chuẩn iOS, đẹp trên cả Android)
        animation: 'slide_from_right',
      }}
    >
      {/* Nhóm tab chính — tự có thanh tab riêng nên ẩn header của Stack */}
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />

      {/* Nhóm đăng nhập/đăng ký — cũng tự vẽ giao diện riêng */}
      <Stack.Screen name="(auth)" options={{ headerShown: false }} />

      {/* Màn hình chi tiết — mở chồng lên tab, có nút quay lại */}
      <Stack.Screen name="match/[id]" options={{ title: 'Chi tiết trận đấu' }} />
      <Stack.Screen name="player/[id]" options={{ title: 'Hồ sơ cầu thủ' }} />
    </Stack>
  );
}
