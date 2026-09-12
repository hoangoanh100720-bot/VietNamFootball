/**
 * ============================================================================
 * APP/(TABS)/INDEX.TSX — TAB 1: TRẬN ĐẤU & TỶ SỐ TRỰC TIẾP
 * ============================================================================
 *
 * BỐ CỤC (từ trên xuống, theo đúng thứ tự ưu tiên thông tin):
 *
 *   ┌─────────────────────────────┐
 *   │ Đội tuyển Việt Nam          │  <- tiêu đề
 *   │ Hạng 109 FIFA               │
 *   ├─────────────────────────────┤
 *   │ ███ THẺ TỶ SỐ LỚN ███       │  <- thứ quan trọng nhất, chiếm chỗ nhất
 *   ├─────────────────────────────┤
 *   │ LỊCH THI ĐẤU                │
 *   │ · trận sắp tới              │
 *   │ · trận sắp tới              │
 *   ├─────────────────────────────┤
 *   │ KẾT QUẢ GẦN ĐÂY             │
 *   │ · trận đã đá                │
 *   └─────────────────────────────┘
 *
 * "PHÂN CẤP THỊ GIÁC" thể hiện qua KÍCH THƯỚC: thẻ tỷ số cao gấp 3 lần một
 * dòng lịch thi đấu. Mắt luôn nhìn thứ to nhất trước.
 *
 * ----------------------------------------------------------------------------
 * REACT QUERY — CÁCH DÙNG useQuery
 *
 *   const { data, isLoading, isError, refetch } = useQuery({
 *     queryKey: ['matches', 'latest'],   // "địa chỉ" của dữ liệu trong cache
 *     queryFn: () => matchesApi.latest(),// hàm đi lấy dữ liệu
 *   });
 *
 * queryKey giống như tên file trong tủ hồ sơ. Hai màn hình cùng dùng
 * ['matches','latest'] sẽ DÙNG CHUNG một bản cache -> chỉ gọi mạng một lần.
 */

import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { SectionHeader } from '@/components/common/Card';
import { ErrorState, EmptyState, LoadingList, Skeleton } from '@/components/common/States';
import { AccountButton } from '@/components/common/AccountButton';
import { LiveScoreCard } from '@/components/match/LiveScoreCard';
import { FixtureItem } from '@/components/match/FixtureItem';
import { matchesApi, rankingApi } from '@/api/endpoints';
import { useLiveScore } from '@/hooks/useLiveScore';
import { HeroBanner, GoldStar } from '@/components/decor';
import { Seo } from '@/components/common/Seo';
import { SegmentedControl } from '@/components/common/SegmentedControl';

