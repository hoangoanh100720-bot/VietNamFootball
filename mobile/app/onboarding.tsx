/**
 * ============================================================================
 * APP/ONBOARDING.TSX — BỐN SLIDE GIỚI THIỆU ĐỘI TUYỂN
 * ============================================================================
 *
 * Đặc tả: ARCHITECTURE.md mục 4.1
 *
 * Hiện MỘT LẦN khi người dùng mở app lần đầu, rồi không bao giờ hiện lại
 * (trừ khi họ tự mở lại từ Cài đặt).
 *
 * ----------------------------------------------------------------------------
 * 🎯 BỐN SLIDE NÓI GÌ, VÀ VÌ SAO THEO THỨ TỰ ĐÓ
 *
 *   1. Những chiến binh Sao Vàng  — ĐÂY LÀ AI (danh tính)
 *   2. Hành trình vinh quang      — TẠI SAO ĐÁNG THEO DÕI (thành tích)
 *   3. Ban huấn luyện & đội hình  — APP CÓ GÌ (tính năng)
 *   4. Sẵn sàng cổ vũ!            — LÀM GÌ TIẾP (hành động)
 *
 * Đi từ CẢM XÚC tới CHỨC NĂNG rồi mới tới HÀNH ĐỘNG. Đảo ngược thứ tự này —
 * mở màn bằng "app có các tính năng A, B, C" — là cách chắc chắn khiến người
 * dùng bấm "Bỏ qua" ngay slide đầu.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ LUÔN PHẢI CÓ NÚT "BỎ QUA"
 *
 * Bắt người dùng xem hết 4 slide mới cho vào app là một trong những cách
 * nhanh nhất khiến họ gỡ app. Người đã biết đội tuyển Việt Nam là ai (tức là
 * gần như toàn bộ người dùng của app này) cần vào thẳng.
 *
 * Nút "Bỏ qua" nằm ở góc trên-phải — vị trí quy ước mà ai cũng biết tìm.
 *
 * ----------------------------------------------------------------------------
 * 🎨 MỖI SLIDE MỘT HOẠ TIẾT VIỆT NAM
 *
 *   Slide 1: lá cờ đỏ sao vàng     — danh tính
 *   Slide 2: vòng nguyệt quế lúa   — thành tích (đúng ý nghĩa của bông lúa)
 *   Slide 3: bụi tre               — sự kế thừa, lứa sau nối lứa trước
 *   Slide 4: cờ lớn + sao          — lời mời cổ vũ
 *
 * Xem docs/DESIGN-SYSTEM.md mục 4 về ý nghĩa từng hoạ tiết.
 */

import { useRef, useState } from 'react';
import { Dimensions, Pressable, ScrollView, View, type NativeSyntheticEvent, type NativeScrollEvent } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Button } from '@/components/common/Button';
import { VietnamFlag, RiceWreath, BambooGrove, BambooStalk, GoldStar } from '@/components/decor';
import { useSettingsStore } from '@/store/settingsStore';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Nội dung 4 slide.
 *
 * 💡 ĐÓNG GÓI SẴN TRONG APP, KHÔNG GỌI API.
 *
 * Đặc tả cho phép lấy từ `GET /onboarding/slides`, nhưng đây là màn hình
 * ĐẦU TIÊN người dùng thấy — nếu mạng chậm hoặc server chưa chạy thì họ nhìn
 * vào màn hình trắng và nghĩ app hỏng.
 *
 * Nội dung này gần như không bao giờ đổi, nên đóng gói sẵn là đánh đổi đúng:
 * app mở ra là có ngay, không phụ thuộc vào bất cứ thứ gì.
 */
const SLIDES = [
  {
    key: 'identity',
    title: 'Những chiến binh Sao Vàng',
    body: 'Đội tuyển bóng đá quốc gia Việt Nam do Liên đoàn Bóng đá Việt Nam (VFF) quản lý, thi đấu tại AFC và AFF. Sân nhà truyền thống là Sân vận động Quốc gia Mỹ Đình.',
  },
  {
    key: 'glory',
    title: 'Hành trình vinh quang',
    body: 'Bốn lần vô địch Đông Nam Á vào các năm 2008, 2018, 2024 và 2026. Hai lần lọt vào tứ kết Asian Cup năm 2007 và 2019.',
  },
  {
    key: 'squad',
    title: 'Ban huấn luyện & đội hình',
    body: 'Theo dõi huấn luyện viên trưởng, danh sách triệu tập, sơ đồ chiến thuật và điểm số từng cầu thủ sau mỗi trận đấu.',
  },
  {
    key: 'start',
    title: 'Sẵn sàng cổ vũ!',
    body: 'Bật thông báo để không bỏ lỡ bàn thắng nào. Cần chữ to dễ đọc hơn? Bật ngay bên dưới.',
  },
] as const;

