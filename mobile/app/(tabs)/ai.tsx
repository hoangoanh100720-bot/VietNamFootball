/**
 * ============================================================================
 * APP/(TABS)/AI.TSX — TAB 5: THỐNG KÊ & TRỢ LÝ AI (hai khung kéo ngang)
 * ============================================================================
 *
 * Đặc tả mục 5.6–5.7. Tab này KHÔNG cuộn dọc ở cấp ngoài cùng — nó là một
 * băng chuyền NGANG gồm hai khung, vuốt qua lại giống thẻ kéo ngang của
 * App Store:
 *
 *        ← vuốt ngang để đổi khung →
 *   ┌──────────────────────────────┐ ┌──
 *   │ ① THỐNG KÊ                   │ │ ②   ◄ khung kế bên ló ~16px
 *   │   trận vừa đá · BXH cầu thủ  │ │ ✨  TRỢ LÝ AI
 *   │   · các trận đã đá           │ │
 *   │   · dự đoán · BXH FIFA       │ │
 *   └──────────────────────────────┘ └──
 *                  ● ○                    ◄ chấm chỉ trang, chạm được
 *
 * ----------------------------------------------------------------------------
 * ⭐ VÌ SAO MÉP KHUNG BÊN CẠNH PHẢI LÓ RA MỘT CHÚT?
 *
 * Vì nếu khung ② nằm khuất hoàn toàn thì KHÔNG AI BIẾT NÓ TỒN TẠI. Cử chỉ
 * vuốt ngang là thứ vô hình: người dùng chỉ vuốt khi có lý do tin rằng bên
 * kia có gì đó. Dải 16px ló ra chính là lý do đó — nó là lời mời trực quan,
 * rẻ hơn mọi dòng chữ hướng dẫn.
 *
 * Chấm chỉ trang bên dưới đóng vai trò thứ hai: cho người dùng biết CÓ BAO
 * NHIÊU khung và đang ở khung nào, đồng thời là lối đi cho ai không quen vuốt
 * (chạm thẳng vào chấm là nhảy khung).
 *
 * ----------------------------------------------------------------------------
 * 🧠 VÌ SAO KHÔNG TÁCH TRỢ LÝ AI RA MỘT MÀN HÌNH RIÊNG?
 *
 * Đây là quyết định đã chốt ở đặc tả (mục 5.7): trợ lý nằm NGAY CẠNH số liệu.
 * Lý do là dòng suy nghĩ tự nhiên của người xem bóng đá:
 *
 *   đọc thống kê → nảy ra thắc mắc ("sao Tiến Linh chỉ được 6.4?") → hỏi
 *
 * Bắt họ thoát ra, tìm một màn hình khác, rồi gõ lại bối cảnh từ đầu là cắt
 * đứt đúng cái mạch đó. Vuốt một cái sang bên cạnh thì không.
 *
 * Hệ quả kỹ thuật quan trọng: CẢ HAI KHUNG LUÔN ĐƯỢC GẮN (mounted) cùng lúc.
 * Vuốt qua khung thống kê rồi quay lại, hội thoại vẫn nguyên, câu đang gõ dở
 * vẫn còn — đúng yêu cầu "giữ nguyên trạng thái" của mục 5.6.
 *
 * ----------------------------------------------------------------------------
 * ⭐ NGUYÊN TẮC ĐẠO ĐỨC KHI HIỂN THỊ KẾT QUẢ AI (áp dụng cho cả hai khung)
 *
 * App PHẢI nói rõ ba điều, không được giấu:
 *   1. Đây là DỰ ĐOÁN, không phải sự thật
 *   2. Dự đoán do MODEL NÀO tạo ra (Gemini hay mô hình thống kê dự phòng)
 *   3. TẠO LÚC NÀO (dữ liệu cũ thì độ tin cậy giảm)
 *
 * Giấu những thông tin này là khiến người dùng tin nhầm rằng đó là chân lý.
 * ============================================================================
 */

