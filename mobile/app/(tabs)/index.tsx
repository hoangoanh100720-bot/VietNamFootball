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

import { useCallback } from 'react';
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

  return (
    <Screen onRefresh={onRefresh} refreshing={isRefreshing}>
      {/* =================== TIÊU ĐỀ MÀN HÌNH =================== */}
      <View
        style={{
          paddingTop: t.spacing.md,
          paddingBottom: t.spacing.lg,
          flexDirection: 'row',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          gap: t.spacing.md,
        }}
      >
        <View style={{ flex: 1 }}>
        <AppText variant="h2">Đội tuyển Việt Nam</AppText>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 }}>
          {rankingQuery.isLoading ? (
            <Skeleton width={140} height={13} />
          ) : vietnamRank ? (
            <>
              <Ionicons name="trophy-outline" size={13} color={t.colors.textMuted} />
              <AppText variant="caption" tone="muted" tabular>
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

        {/* Nút tài khoản ở góc phải */}
        <AccountButton />
      </View>

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

      {/* =================== LỊCH THI ĐẤU =================== */}
      <SectionHeader title="Lịch thi đấu sắp tới" />

      {upcomingQuery.isLoading ? (
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
      )}

      {/* =================== KẾT QUẢ GẦN ĐÂY =================== */}
      <SectionHeader title="Kết quả gần đây" />

      {resultsQuery.isLoading ? (
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
