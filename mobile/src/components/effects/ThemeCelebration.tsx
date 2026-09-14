/**
 * ============================================================================
 * COMPONENTS/EFFECTS/THEMECELEBRATION.TSX — LỜI CHÀO + HIỆU ỨNG THEO SỰ KIỆN
 * ============================================================================
 *
 *   ┌──────────────────────────────┐
 *   │  🎆 VIỆT NAM CHIẾN THẮNG!    │ ◄ dải lời chào trượt xuống từ đỉnh
 *   └──────────────────────────────┘
 *        ✦    ·   ✦        ·         ◄ pháo hoa (Đi bão, 2/9) / hoa mai rơi (Tết)
 *
 * ----------------------------------------------------------------------------
 * ⚖️ BỐN LUẬT KIỀM CHẾ (ARCHITECTURE.md mục 6.4) — hiệu ứng vui, nhưng không phiền
 *
 *   1. MỘT LẦN mỗi phiên mở app. Lần thứ hai đã hết bất ngờ, chỉ còn phiền.
 *   2. TỐI ĐA 3 GIÂY. Người mở app vì muốn xem tỷ số, không phải xem pháo hoa.
 *   3. pointerEvents="none" — lớp phủ KHÔNG BAO GIỜ chặn chạm. Người dùng bấm
 *      xuyên qua pháo hoa vào nút bên dưới như không có gì.
 *   4. TẮT HẲN khi bật "Giảm chuyển động" của hệ điều hành hoặc Senior mode.
 *      Với người bị rối loạn tiền đình, chuyển động bất ngờ gây chóng mặt thật
 *      — đó là lý do hệ điều hành có công tắc này, và app phải tôn trọng nó.
 *
 * ----------------------------------------------------------------------------
 * 🎞️ VÌ SAO CHỈ ANIMATE `transform` VÀ `opacity`?
 *
 * Hai thuộc tính này chạy trên GPU và không bắt bố cục tính lại. Animate `top`
 * hay `width` thì mỗi khung hình (60 lần/giây) cả cây giao diện phải đo lại —
 * trên máy yếu là giật thấy rõ. `useNativeDriver: true` chỉ cho phép đúng hai
 * nhóm thuộc tính này, nên nó vừa là tối ưu vừa là hàng rào bảo vệ.
 * ============================================================================
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';

/**
 * Cờ "đã chạy trong phiên này" — biến CẤP MODULE, không phải state.
 *
 * State bị reset mỗi khi component bị gỡ rồi gắn lại (đổi theme, đổi chế độ
 * sáng/tối làm cây giao diện dựng lại). Biến module sống suốt đời tiến trình
 * JavaScript = đúng bằng "một phiên mở app". Mở lại app thì nó về false.
 */
const shownThisSession = new Set<string>();

const DURATION_MS = 3000;
const PARTICLES = 18;

export function ThemeCelebration() {
  const t = useTheme();
  const theme = t.eventTheme;
  const [reduceMotion, setReduceMotion] = useState<boolean | null>(null);

  // Đọc công tắc "Giảm chuyển động" của hệ điều hành (bất đồng bộ)
  useEffect(() => {
    let alive = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((v) => alive && setReduceMotion(v))
      .catch(() => alive && setReduceMotion(false));
    return () => {
      alive = false;
    };
  }, []);

  const greeting = theme?.assets.greeting ?? null;
  const effect = theme?.assets.effect ?? null;

  /**
   * Theme ĐANG chiếu hiệu ứng. Giữ trong STATE chứ không kiểm tra
   * shownThisSession ngay trong render.
   *
   * 🐛 Nếu viết "if (shownThisSession.has(code)) return null" thẳng trong
   * render: Celebration đánh dấu đã chiếu ngay khi bắt đầu -> lần render lại
   * kế tiếp của component cha (người dùng đổi Sáng/Tối, token làm mới…) trả
   * về null -> hiệu ứng bị gỡ giữa chừng, pháo hoa tắt phụt sau nửa giây.
   * State tách "quyết định chiếu" (một lần) khỏi "đang chiếu" (suốt 3 giây).
   */
  const [playing, setPlaying] = useState<string | null>(null);
  const code = theme?.code ?? null;
  const ready = Boolean(code) && reduceMotion !== null && Boolean(greeting || effect);

  useEffect(() => {
    if (!ready || !code || shownThisSession.has(code)) return;
    shownThisSession.add(code);
    setPlaying(code);
  }, [ready, code]);

  if (!theme || playing !== theme.code) return null;

  return (
    <Celebration
      key={theme.code}
      onDone={() => setPlaying(null)}
      greeting={greeting}
      // Senior mode / giảm chuyển động: vẫn hiện LỜI CHÀO (tĩnh) nhưng bỏ hạt bay
      effect={t.isSenior || reduceMotion === true ? null : effect}
      staticOnly={t.isSenior || reduceMotion === true}
    />
  );
}

