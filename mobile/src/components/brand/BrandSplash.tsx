/**
 * ============================================================================
 * COMPONENTS/BRAND/BRANDSPLASH.TSX — MÀN KHỞI ĐỘNG "ĐỘI TUYỂN VIỆT NAM"
 * ============================================================================
 *
 * ARCHITECTURE.md mục 4.1: "Splash có tên app ĐỘI TUYỂN VIỆT NAM".
 *
 *   ┌───────────────────────────┐
 *   │                           │
 *   │        ▄▄▄▄▄▄▄▄▄          │
 *   │        █   ★   █          │ ◄ lá cờ — ĐÚNG vị trí và kích thước lá cờ ở
 *   │        ▀▀▀▀▀▀▀▀▀          │   màn khởi động gốc (200dp) -> nối liền mạch
 *   │                           │
 *   │   ĐỘI TUYỂN VIỆT NAM      │ ◄ hiện dần lên
 *   │  Những chiến binh Sao Vàng│
 *   │    ▬▬▬ đỏ · vàng · xanh    │
 *   │ ┃  ┃   ┃  bụi tre   ┃  ┃  │
 *   └───────────────────────────┘
 *
 * ----------------------------------------------------------------------------
 * 🧩 HAI MÀN KHỞI ĐỘNG NỐI TIẾP NHAU — VÌ SAO KHÔNG DÙNG MỘT?
 *
 *   ① Màn GỐC (native, app.json + expo-splash-screen)
 *      Hiện NGAY khi chạm icon, trước cả khi JavaScript chạy. Nhưng Android 12+
 *      ép nó vào một vòng tròn nhỏ ở giữa: KHÔNG đặt được chữ tên app.
 *
 *   ② Màn này (JavaScript)
 *      Có đủ chữ, bông lúa, bụi tre, hiệu ứng. Nhưng chỉ vẽ được SAU khi
 *      JavaScript đã chạy.
 *
 * Bí quyết để người dùng thấy như MỘT màn liền mạch: màn ② vẽ lá cờ ở ĐÚNG chỗ,
 * ĐÚNG cỡ, trên ĐÚNG màu nền như màn ①. Khi màn ① tắt, không có gì "nhảy" cả —
 * chỉ có dòng chữ hiện dần lên bên dưới lá cờ.
 *
 * ----------------------------------------------------------------------------
 * ⏱️ HIỆN BAO LÂU?
 *
 *   max(1,2 giây, lúc đọc xong cài đặt trên máy)
 *
 * Không kéo dài cho "đẹp": mỗi giây ở màn khởi động là một giây người dùng
 * không xem được tỷ số. 1,2 giây đủ đọc tên app; dữ liệu cài đặt (sáng/tối,
 * senior mode) phải xong trước khi tắt, nếu không màn chính sẽ nháy màu.
 *
 * Chỉ hiện MỘT LẦN mỗi lần mở app (không hiện lại khi Fast Refresh khi dev,
 * không hiện khi quay lại từ nền). Bản web bỏ qua hẳn — trang web cần hiện
 * nội dung ngay cho người đọc và cho Google.
 * ============================================================================
 */

import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Platform, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as SplashScreen from 'expo-splash-screen';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { BambooGrove, TricolorStripe, VietnamFlag } from '@/components/decor';
import { staticColors } from '@/theme/colors';
import { useSettingsStore } from '@/store/settingsStore';

/** Thời gian hiện tối thiểu */
const MIN_VISIBLE_MS = 1200;

/**
 * Cỡ lá cờ — PHẢI KHỚP imageWidth: 200 của plugin expo-splash-screen trong
 * app.json. Lệch nhau là thấy lá cờ "giật" to/nhỏ lúc hai màn nối nhau.
 */
const FLAG_SIZE = 200;

/** Cờ "đã hiện" cấp module — sống suốt phiên, không reset khi component dựng lại */
let alreadyShown = false;