export default function MatchesTab() {
  const t = useTheme();
  const router = useRouter();

  // ---------------------------------------------------------------------
  // TẢI DỮ LIỆU — ba truy vấn độc lập, chạy song song
  // ---------------------------------------------------------------------
  const latestQuery = useQuery({
    queryKey: ['matches', 'latest'],
    queryFn: matchesApi.latest,
    // Trận mới nhất có thể đang đá -> coi là "cũ" sau 30 giây
    staleTime: 30_000,
  });

  const upcomingQuery = useQuery({
    queryKey: ['matches', 'upcoming'],
    queryFn: () => matchesApi.upcoming(1, 5),
  });

  const resultsQuery = useQuery({
    queryKey: ['matches', 'results'],
    queryFn: () => matchesApi.results(1, 5),
  });

  const rankingQuery = useQuery({
    queryKey: ['ranking', 'fifa', 5],
    queryFn: () => rankingApi.fifa(5),
    staleTime: 24 * 60 * 60 * 1000, // BXH cập nhật theo tháng -> cache 24 giờ
  });

  const match = latestQuery.data?.match ?? null;
  const isLiveMatch = match?.status === 'live';

  // ---------------------------------------------------------------------
  // TỶ SỐ TRỰC TIẾP — chỉ bật WebSocket khi thật sự có trận đang đá
  // ---------------------------------------------------------------------
  const live = useLiveScore(
    match?.id ?? null,
    {
      home: match?.home_score ?? 0,
      away: match?.away_score ?? 0,
      minute: match?.minute ?? null,
      status: match?.status ?? 'scheduled',
    },
    isLiveMatch // enabled: false thì hook không mở kết nối nào cả
  );

  /**
   * KÉO XUỐNG ĐỂ LÀM MỚI — gọi lại cả 4 truy vấn cùng lúc.
   * useCallback để hàm không bị tạo mới mỗi lần render (tránh render thừa).
   */
  const onRefresh = useCallback(() => {
    void Promise.all([
      latestQuery.refetch(),
      upcomingQuery.refetch(),
      resultsQuery.refetch(),
      rankingQuery.refetch(),
    ]);
  }, [latestQuery, upcomingQuery, resultsQuery, rankingQuery]);

  const isRefreshing =
    latestQuery.isRefetching || upcomingQuery.isRefetching || resultsQuery.isRefetching;

  const vietnamRank = rankingQuery.data?.vietnam;

  /**
   * Phân đoạn danh sách trận đang xem (ARCHITECTURE.md mục 5.2).
   *
   * Mặc định "Sắp diễn ra" vì đó là câu người hâm mộ hỏi nhiều nhất khi mở
   * app: "bao giờ đá tiếp?". Kết quả trận cũ thì họ thường đã biết rồi.
   */
  const [listSegment, setListSegment] = useState<'upcoming' | 'results'>('upcoming');

  /**
   * =====================================================================
   * KHỐI HERO — thứ người dùng nhìn thấy đầu tiên khi mở app
   * =====================================================================
   *
   * Tách ra biến riêng thay vì viết thẳng trong phần return, vì nó được
   * truyền qua prop `header` của <Screen> để TRÀN SÁT MÉP màn hình.
   * Viết nội tuyến trong prop sẽ làm phần return dài và khó đọc.
   *
   * ⚠️ MÀU CHỮ Ở ĐÂY KHÔNG DÙNG TOKEN THEO THEME.
   * Nền hero luôn là dải xanh tre SẪM ở cả chế độ sáng lẫn tối. Nếu dùng
   * t.colors.text thì ở chế độ sáng chữ sẽ thành xanh đậm đặt trên nền xanh
   * đậm — biến mất hoàn toàn. Nền cố định thì chữ trên nó cũng phải cố định:
   * đây chính là lý do staticColors tồn tại.
   */
  const hero = (
    <HeroBanner minHeight={136}>
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: t.spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
        <AppText variant="h2" style={{ color: t.static.white }}>Đội tuyển Việt Nam</AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4 }}>
          {rankingQuery.isLoading ? (
            <Skeleton width={140} height={13} />
          ) : vietnamRank ? (
            <>
              {/* Ngôi sao vàng thay cho icon cúp: cùng ý nghĩa, nhưng là
                  biểu tượng của RIÊNG app này chứ không phải icon dùng chung */}
              <GoldStar size={13} />
              <AppText variant="caption" tabular style={{ color: t.static.liveGold }}>
                Hạng {vietnamRank.rank} FIFA
              </AppText>

              {/* Mũi tên tăng/giảm hạng — CÓ CẢ ICON VÀ SỐ, không chỉ màu */}
              {vietnamRank.change !== 0 && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 1 }}>
                  <Ionicons
                    name={vietnamRank.change > 0 ? 'caret-up' : 'caret-down'}
                    size={12}
                    color={vietnamRank.change > 0 ? t.colors.win : t.colors.lose}
                  />
                  <AppText
                    tabular
                    style={{
                      fontSize: t.fontSize.xs,
                      fontWeight: t.fontWeight.bold,
                      color: vietnamRank.change > 0 ? t.colors.win : t.colors.lose,
                    }}
                  >
                    {Math.abs(vietnamRank.change)}
                  </AppText>
                </View>
              )}
            </>
          ) : null}
        </View>
        </View>

        {/*
          Nút tài khoản ở góc phải.
          marginRight chừa chỗ cho lá cờ nhỏ mà HeroBanner tự vẽ ở góc —
          không chừa thì hai thứ chồng lên nhau.
        */}
        <View style={{ marginRight: 40 }}>
          <AccountButton />
        </View>
      </View>
    </HeroBanner>
  );

  return (
    <Screen header={hero} onRefresh={onRefresh} refreshing={isRefreshing}>
      {/* Thẻ SEO riêng của màn hình — xem components/common/Seo.tsx */}
      <Seo
        title="Lịch thi đấu & Tỷ số trực tiếp"
        description="Tỷ số trực tiếp từng phút, lịch thi đấu sắp tới và kết quả gần đây của Đội tuyển Bóng đá Quốc gia Việt Nam, kèm thứ hạng FIFA mới nhất."
        path="/"
      />
      {/* Khoảng thở giữa hero và nội dung. Khoảng cách GIỮA hai khối phải
          lớn hơn khoảng cách BÊN TRONG một khối — đó là cách khoảng trắng
          tự nó thể hiện cấu trúc mà không cần thêm đường kẻ nào. */}
      <View style={{ height: t.spacing.lg }} />

      {/* =================== THẺ TỶ SỐ LỚN =================== */}
      {latestQuery.isLoading ? (
        <Skeleton width="100%" height={210} radius={t.radius.xl} />
      ) : latestQuery.isError ? (
        <ErrorState
          message={
            latestQuery.error instanceof Error
              ? latestQuery.error.message
              : 'Không rõ nguyên nhân'
          }
          onRetry={() => void latestQuery.refetch()}
        />
      ) : match ? (
        <LiveScoreCard
          match={match}
          liveScore={
            isLiveMatch
              ? {
                  home: live.homeScore,
                  away: live.awayScore,
                  minute: live.minute,
                  status: live.status,
                }
              : undefined
          }
          connectionMode={isLiveMatch ? live.connectionMode : undefined}
          justScored={live.justScored}
          onPress={() => router.push(`/match/${match.id}`)}
        />
      ) : (
        <EmptyState
          title="Chưa có trận đấu nào"
          message="Dữ liệu sẽ xuất hiện khi lịch thi đấu được cập nhật."
        />
      )}

      {/* =================== THANH CHỌN PHÂN ĐOẠN (mục 5.2) =================== */}
      {/*
        📐 VÌ SAO TÁCH "SẮP TỚI" VÀ "KẾT QUẢ" THÀNH HAI PHÂN ĐOẠN, THAY VÌ
        XẾP CHỒNG NHAU NHƯ TRƯỚC?

        Bản cũ hiện cả hai danh sách nối đuôi nhau, nên muốn xem kết quả trận
        trước phải cuộn qua toàn bộ lịch thi đấu. Hai danh sách này trả lời hai
        câu hỏi KHÁC NHAU ("bao giờ đá tiếp?" và "trận rồi thế nào?"), người
        dùng mỗi lúc chỉ quan tâm một cái.

        Segmented control cho họ chuyển ngay bằng một cú chạm, và quan trọng
        hơn: màn hình ngắn lại một nửa.
      */}
      <View style={{ marginTop: t.spacing.xl }}>
        <SegmentedControl
          segments={[
            { value: 'upcoming', label: 'Sắp diễn ra' },
            { value: 'results', label: 'Kết quả' },
          ]}
          value={listSegment}
          onChange={setListSegment}
        />
      </View>

      <View style={{ height: t.spacing.lg }} />

      {/* =================== LỊCH THI ĐẤU =================== */}
      {listSegment === 'upcoming' ? (
        upcomingQuery.isLoading ? (
          <LoadingList count={3} variant="match" />
        ) : upcomingQuery.data?.data.matches.length ? (
          <View style={{ gap: t.spacing.md }}>
            {upcomingQuery.data.data.matches
              // Bỏ trận đang đá vì nó đã hiện ở thẻ lớn phía trên rồi
              .filter((m) => m.id !== match?.id)
              .map((m) => (
                <FixtureItem key={m.id} match={m} onPress={() => router.push(`/match/${m.id}`)} />
              ))}
          </View>
        ) : (
          <EmptyState
            icon="calendar-outline"
            title="Chưa có lịch thi đấu"
            message="Đội tuyển chưa có trận nào được lên lịch."
          />
        )
      ) : /* =================== KẾT QUẢ GẦN ĐÂY =================== */
      resultsQuery.isLoading ? (
        <LoadingList count={3} variant="match" />
      ) : resultsQuery.data?.data.matches.length ? (
        <View style={{ gap: t.spacing.md }}>
          {resultsQuery.data.data.matches.map((m) => (
            <FixtureItem key={m.id} match={m} onPress={() => router.push(`/match/${m.id}`)} />
          ))}
        </View>
      ) : (
        <EmptyState icon="time-outline" title="Chưa có kết quả nào" />
      )}
    </Screen>
  );
}