function Celebration({
  onDone,
  greeting,
  effect,
  staticOnly,
}: {
  onDone: () => void;
  greeting: string | null;
  effect: 'fireworks' | 'blossoms' | null;
  staticOnly: boolean;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const progress = useRef(new Animated.Value(0)).current;
  const banner = useRef(new Animated.Value(staticOnly ? 1 : 0)).current;

  /**
   * Toạ độ ngẫu nhiên của các hạt — tính MỘT LẦN (useMemo với mảng phụ thuộc
   * rỗng theo kích thước). Tính trong thân render thì mỗi lần render các hạt
   * nhảy sang vị trí mới, trông như màn hình bị nhiễu.
   */
  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLES }, (_, i) => ({
        x: Math.random() * width,
        startY: effect === 'blossoms' ? -20 - Math.random() * 80 : height * (0.25 + Math.random() * 0.3),
        drift: (Math.random() - 0.5) * 120,
        size: 6 + Math.random() * 8,
        delay: Math.random() * 0.35,
        gold: i % 3 !== 0,
      })),
    [width, height, effect]
  );

  useEffect(() => {
    const anims = [
      Animated.timing(progress, {
        toValue: 1,
        duration: DURATION_MS,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
    ];
    if (!staticOnly) {
      anims.push(
        Animated.sequence([
          Animated.timing(banner, { toValue: 1, duration: 220, easing: Easing.out(Easing.cubic), useNativeDriver: true }),
          Animated.delay(DURATION_MS - 440),
          Animated.timing(banner, { toValue: 0, duration: 220, easing: Easing.in(Easing.cubic), useNativeDriver: true }),
        ])
      );
    }

    const all = Animated.parallel(anims);
    all.start(({ finished }) => {
      if (finished) onDone();
    });
    // Rời màn hình giữa chừng -> dừng animation, không để nó chạy ngầm tốn pin
    return () => all.stop();
    // onDone cố ý không nằm trong mảng phụ thuộc: nó là hàm mới mỗi lần cha
    // render, đưa vào đây sẽ khởi động lại animation liên tục
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progress, banner, staticOnly]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {effect &&
        particles.map((p, i) => {
          const local = progress.interpolate({
            inputRange: [p.delay, 1],
            outputRange: [0, 1],
            extrapolateLeft: 'clamp',
          });
          const translateY =
            effect === 'blossoms'
              ? local.interpolate({ inputRange: [0, 1], outputRange: [p.startY, height * 0.9] })
              : local.interpolate({ inputRange: [0, 1], outputRange: [p.startY, p.startY - 160] });
          const translateX = local.interpolate({ inputRange: [0, 1], outputRange: [p.x, p.x + p.drift] });
          const opacity = local.interpolate({ inputRange: [0, 0.15, 0.75, 1], outputRange: [0, 1, 1, 0] });
          const rotate = local.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${p.drift * 3}deg`] });

          return (
            <Animated.View
              key={i}
              style={{
                position: 'absolute',
                width: p.size,
                height: p.size,
                // Hoa mai: cánh bầu dục vàng; pháo hoa: đốm tròn vàng/đỏ
                borderRadius: effect === 'blossoms' ? p.size / 2.5 : p.size / 2,
                backgroundColor: p.gold ? t.colors.gold : t.colors.accent,
                opacity,
                transform: [{ translateX }, { translateY }, { rotate }],
              }}
            />
          );
        })}

      {greeting && (
        <Animated.View
          accessibilityLiveRegion="polite"
          style={{
            position: 'absolute',
            top: insets.top + t.spacing.sm,
            left: t.spacing.lg,
            right: t.spacing.lg,
            opacity: banner,
            transform: [{ translateY: banner.interpolate({ inputRange: [0, 1], outputRange: [-24, 0] }) }],
          }}
        >
          <View
            style={{
              alignSelf: 'center',
              paddingHorizontal: t.spacing.lg,
              paddingVertical: t.spacing.sm,
              borderRadius: t.radius.pill,
              backgroundColor: t.colors.accent,
              ...t.shadow.md,
            }}
          >
            <AppText variant="label" center style={{ color: t.static.white }}>
              {greeting}
            </AppText>
          </View>
        </Animated.View>
      )}
    </View>
  );
}