export function BrandSplash() {
  const t = useTheme();
  const hydrated = useSettingsStore((s) => s.hydrated);

  const [visible, setVisible] = useState(() => Platform.OS !== 'web' && !alreadyShown);
  const [minTimePassed, setMinTimePassed] = useState(false);

  const textIn = useRef(new Animated.Value(0)).current;
  const fadeOut = useRef(new Animated.Value(1)).current;

  // ---- Vừa vẽ xong khung đầu tiên: tắt màn gốc, bắt đầu cho chữ hiện lên ----
  useEffect(() => {
    if (!visible) {
      // Không hiện màn này (web / đã hiện) -> vẫn phải tắt màn gốc, nếu không app kẹt ở lá cờ
      void SplashScreen.hideAsync().catch(() => undefined);
      return;
    }
    alreadyShown = true;

    let cancelled = false;
    void (async () => {
      // requestAnimationFrame: chờ màn ② vẽ xong rồi mới tắt màn ① -> không có khung hình trống
      await new Promise((r) => requestAnimationFrame(() => r(null)));
      await SplashScreen.hideAsync().catch(() => undefined);
      if (cancelled) return;

      const reduceMotion = await AccessibilityInfo.isReduceMotionEnabled().catch(() => false);
      Animated.timing(textIn, {
        toValue: 1,
        duration: reduceMotion ? 0 : 450,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    })();

    const timer = setTimeout(() => setMinTimePassed(true), MIN_VISIBLE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [visible, textIn]);

  // ---- Đủ giờ + đã đọc xong cài đặt: mờ dần rồi gỡ khỏi màn hình ----
  useEffect(() => {
    if (!visible || !minTimePassed || !hydrated) return;
    Animated.timing(fadeOut, {
      toValue: 0,
      duration: 350,
      easing: Easing.in(Easing.quad),
      useNativeDriver: true,
    }).start(() => setVisible(false));
  }, [visible, minTimePassed, hydrated, fadeOut]);

  if (!visible) return null;

  const rise = textIn.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Animated.View
      style={[StyleSheet.absoluteFill, { opacity: fadeOut, zIndex: 100 }]}
      accessibilityLabel="Đội tuyển Việt Nam, đang mở ứng dụng"
    >
      {/*
        ⚠️ Nền dùng staticColors, KHÔNG dùng t.colors.bg.
        Màn gốc có nền cố định #0A1A12 ở cả chế độ sáng lẫn tối. Dùng màu theo
        theme thì ở chế độ sáng, lúc hai màn nối nhau sẽ chớp từ tối sang sáng.
      */}
      <LinearGradient
        colors={['#0A1A12', staticColors.heroGradient[1]]}
        start={{ x: 0.5, y: 0.35 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      <BambooGrove height={260} count={8} opacity={0.1} />

      {/* Lá cờ căn GIỮA màn hình — cùng chỗ với lá cờ ở màn gốc */}
      <View style={styles.center} pointerEvents="none">
        <VietnamFlag size={FLAG_SIZE} radius={6} />
      </View>

      {/* Chữ đặt NGAY DƯỚI lá cờ (tâm màn hình + nửa chiều cao cờ + khoảng thở) */}
      <Animated.View
        style={[
          styles.textBlock,
          { top: '50%', marginTop: (FLAG_SIZE * 2) / 3 / 2 + t.spacing.xl, opacity: textIn, transform: [{ translateY: rise }] },
        ]}
      >
        <AppText
          variant="h2"
          center
          style={{ color: staticColors.liveGold, fontWeight: t.fontWeight.black, letterSpacing: 1.5 }}
        >
          ĐỘI TUYỂN VIỆT NAM
        </AppText>
        <AppText variant="body" center style={{ color: staticColors.onDark.textMuted, marginTop: 4 }}>
          Những chiến binh Sao Vàng
        </AppText>
        <View style={{ width: 120, marginTop: t.spacing.lg, borderRadius: 2, overflow: 'hidden' }}>
          <TricolorStripe height={4} />
        </View>
      </Animated.View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  center: {
    // absoluteFillObject đã bị bỏ ở React Native mới -> viết tường minh 5 thuộc tính
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textBlock: {
    position: 'absolute',
    left: 24,
    right: 24,
    alignItems: 'center',
  },
});
