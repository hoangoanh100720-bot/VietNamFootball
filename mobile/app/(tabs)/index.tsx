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
import { LiveScoreCard } from '@/components/match/LiveScoreCard';
import { FixtureItem } from '@/components/match/FixtureItem';
import { competitionsApi, matchesApi, rankingApi } from '@/api/endpoints';
import { StandingsPanel } from '@/components/match/StandingsTable';
import { SeniorHome } from '@/components/senior/SeniorHome';
import { HomeHero } from '@/components/brand/HomeHero';
import { useLiveScore } from '@/hooks/useLiveScore';
import { Seo } from '@/components/common/Seo';
import { SegmentedControl } from '@/components/common/SegmentedControl';

/**
 * ⭐ ĐIỂM RẼ NHÁNH SENIOR MODE (ARCHITECTURE.md mục 7.3).
 *
 * Senior mode không phải "cùng màn hình, chữ to hơn" — nó là MỘT MÀN HÌNH KHÁC,
 * chỉ trả lời ba câu: mấy giờ đá, xem kênh nào, tỷ số bao nhiêu.
 *
 * ⚠️ Vì sao rẽ nhánh bằng một component bọc ngoài, không viết
 * "if (t.isSenior) return <SeniorHome />" ngay đầu MatchesTabFull?
 * Vì MatchesTabFull gọi hàng chục hook (useQuery, useState, useLiveScore…).
 * React yêu cầu mỗi lần render phải gọi ĐÚNG CÙNG các hook theo CÙNG thứ tự.
 * Return sớm TRƯỚC khi gọi hết hook -> người dùng bật Senior mode giữa chừng ->
 * lần render sau gọi ít hook hơn -> React báo lỗi "Rendered fewer hooks than
 * expected" và app sập. Tách hai component thì mỗi bên có bộ hook riêng, cố định.
 */
export default function MatchesTab() {
  const t = useTheme();
  return t.isSenior ? <SeniorHome /> : <MatchesTabFull />;
}

function MatchesTabFull() {
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

  /**
   * Phân đoạn danh sách trận đang xem (ARCHITECTURE.md mục 5.2).
   *
   * Mặc định "Sắp diễn ra" vì đó là câu người hâm mộ hỏi nhiều nhất khi mở
   * app: "bao giờ đá tiếp?". Kết quả trận cũ thì họ thường đã biết rồi.
   */
  const [listSegment, setListSegment] = useState<'upcoming' | 'results' | 'standings'>('upcoming');

  /**
   * BXH bảng đấu — CÙNG queryKey với StandingsPanel.
   *
   * Ở đây chỉ cần biết "có giải vòng bảng không" để quyết định có hiện phân
   * đoạn thứ ba hay không (đặc tả 5.8). Nhờ dùng chung khoá, khi người dùng
   * bấm sang phân đoạn đó, StandingsPanel lấy ngay dữ liệu đã có trong cache —
   * không tải lại lần hai.
   */
  const standingsQuery = useQuery({
    queryKey: ['competitions', 'standings', 'current'],
    queryFn: () => competitionsApi.standings(),
    staleTime: 10 * 60 * 1000,
  });
  const hasStandings = Boolean(standingsQuery.data?.season && standingsQuery.data.groups.length > 0);

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
  /**
   * ⭐ BANNER TRANG CHỦ — lá cờ lớn, bông lúa, ba thẻ số liệu ba màu chủ đạo.
   * Toàn bộ nằm ở components/brand/HomeHero.tsx (bản cũ chỉ có tên + hạng FIFA
   * trên một mảng nền trống, người dùng nhận xét là "trống trải").
   */
  const hero = <HomeHero />;

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
            // Phân đoạn thứ ba chỉ xuất hiện khi Việt Nam đang dự giải có vòng bảng
            ...(hasStandings ? [{ value: 'standings' as const, label: 'BXH' }] : []),
          ]}
          value={listSegment}
          onChange={setListSegment}
        />
      </View>

      <View style={{ height: t.spacing.lg }} />

      {/* =================== LỊCH THI ĐẤU =================== */}
      {listSegment === 'standings' ? (
        <StandingsPanel />
      ) : listSegment === 'upcoming' ? (
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