import { useEffect, useRef, useState } from 'react';
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  RefreshControl,
  ScrollView,
  useWindowDimensions,
  View,
} from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Card, SectionHeader, Badge } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { TeamLogo } from '@/components/common/TeamLogo';
import { PredictionDonut } from '@/components/ai/PredictionDonut';
import { KnowledgeSearch } from '@/components/ai/KnowledgeSearch';
import { AiAssistant } from '@/components/ai/AiAssistant';
import { StatsPanel } from '@/components/stats/StatsPanel';
import { aiApi, matchesApi, rankingApi } from '@/api/endpoints';
import { formatDateTime, formatRelative, formatKickoff } from '@/utils/format';
import { HeroBanner, RiceWreath } from '@/components/decor';
import { Seo } from '@/components/common/Seo';
import type { AiPrediction, Match } from '@/types';

/**
 * Bề rộng mép khung bên cạnh ló ra, tính bằng pt.
 *
 * 16 là con số cân nhắc kỹ: đủ để mắt nhận ra "còn thứ nữa ở bên kia", nhưng
 * chưa đủ để đọc được nội dung — nếu đọc được thì người dùng sẽ cố nheo mắt
 * đọc thay vì vuốt sang. Hé lộ, chứ không phải hiển thị.
 */
const PEEK = 16;

/** Khoảng cách giữa hai khung */
/**
 * Khoảng cách giữa hai khung — BẰNG ĐÚNG lề trái màn hình (spacing.lg = 16).
 *
 * 🐛 LỖI ĐÃ GẶP THẬT trên máy ảo Android: bản trước đặt 12 và lề phải của băng
 * chuyền chỉ bằng lề trái. Khi vuốt sang khung ②, băng chuyền chạm đáy cuộn
 * SỚM 16pt, nên khung ① vẫn lòi ra ~20pt ở mép trái: mảnh chữ bị cắt ("nhá"),
 * một dãy dấu ›, trông như giao diện vỡ.
 *
 * Phép tính cho hai khung khớp tuyệt đối:
 *   • GAP = lề trái  -> ở khung ②, mép phải khung ① rơi đúng vào x = 0 (khuất hẳn)
 *   • khung ② rộng hơn khung ① đúng PEEK (nó là khung CUỐI, không có gì cần ló
 *     ra bên phải nó) -> lề hai bên khung ② đều bằng GAP, và điểm cuộn tối đa
 *     bằng đúng một bước nhảy nên băng chuyền dừng chính xác ở khung ②.
 */
const GAP = 16;