export default function OnboardingScreen() {
  const t = useTheme();
  /** Khoảng lõm thật của máy (tai thỏ, thanh trạng thái) — xem giải thích ở nút "Bỏ qua" */
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const { setSeenOnboarding, isSenior, setSenior } = useSettingsStore();

  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  /**
   * 📐 CHIỀU CAO THẬT CỦA VÙNG CUỘN — để nội dung slide nằm GIỮA màn hình.
   *
   * Vì sao phải tự đo thay vì để CSS lo? Trên React Native Web, ScrollView
   * nằm ngang dựng ra cây DOM thế này:
   *
   *   ScrollView          flex-direction: row
   *     contentContainer  flex-direction: row   <- contentContainerStyle vào đây
   *       scrollSnapAlign                       <- RNW TỰ CHÈN vì pagingEnabled
   *         slide của mình
   *
   * Hai chỗ làm đứt chuỗi chiều cao: contentContainer là con của một flex ROW
   * nên `flexGrow: 1` kéo nó theo chiều NGANG chứ không phải dọc; và lớp
   * scrollSnapAlign chen vào giữa không mang chiều cao xuống cho slide.
   *
   * Kết quả: slide chỉ cao bằng nội dung (~300px), `justifyContent: 'center'`
   * không có khoảng trống nào để căn -> chữ dồn lên đỉnh, chừa mảng trống lớn
   * bên dưới trên màn hình rộng.
   *
   * Đo bằng onLayout cho ra con số chắc chắn đúng ở cả web lẫn iOS/Android,
   * không phụ thuộc vào chi tiết dựng DOM của RNW (thứ có thể đổi khi nâng cấp).
   */
  const [viewportHeight, setViewportHeight] = useState(0);

  /** Đánh dấu đã xem rồi vào app — dùng chung cho cả "Bỏ qua" và "Bắt đầu" */
  const finish = () => {
    setSeenOnboarding(true);
    // replace chứ không push: người dùng bấm Back không được quay lại onboarding
    router.replace('/');
  };

  const goToSlide = (next: number) => {
    scrollRef.current?.scrollTo({ x: next * SCREEN_WIDTH, animated: true });
    setIndex(next);
  };

  /**
   * Tính slide hiện tại từ vị trí cuộn.
   *
   * 📐 Chia cho bề rộng màn hình rồi làm tròn: cuộn được quá nửa slide thì
   * coi như đã sang slide đó. Đây là cách đơn giản và chính xác hơn hẳn so
   * với việc nghe sự kiện "kết thúc cuộn" — vốn không bắn ra khi người dùng
   * vuốt nhanh liên tiếp.
   */
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const next = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
    if (next !== index) setIndex(next);
  };

  const isLast = index === SLIDES.length - 1;

  return (
    <View style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <StatusBar style="light" />

      {/* Nền xanh tre sẫm trải toàn màn hình — giữ nguyên ở cả hai chế độ */}
      <LinearGradient
        colors={t.static.heroGradient as unknown as readonly [string, string, ...string[]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}
      />

      {/* Bụi tre mờ ở đáy — tạo chiều sâu mà không tranh chỗ với chữ */}
      <BambooGrove height={220} count={7} opacity={0.09} />

      <SafeAreaView style={{ flex: 1 }}>
        {/* ==================== NÚT BỎ QUA ==================== */}
        {/* Ẩn ở slide cuối vì ở đó đã có nút "Bắt đầu" rõ ràng hơn */}
        {!isLast && (
          <Pressable
            onPress={finish}
            accessibilityRole="button"
            accessibilityLabel="Bỏ qua phần giới thiệu"
            hitSlop={8}
            style={{
              position: 'absolute',
              /**
               * ⚠️ PHẢI CỘNG insets.top — SafeAreaView bọc ngoài KHÔNG cứu được nút này.
               *
               * 🐛 LỖI ĐÃ GẶP THẬT trên máy ảo Android: bản trước đặt top = spacing.xl
               * (24pt). Trên web trông ổn, nhưng trên Android nút "Bỏ qua" nằm đè lên
               * thanh trạng thái (giờ, pin) và BẤM KHÔNG ĂN — hệ điều hành giữ vùng đó
               * cho cử chỉ kéo thanh thông báo.
               *
               * Lý do: phần tử position:'absolute' được đặt toạ độ tính từ MÉP NGOÀI
               * của khung cha, bỏ qua padding. SafeAreaView chừa chỗ bằng padding,
               * nên nó đẩy được các phần tử bình thường xuống nhưng không đẩy được
               * phần tử absolute. Phải tự cộng khoảng lõm thật của máy vào.
               */
              top: insets.top + t.spacing.sm,
              right: t.spacing.lg,
              zIndex: 10,
              minHeight: t.touchTarget,
              justifyContent: 'center',
              paddingHorizontal: t.spacing.md,
            }}
          >
            <AppText variant="body" style={{ color: t.static.onDark.textMuted }}>
              Bỏ qua
            </AppText>
          </Pressable>
        )}

        {/* ==================== CÁC SLIDE ==================== */}
        <ScrollView
          ref={scrollRef}
          horizontal
          // pagingEnabled: mỗi lần vuốt nhảy trọn một màn hình, không dừng lưng chừng
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={onScroll}
          // 16ms ≈ 60 lần/giây: chấm chỉ báo chạy mượt theo ngón tay
          scrollEventThrottle={16}
          style={{ flex: 1 }}
          /**
           * 📐 flexGrow: 1 — THỨ DUY NHẤT GIÚP NỘI DUNG NẰM GIỮA MÀN HÌNH.
           *
           * ScrollView nằm ngang chỉ cho phần chứa nội dung cao BẰNG ĐÚNG nội
           * dung bên trong, kể cả khi bản thân ScrollView đã `flex: 1`. Thiếu
           * dòng này thì mỗi slide chỉ cao ~300px, `justifyContent: 'center'`
           * ở dưới không có khoảng trống nào để căn -> chữ dồn hết lên đỉnh và
           * chừa một mảng trống rất lớn phía dưới (thấy rõ trên màn hình rộng).
           *
           * flexGrow: 1 kéo phần chứa cao bằng cả ScrollView; các slide con tự
           * giãn theo (alignItems mặc định là 'stretch' trên trục chéo), lúc đó
           * justifyContent mới có chỗ mà căn giữa.
           */
          contentContainerStyle={{ flexGrow: 1 }}
          onLayout={(e) => setViewportHeight(e.nativeEvent.layout.height)}
        >
          {SLIDES.map((slide, i) => (
            <View
              key={slide.key}
              style={{
                width: SCREEN_WIDTH,
                // Lần render đầu chưa đo được -> để undefined, slide cao bằng
                // nội dung như cũ. Ngay sau onLayout là có số thật và nội dung
                // nhảy vào giữa. Không dùng 0 vì nó sẽ làm slide biến mất.
                //
                // minHeight chứ không phải height: màn hình thấp (điện thoại
                // xoay ngang, cửa sổ web bị kéo dẹt) có nội dung cao hơn khung
                // thì slide vẫn nở ra được, thay vì bị cắt mất phần dưới.
                minHeight: viewportHeight || undefined,
                paddingHorizontal: t.spacing.xl,
                alignItems: 'center',
                justifyContent: 'center',
                gap: t.spacing.xl,
              }}
            >
              {/* Hoạ tiết riêng của từng slide */}
              <View style={{ height: 120, justifyContent: 'center' }}>
                <SlideArt index={i} />
              </View>

              <View style={{ gap: t.spacing.md, alignItems: 'center' }}>
                <AppText variant="h1" center style={{ color: t.static.white }}>
                  {slide.title}
                </AppText>

                {/*
                  maxWidth 340: giữ độ dài dòng khoảng 45-60 ký tự.
                  Chữ căn giữa mà kéo dài hết bề ngang thì mắt phải "nhảy" tìm
                  đầu dòng mỗi lần xuống dòng — đọc rất mệt.
                */}
                <AppText
                  variant="body"
                  center
                  style={{ color: t.static.onDark.textMuted, maxWidth: 340 }}
                >
                  {slide.body}
                </AppText>
              </View>

              {/*
                ⭐ LỰA CHỌN NHANH Ở SLIDE CUỐI: bật chữ to ngay tại đây.

                Vì sao đặt ở onboarding mà không chỉ để trong Cài đặt? Vì người
                cần nó nhất — ông bà, cha mẹ — thường không tự tìm vào Cài đặt.
                Đặt ngay trên đường đi bắt buộc là cách duy nhất để họ thấy.
              */}
              {i === SLIDES.length - 1 && (
                <Pressable
                  onPress={() => setSenior(!isSenior)}
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: isSenior }}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.sm,
                    paddingVertical: t.spacing.md,
                    paddingHorizontal: t.spacing.lg,
                    borderRadius: t.radius.md,
                    borderWidth: 1.5,
                    borderColor: isSenior ? t.colors.gold : t.static.onDark.border,
                    backgroundColor: isSenior
                      ? t.colors.goldSoft
                      : t.static.transparent,
                  }}
                >
                  <View
                    style={{
                      width: 20,
                      height: 20,
                      borderRadius: 4,
                      borderWidth: 2,
                      borderColor: isSenior ? t.colors.gold : t.static.onDark.textMuted,
                      backgroundColor: isSenior ? t.colors.gold : t.static.transparent,
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    {isSenior && (
                      <AppText style={{ fontSize: 13, color: t.static.black, lineHeight: 15 }}>
                        ✓
                      </AppText>
                    )}
                  </View>

                  <AppText
                    variant="body"
                    style={{ color: isSenior ? t.colors.goldText : t.static.white }}
                  >
                    Dùng chữ to, dễ đọc
                  </AppText>
                </Pressable>
              )}
            </View>
          ))}
        </ScrollView>

        {/* ==================== CHẤM CHỈ BÁO + NÚT ==================== */}
        <View style={{ padding: t.spacing.xl, gap: t.spacing.xl }}>
          {/* Chấm chỉ báo — chấm đang xem DÀI RA thay vì chỉ đổi màu */}
          <View style={{ flexDirection: 'row', justifyContent: 'center', gap: 6 }}>
            {SLIDES.map((s, i) => (
              <View
                key={s.key}
                style={{
                  height: 6,
                  // Chấm hiện tại dài 22px, các chấm khác tròn 6px.
                  // Đổi CẢ hình dạng lẫn màu -> người mù màu vẫn biết đang ở đâu.
                  width: i === index ? 22 : 6,
                  borderRadius: 3,
                  backgroundColor: i === index ? t.colors.gold : t.static.onDark.border,
                }}
              />
            ))}
          </View>

          <Button
            label={isLast ? 'Bắt đầu' : 'Tiếp tục'}
            fullWidth
            onPress={() => (isLast ? finish() : goToSlide(index + 1))}
          />
        </View>
      </SafeAreaView>
    </View>
  );
}

/**
 * Hoạ tiết minh hoạ cho từng slide.
 *
 * Tách thành component riêng để phần JSX của slide không bị một chuỗi ba tầng
 * điều kiện chen vào giữa — đọc rất khó.
 */
function SlideArt({ index }: { index: number }) {
  switch (index) {
    case 0:
      // Danh tính -> lá cờ
      return <VietnamFlag size={150} />;

    case 1:
      // Thành tích -> vòng nguyệt quế bông lúa ôm ngôi sao vô địch
      return (
        <RiceWreath size={96}>
          <GoldStar size={40} />
        </RiceWreath>
      );

    case 2:
      // Kế thừa -> cây tre ("tre già măng mọc")
      return <BambooArt />;

    default:
      // Lời mời cổ vũ -> cờ lớn
      return <VietnamFlag size={170} />;
  }
}

/** Ba thân tre cao thấp so le — bụi tre chứ không phải hàng rào */
function BambooArt() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: 10 }}>
      <BambooStalk height={90} width={14} nodes={4} leaves="top" />
      <BambooStalk height={120} width={16} nodes={5} leaves="top" />
      <BambooStalk height={76} width={12} nodes={4} leaves="none" />
    </View>
  );
}