export default function StatsAiTab() {
  const t = useTheme();

  /**
   * Bề rộng màn hình THẬT, lấy lúc chạy.
   *
   * ⚠️ Phải dùng hook `useWindowDimensions` chứ KHÔNG dùng
   * `Dimensions.get('window')` gọi một lần ở đầu file. Lý do: hook tự cập nhật
   * khi màn hình đổi kích thước (xoay ngang, chia đôi màn hình trên máy tính
   * bảng, đổi cỡ cửa sổ trên web). Bản `Dimensions.get` chụp một lần rồi giữ
   * mãi — xoay máy là khung lệch hẳn, vuốt không còn khớp trang.
   */
  const { width: screenWidth } = useWindowDimensions();

  /**
   * Bề rộng một khung.
   *
   * Toàn bộ chiều rộng trừ đi: lề trái + lề phải + phần ló của khung bên cạnh.
   * Nhờ vậy khung ① canh đúng lề như mọi màn hình khác trong app, đồng thời
   * vẫn chừa chỗ cho khung ② nhô vào.
   */
  const frameWidth = screenWidth - t.spacing.lg * 2 - PEEK;

  /** Khung đang hiện: 0 = Thống kê, 1 = Trợ lý AI */
  const [page, setPage] = useState(0);

  const pagerRef = useRef<ScrollView>(null);

  /**
   * ⭐ CHIỀU CAO KHẢ DỤNG CỦA BĂNG CHUYỀN — PHẢI ĐO, KHÔNG ĐƯỢC DÙNG flex.
   *
   * 🐛 CÁI BẪY THẬT SỰ Ở ĐÂY, RẤT DỄ VIẾT SAI:
   *
   * Trong Flexbox, "flex: 1" luôn tác động lên TRỤC CHÍNH. Mà trục chính của
   * một ScrollView NGANG là trục NGANG. Nên đặt "flex: 1" cho khung con ở đây
   * KHÔNG làm nó cao bằng màn hình — nó tranh chấp với "width" và cho ra một
   * bố cục lộn xộn: khung chat cao đúng bằng nội dung, ô nhập liệu trôi lên
   * giữa màn hình, danh sách tin nhắn không cuộn được.
   *
   * Cách đúng: hỏi React Native "băng chuyền này thực tế cao bao nhiêu?" bằng
   * onLayout, rồi đặt chiều cao đó cho từng khung một cách tường minh.
   *
   * Giá trị 0 ban đầu nghĩa là "chưa đo xong" — lần render đầu tiên không vẽ
   * nội dung khung, chỉ vẽ khung rỗng để lấy kích thước.
   */
  const [pagerHeight, setPagerHeight] = useState(0);

  // -------------------------------------------------------------------------
  // ĐƯỜNG DẪN SÂU: mở thẳng vào khung ②
  // -------------------------------------------------------------------------
  /**
   * Nút "Hỏi AI về trận này" ở màn Chi tiết trận điều hướng tới
   * `/ai?frame=assistant` và phải rơi ngay vào khung trợ lý (đặc tả 5.6).
   *
   * ⚠️ Vì sao phải bọc trong requestAnimationFrame?
   * Vì ngay lần render đầu, ScrollView chưa đo xong kích thước — gọi
   * scrollTo lúc đó sẽ trôi vào hư không và người dùng vẫn ở khung ①.
   * Chờ một khung hình là đủ để bố cục ổn định.
   */
  const { frame } = useLocalSearchParams<{ frame?: string }>();

  useEffect(() => {
    if (frame !== 'assistant') return;

    const id = requestAnimationFrame(() => {
      pagerRef.current?.scrollTo({ x: frameWidth + GAP, animated: false });
      setPage(1);
    });
    return () => cancelAnimationFrame(id);
  }, [frame, frameWidth]);

  // -------------------------------------------------------------------------
  // DỮ LIỆU CHO KHUNG ①
  // -------------------------------------------------------------------------
  const upcomingQuery = useQuery({
    queryKey: ['matches', 'upcoming', 'forAi'],
    queryFn: () => matchesApi.upcoming(1, 5),
  });

  /**
   * /matches/upcoming trả về cả trận ĐANG ĐÁ (Tab 1 cần vậy). Nhưng dự đoán
   * một trận đã lăn bóng thì vô nghĩa — bản đầu lấy phần tử [0] nên đi dự
   * đoán đúng trận đang đá. Phải lọc lấy trận CHƯA đá đầu tiên.
   */
  const nextMatch =
    upcomingQuery.data?.data.matches.find((m) => m.status === 'scheduled') ?? null;

  const predictionQuery = useQuery({
    queryKey: ['ai', 'predict', nextMatch?.id],
    queryFn: () => aiApi.predict(nextMatch!.id),
    /**
     * enabled: chỉ chạy khi ĐÃ biết id trận.
     * Không có dòng này, React Query sẽ gọi ngay với id = undefined -> lỗi.
     * Đây là mẫu "truy vấn phụ thuộc" (dependent query).
     */
    enabled: Boolean(nextMatch?.id),
    // Dự đoán tốn tiền gọi AI -> cache lâu, 30 phút mới coi là cũ
    staleTime: 30 * 60 * 1000,
  });

  const rankingQuery = useQuery({
    queryKey: ['ranking', 'fifa', 30],
    queryFn: () => rankingApi.fifa(30),
    staleTime: 24 * 60 * 60 * 1000,
  });

  const aiStatusQuery = useQuery({
    queryKey: ['ai', 'status'],
    queryFn: aiApi.status,
    staleTime: 60 * 60 * 1000,
  });

  const queryClient = useQueryClient();

  /**
   * Kéo để làm mới: tải lại MỌI dữ liệu của khung ①.
   *
   * Phần Thống kê nằm trong component con (StatsPanel) nên ở đây không có
   * biến query của nó để gọi .refetch(). invalidateQueries({ queryKey: ['stats'] })
   * đánh dấu CŨ mọi truy vấn có khoá bắt đầu bằng 'stats' — tổng quan, BXH,
   * danh sách trận — và React Query tự tải lại những cái đang hiện trên màn hình.
   * Đây là lý do nên đặt khoá truy vấn theo cấp bậc: ['stats', 'leaderboard', …].
   */
  const onRefresh = () => {
    void Promise.all([
      upcomingQuery.refetch(),
      predictionQuery.refetch(),
      rankingQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ['stats'] }),
    ]);
  };

  /**
   * Cập nhật chấm chỉ trang khi người dùng vuốt xong.
   *
   * `onMomentumScrollEnd` chứ không phải `onScroll`: ta chỉ quan tâm vị trí
   * CUỐI CÙNG sau khi đà trượt dừng hẳn. Dùng onScroll thì hàm này chạy hàng
   * chục lần mỗi giây trong lúc vuốt, và chấm chỉ trang nhấp nháy qua lại.
   */
  const onPagerEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    setPage(Math.round(x / (frameWidth + GAP)));
  };

  const goToPage = (index: number) => {
    pagerRef.current?.scrollTo({ x: index * (frameWidth + GAP), animated: true });
    setPage(index);
  };

  /**
   * KHỐI HERO — xem giải thích đầy đủ ở app/(tabs)/index.tsx.
   * Màu chữ dùng staticColors vì nền hero luôn sẫm ở CẢ hai chế độ sáng/tối.
   */
  const hero = (
    <HeroBanner minHeight={116}>
      <AppText variant="h2" style={{ color: t.static.white }}>
        Thống kê & Trợ lý AI
      </AppText>
      <AppText variant="caption" style={{ color: t.static.riceGradient[0], marginTop: 2 }}>
        {page === 0 ? 'Phân tích bằng trí tuệ nhân tạo' : 'Hỏi gì về đội tuyển cũng được'}
      </AppText>
    </HeroBanner>
  );

  return (
    /**
     * ⚠️ scroll={false} và padded={false} — KHÁC mọi màn hình khác trong app.
     *
     * Màn hình này tự lo cuộn: cuộn NGANG ở cấp ngoài, cuộn DỌC bên trong từng
     * khung. Để Screen bọc thêm một ScrollView dọc nữa là sinh ra ScrollView
     * lồng cùng hướng — vuốt dọc lúc ăn lúc không, một lỗi rất khó tả và cũng
     * rất khó tìm ra nguyên nhân.
     *
     * Bỏ lề mặc định vì lề phải do TỪNG KHUNG tự đặt, nếu không phần "ló ra"
     * của khung ② sẽ bị lề cha cắt mất.
     */
    <Screen header={hero} scroll={false} padded={false}>
      <Seo
        title="Thống kê & Trợ lý AI Đội tuyển Việt Nam"
        description="Dự đoán kết quả trận đấu bằng trí tuệ nhân tạo, bảng xếp hạng FIFA và trợ lý hỏi đáp về Đội tuyển Việt Nam: điểm cầu thủ, lịch thi đấu, thành tích."
        path="/ai"
      />

      {/* =================== BĂNG CHUYỀN NGANG =================== */}
      <ScrollView
        ref={pagerRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        /**
         * ⭐ VÌ SAO KHÔNG DÙNG pagingEnabled?
         *
         * `pagingEnabled` bắt mỗi trang phải rộng ĐÚNG BẰNG ScrollView. Mà ở
         * đây khung lại hẹp hơn (để chừa chỗ cho phần ló) — dùng nó thì mỗi
         * lần vuốt sẽ dừng lệch dần, tới khung thứ ba là lệch thấy rõ.
         *
         * `snapToInterval` cho ta tự khai bước nhảy = bề rộng khung + khoảng
         * cách, nên dừng đúng vị trí mọi lần. `decelerationRate="fast"` làm cú
         * vuốt dứt khoát như lật trang, thay vì trôi lững lờ.
         */
        snapToInterval={frameWidth + GAP}
        snapToAlignment="start"
        decelerationRate="fast"
        onMomentumScrollEnd={onPagerEnd}
        onLayout={(e) => setPagerHeight(e.nativeEvent.layout.height)}
        contentContainerStyle={{
          paddingLeft: GAP,
          paddingRight: GAP,
          gap: GAP,
        }}
        style={{ flex: 1 }}
      >
        {/* ---------------- KHUNG ①: THỐNG KÊ & DỰ ĐOÁN ---------------- */}
        <View style={{ width: frameWidth, height: pagerHeight }}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ paddingBottom: t.spacing.xxxl }}
            refreshControl={
              <RefreshControl
                refreshing={predictionQuery.isRefetching}
                onRefresh={onRefresh}
                tintColor={t.colors.accentText}
                colors={[t.colors.accent]}
              />
            }
          >
            <View style={{ height: t.spacing.lg }} />

            {/* =================== ⭐ THỐNG KÊ SAU TRẬN (đặc tả 5.6) =================== */}
            {/*
              Trận vừa đá · BXH cầu thủ · các trận đã đá. Đặt LÊN ĐẦU vì đây là
              thứ người mở tab "Thống kê" tìm trước tiên — dự đoán trận TỚI và
              BXH FIFA là thông tin phụ, xếp phía dưới.
            */}
            <StatsPanel />

            {/* =================== THẺ DỰ ĐOÁN =================== */}
            <SectionHeader title="Dự đoán trận tiếp theo" />
            {upcomingQuery.isLoading || predictionQuery.isLoading ? (
              <Skeleton width="100%" height={420} radius={t.radius.lg} />
            ) : !nextMatch ? (
              <EmptyState
                icon="calendar-outline"
                title="Chưa có trận nào sắp tới"
                message="AI sẽ phân tích ngay khi có lịch thi đấu mới."
              />
            ) : predictionQuery.isError ? (
              <ErrorState
                title="Không tạo được dự đoán"
                message={
                  predictionQuery.error instanceof Error ? predictionQuery.error.message : undefined
                }
                onRetry={() => void predictionQuery.refetch()}
              />
            ) : predictionQuery.data?.prediction ? (
              <PredictionCard match={nextMatch} prediction={predictionQuery.data.prediction} />
            ) : null}

            {/* Nhãn cho biết đang chạy AI thật hay mô hình dự phòng */}
            {aiStatusQuery.data && !aiStatusQuery.data.gemini_enabled && (
              <View style={{ marginTop: t.spacing.md }}>
                <Badge label="ĐANG DÙNG MÔ HÌNH THỐNG KÊ" tone="gold" size="sm" />
              </View>
            )}

            {/* =================== HỎI ĐÁP KHO TRI THỨC =================== */}
            {/*
              Giao diện của API /search — tìm kiếm lai vector + từ khoá.

              ⚠️ ĐỪNG NHẦM VỚI TRỢ LÝ Ở KHUNG ②. Hai thứ khác hẳn nhau:
                • Ô này trả về CÁC ĐOẠN VĂN BẢN gốc kèm nguồn -> ai cần dẫn
                  chứng, cần đọc nguyên văn thì dùng. Không cần đăng nhập.
                • Trợ lý khung ② trả về MỘT CÂU TRẢ LỜI đã tổng hợp, tự tra cơ
                  sở dữ liệu trực tiếp. Cần đăng nhập.
              Giữ cả hai là có chủ đích: hai kiểu người dùng, hai nhu cầu.
            */}
            <SectionHeader title="Hỏi đáp kho tri thức" />
            <KnowledgeSearch />

            {/* =================== BẢNG XẾP HẠNG FIFA =================== */}
            <SectionHeader title="Bảng xếp hạng FIFA" />

            {/*
              ⭐ VÒNG NGUYỆT QUẾ BẰNG BÔNG LÚA ÔM LẤY THỨ HẠNG VIỆT NAM.

              Đây là chỗ DUY NHẤT trong tab này dùng hoạ tiết bông lúa, và đó là
              chủ ý: bông lúa mang nghĩa GHI CÔNG (xem components/decor/RiceStalk.tsx).
              Thứ hạng FIFA đúng là một thành tích — nên nó xứng đáng được đóng khung.

              Rải bông lúa lên mọi con số trong app thì biểu tượng mất hết ý nghĩa,
              chỉ còn là hoa văn. Dùng đúng một chỗ thì mỗi lần thấy nó, người dùng
              hiểu ngay: "đây là điều đáng tự hào".
            */}
            {rankingQuery.data?.vietnam && (
              <View style={{ alignItems: 'center', marginBottom: t.spacing.lg }}>
                <RiceWreath size={62}>
                  {/* variant="h1" mang cả cỡ chữ lẫn độ cao dòng — xem lỗi chữ đè ở app/(tabs)/intro.tsx */}
                  <AppText
                    variant="h1"
                    tabular
                    style={{ fontWeight: t.fontWeight.black, color: t.colors.goldText }}
                  >
                    {rankingQuery.data.vietnam.rank}
                  </AppText>
                  <AppText variant="overline" tone="muted">
                    Hạng FIFA
                  </AppText>
                </RiceWreath>

                {/* Điểm số đặt dưới vòng nguyệt quế, cỡ nhỏ hơn — thứ yếu hơn thứ hạng */}
                <AppText variant="caption" tone="faint" tabular style={{ marginTop: 2 }}>
                  {rankingQuery.data.vietnam.points} điểm
                </AppText>
              </View>
            )}

            {rankingQuery.isLoading ? (
              <Skeleton width="100%" height={300} radius={t.radius.lg} />
            ) : rankingQuery.data ? (
              <Card padded={false}>
                {/* Dòng tiêu đề cột */}
                <View
                  style={{
                    flexDirection: 'row',
                    paddingHorizontal: t.spacing.md,
                    paddingVertical: t.spacing.sm,
                    borderBottomWidth: 1,
                    borderBottomColor: t.colors.border,
                    backgroundColor: t.colors.surfaceSunken,
                  }}
                >
                  <AppText variant="overline" tone="faint" style={{ width: 30 }}>
                    #
                  </AppText>
                  <AppText variant="overline" tone="faint" style={{ flex: 1 }}>
                    Đội tuyển
                  </AppText>
                  <AppText variant="overline" tone="faint" style={{ width: 56, textAlign: 'right' }}>
                    Điểm
                  </AppText>
                  <AppText variant="overline" tone="faint" style={{ width: 40, textAlign: 'right' }}>
                    +/−
                  </AppText>
                </View>

                {rankingQuery.data.rankings.map((row, i) => {
                  const isVietnam = row.fifa_code === 'VIE';

                  return (
                    <View
                      key={row.id}
                      style={{
                        flexDirection: 'row',
                        alignItems: 'center',
                        paddingHorizontal: t.spacing.md,
                        paddingVertical: t.spacing.md,
                        borderBottomWidth: i === rankingQuery.data!.rankings.length - 1 ? 0 : 1,
                        borderBottomColor: t.colors.border,
                        // ⭐ Làm nổi dòng Việt Nam — đây là app về ĐT Việt Nam,
                        // người dùng luôn tìm dòng này đầu tiên
                        backgroundColor: isVietnam ? t.colors.accentSoft : 'transparent',
                      }}
                    >
                      <AppText
                        variant="label"
                        tabular
                        tone={isVietnam ? 'accent' : 'muted'}
                        style={{ width: 30 }}
                      >
                        {row.rank}
                      </AppText>

                      <View
                        style={{
                          flex: 1,
                          flexDirection: 'row',
                          alignItems: 'center',
                          gap: t.spacing.sm,
                        }}
                      >
                        <TeamLogo
                          uri={row.team_logo}
                          fifaCode={row.fifa_code}
                          name={row.team_name}
                          size={24}
                        />
                        <AppText
                          variant={isVietnam ? 'bodyBold' : 'body'}
                          numberOfLines={1}
                          style={{ flex: 1 }}
                        >
                          {row.team_name}
                        </AppText>
                      </View>

                      <AppText
                        variant="label"
                        tabular
                        tone="muted"
                        style={{ width: 56, textAlign: 'right' }}
                      >
                        {row.points.toFixed(1)}
                      </AppText>

                      {/* Cột thay đổi: icon + số, KHÔNG chỉ dùng màu */}
                      <View
                        style={{
                          width: 40,
                          flexDirection: 'row',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 1,
                        }}
                      >
                        {row.change === 0 ? (
                          <AppText variant="caption" tone="faint">
                            —
                          </AppText>
                        ) : (
                          <>
                            <Ionicons
                              name={row.change > 0 ? 'caret-up' : 'caret-down'}
                              size={11}
                              color={row.change > 0 ? t.colors.win : t.colors.lose}
                            />
                            <AppText
                              tabular
                              style={{
                                fontSize: t.fontSize.xs,
                                fontWeight: t.fontWeight.semibold,
                                color: row.change > 0 ? t.colors.win : t.colors.lose,
                              }}
                            >
                              {Math.abs(row.change)}
                            </AppText>
                          </>
                        )}
                      </View>
                    </View>
                  );
                })}

                {/* Ghi rõ ngày công bố — số liệu xếp hạng luôn gắn với mốc thời gian */}
                {rankingQuery.data.snapshot_date && (
                  <View
                    style={{
                      padding: t.spacing.md,
                      borderTopWidth: 1,
                      borderTopColor: t.colors.border,
                    }}
                  >
                    <AppText variant="caption" tone="faint" center tabular>
                      Cập nhật ngày{' '}
                      {new Date(rankingQuery.data.snapshot_date).toLocaleDateString('vi-VN')}
                    </AppText>
                  </View>
                )}
              </Card>
            ) : null}
          </ScrollView>
        </View>

        {/* ---------------- KHUNG ②: TRỢ LÝ AI ---------------- */}
        {/*
          ⚠️ Khung này KHÔNG bọc trong ScrollView dọc — AiAssistant tự lo phần
          cuộn của nó, vì nó còn phải ghim ô nhập liệu xuống đáy và đẩy lên khi
          bàn phím bật. Bọc thêm một lớp cuộn nữa là ô nhập trôi mất tăm.

          flex: 1 để khung cao bằng đúng chiều cao còn lại của màn hình — đây
          chính là "chiều cao xác định" mà AiAssistant cần (xem ghi chú ở prop
          `height` của component đó).
        */}
        <View style={{ width: frameWidth + PEEK, height: pagerHeight, paddingTop: t.spacing.lg }}>
          {/*
            Trừ đi đúng phần paddingTop ở trên, nếu không khung chat cao hơn chỗ
            trống thật sự và ô nhập liệu bị đẩy khuất xuống dưới mép màn hình.
          */}
          <AiAssistant height={Math.max(0, pagerHeight - t.spacing.lg)} />
        </View>
      </ScrollView>

      {/* =================== CHẤM CHỈ TRANG =================== */}
      {/*
        ♿ Chấm KHÔNG chỉ để nhìn — nó là nút bấm được.
        Nhiều người (nhất là người lớn tuổi, đúng nhóm Senior mode nhắm tới)
        không quen cử chỉ vuốt ngang. Có lối đi bằng cách chạm là bắt buộc,
        không phải tuỳ chọn. Vùng chạm 44pt dù chấm chỉ 8px — kích thước NHÌN
        THẤY và kích thước CHẠM ĐƯỢC là hai thứ khác nhau.
      */}
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'center',
          alignItems: 'center',
          gap: t.spacing.sm,
          paddingVertical: t.spacing.sm,
        }}
      >
        {[
          { label: 'Thống kê', icon: 'stats-chart' as const },
          { label: 'Trợ lý AI', icon: 'sparkles' as const },
        ].map((item, i) => {
          const active = page === i;

          return (
            <Pressable
              key={item.label}
              onPress={() => goToPage(i)}
              accessibilityRole="tab"
              accessibilityLabel={`Khung ${item.label}`}
              accessibilityState={{ selected: active }}
              hitSlop={12}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: 5,
                paddingHorizontal: t.spacing.md,
                minHeight: 32,
                borderRadius: t.radius.pill,
                backgroundColor: active ? t.colors.accentSoft : 'transparent',
                opacity: pressed ? 0.6 : 1,
              })}
            >
              <Ionicons
                name={item.icon}
                size={13}
                color={active ? t.colors.accentText : t.colors.textFaint}
              />
              <AppText variant="caption" tone={active ? 'accent' : 'faint'}>
                {item.label}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </Screen>
  );
}

// ===========================================================================
// THẺ DỰ ĐOÁN — tách khỏi hàm chính cho dễ đọc
// ===========================================================================

/**
 * Tách ra vì hàm StatsAiTab đã phải lo cả băng chuyền ngang lẫn ba truy vấn
 * dữ liệu. Nhồi thêm 150 dòng JSX của thẻ dự đoán vào giữa thì phần logic
 * kéo khung — vốn là điểm mới và khó nhất của màn hình này — bị chôn mất.
 *
 * Kiểu tham số lấy trực tiếp từ kết quả truy vấn nên không phải khai lại.
 */
function PredictionCard({
  match,
  prediction,
}: {
  match: Match;
  prediction: AiPrediction;
}) {
  const t = useTheme();

  return (
    <Card>
      {/* ---------- Thông tin trận ---------- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: t.spacing.md,
          paddingBottom: t.spacing.lg,
          borderBottomWidth: 1,
          borderBottomColor: t.colors.border,
        }}
      >
        <TeamLogo
          uri={match.home_team.logo_url}
          fifaCode={match.home_team.fifa_code}
          name={match.home_team.name}
          size={34}
        />
        <View style={{ alignItems: 'center', flex: 1 }}>
          <AppText variant="label" center>
            {match.home_team.name} vs {match.away_team.name}
          </AppText>
          <AppText variant="caption" tone="faint" tabular center>
            {formatKickoff(match)} · {formatRelative(match.kickoff_at)}
          </AppText>
        </View>
        <TeamLogo
          uri={match.away_team.logo_url}
          fifaCode={match.away_team.fifa_code}
          name={match.away_team.name}
          size={34}
        />
      </View>

      {/* ---------- Biểu đồ vòng ---------- */}
      <View style={{ paddingVertical: t.spacing.xl }}>
        <PredictionDonut
          winPct={prediction.win_pct}
          drawPct={prediction.draw_pct}
          losePct={prediction.lose_pct}
        />
      </View>

      {/* ---------- Tỷ số dự đoán + độ tin cậy ---------- */}
      <View style={{ flexDirection: 'row', gap: t.spacing.md, paddingBottom: t.spacing.lg }}>
        <StatBox label="Tỷ số dự đoán" value={prediction.predicted_score ?? '—'} />
        <StatBox
          label="Độ tin cậy"
          value={
            prediction.confidence === 'high'
              ? 'Cao'
              : prediction.confidence === 'medium'
                ? 'Trung bình'
                : 'Thấp'
          }
        />
      </View>

      {/* ---------- Yếu tố then chốt ---------- */}
      {prediction.key_factors?.length > 0 && (
        <View
          style={{
            gap: t.spacing.sm,
            paddingTop: t.spacing.lg,
            borderTopWidth: 1,
            borderTopColor: t.colors.border,
          }}
        >
          <AppText variant="overline" tone="muted">
            Yếu tố then chốt
          </AppText>

          {prediction.key_factors.map((factor, i) => (
            <View
              key={i}
              style={{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'flex-start' }}
            >
              {/* Dấu chấm tròn nhỏ thay cho bullet mặc định — kiểm soát được canh lề */}
              <View
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: 3,
                  backgroundColor: t.colors.accentText,
                  marginTop: 8,
                }}
              />
              <AppText variant="body" tone="muted" style={{ flex: 1 }}>
                {factor}
              </AppText>
            </View>
          ))}
        </View>
      )}

      {/* ---------- Bài nhận định ---------- */}
      <View
        style={{
          marginTop: t.spacing.lg,
          paddingTop: t.spacing.lg,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
          gap: t.spacing.sm,
        }}
      >
        <AppText variant="overline" tone="muted">
          Nhận định chuyên sâu
        </AppText>
        {/*
          Đoạn văn dài cần độ cao dòng thoáng (1.55 lần cỡ chữ, đã đặt sẵn
          trong variant "body") — đọc 200 chữ trên màn hình nhỏ mà dòng
          sát nhau là rất mệt mắt.
        */}
        <AppText variant="body" tone="muted">
          {prediction.analysis_text}
        </AppText>
      </View>

      {/* ---------- ⭐ MINH BẠCH VỀ NGUỒN GỐC ---------- */}
      <View
        style={{
          marginTop: t.spacing.lg,
          paddingTop: t.spacing.md,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.sm,
          flexWrap: 'wrap',
        }}
      >
        <Ionicons name="information-circle-outline" size={13} color={t.colors.textFaint} />
        <AppText variant="caption" tone="faint" style={{ flex: 1 }}>
          {prediction.model_version.startsWith('gemini')
            ? `Phân tích bởi Google ${prediction.model_version}`
            : 'Mô hình thống kê Elo (chưa cấu hình Gemini API)'}
          {' · '}
          {formatRelative(prediction.generated_at)}
        </AppText>
      </View>

      <AppText variant="caption" tone="faint" style={{ marginTop: t.spacing.sm }}>
        Dự đoán chỉ mang tính tham khảo, không phải lời khuyên cá cược.
      </AppText>
    </Card>
  );
}

/** Ô số liệu nhỏ: nhãn trên, giá trị dưới */
function StatBox({ label, value }: { label: string; value: string }) {
  const t = useTheme();

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: t.colors.surfaceSunken,
        borderRadius: t.radius.md,
        padding: t.spacing.md,
        alignItems: 'center',
        gap: 2,
      }}
    >
      <AppText variant="overline" tone="faint">
        {label}
      </AppText>
      <AppText variant="h3" tabular>
        {value}
      </AppText>
    </View>
  );
}
