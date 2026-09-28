/**
 * ============================================================================
 * COMPONENTS/STATS/STATSPANEL.TSX — NỘI DUNG KHUNG ① "THỐNG KÊ SAU TRẬN"
 * ============================================================================
 *
 * Ghép ba khối theo đúng thứ tự đặc tả 5.6:
 *
 *   1. Trận vừa đá  (LastMatchCard)       ← /stats/overview
 *   2. BXH cầu thủ  (PlayerLeaderboard)   ← /stats/players/leaderboard
 *   3. Các trận đã đá (danh sách, tải thêm) ← /stats/matches?cursor
 *
 * ----------------------------------------------------------------------------
 * ⭐ VÌ SAO "TẢI THÊM" LÀ NÚT BẤM, KHÔNG PHẢI TỰ TẢI KHI CUỘN TỚI ĐÁY?
 *
 *   1. Senior mode (mục 7.2): "Mọi thao tác đều có nút bấm". Tự tải khi cuộn
 *      là một cử chỉ vô hình — người lớn tuổi không biết nó tồn tại.
 *   2. Danh sách này nằm TRONG một ScrollView dọc lồng trong băng chuyền ngang.
 *      Bắt sự kiện "cuộn tới đáy" qua hai tầng lồng nhau rất dễ bắn nhiều lần
 *      liên tiếp -> tải trùng trang.
 *   3. Chân trang có nút thì người dùng luôn chạm tới được phần dưới cùng
 *      (nếu có) — danh sách vô hạn thì không bao giờ.
 * ============================================================================
 */

import { Pressable, View } from 'react-native';
import { useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Badge, Card, SectionHeader } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { Button } from '@/components/common/Button';
import { LastMatchCard } from './LastMatchCard';
import { PlayerLeaderboard } from './PlayerLeaderboard';
import { statsApi } from '@/api/endpoints';
import { formatDateShort, formatDayMonth } from '@/utils/format';
import type { StatsMatch } from '@/types';

const RESULT_SHORT = { win: 'T', draw: 'H', lose: 'B' } as const;
const RESULT_WORD = { win: 'Thắng', draw: 'Hoà', lose: 'Thua' } as const;

export function StatsPanel() {
  const t = useTheme();

  const overview = useQuery({
    queryKey: ['stats', 'overview'],
    queryFn: statsApi.overview,
    // Ngắn: sau trận, điểm cầu thủ còn được đính chính trong vài phút đầu
    staleTime: 60 * 1000,
  });

  /**
   * useInfiniteQuery — React Query tự GHÉP các trang lại với nhau.
   *
   *   initialPageParam: undefined     -> trang đầu không có cursor
   *   getNextPageParam: nextCursor    -> trang sau dùng cursor trang trước
   *                     trả undefined -> React Query hiểu là HẾT, hasNextPage = false
   *
   * `?? undefined` chuyển null (API nói "hết rồi") sang undefined (cách React
   * Query hiểu "hết rồi"). Quên chuyển thì React Query tưởng null là một cursor
   * hợp lệ và gọi thêm một trang rỗng mãi mãi.
   */
  const matches = useInfiniteQuery({
    queryKey: ['stats', 'matches'],
    queryFn: ({ pageParam }) => statsApi.matches(pageParam, 8),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (last) => last.nextCursor ?? undefined,
    staleTime: 5 * 60 * 1000,
  });

  const allMatches = matches.data?.pages.flatMap((p) => p.matches) ?? [];

  return (
    <View>
      {/* =================== 1. TRẬN VỪA ĐÁ =================== */}
      {overview.isLoading ? (
        <Skeleton height={320} radius={t.radius.lg} />
      ) : overview.isError ? (
        <ErrorState title="Không tải được thống kê" onRetry={() => void overview.refetch()} />
      ) : overview.data?.lastMatch ? (
        <LastMatchCard match={overview.data.lastMatch} motm={overview.data.manOfTheMatch} />
      ) : (
        <EmptyState
          icon="stats-chart-outline"
          title="Chưa có trận nào"
          message="Thống kê sẽ xuất hiện ngay sau trận đấu đầu tiên của đội tuyển."
        />
      )}

      {/* =================== 2. BXH CẦU THỦ =================== */}
      <SectionHeader title="Bảng xếp hạng cầu thủ" />
      <PlayerLeaderboard />

      {/* =================== 3. CÁC TRẬN ĐÃ ĐÁ =================== */}
      <SectionHeader title="Các trận đã đá" />
      {matches.isLoading ? (
        <View style={{ gap: t.spacing.sm }}>
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} height={64} radius={t.radius.md} />
          ))}
        </View>
      ) : matches.isError ? (
        <ErrorState title="Không tải được danh sách trận" onRetry={() => void matches.refetch()} />
      ) : allMatches.length === 0 ? (
        <EmptyState icon="calendar-outline" title="Chưa có trận nào đã đá" />
      ) : (
        <Card padded={false}>
          {allMatches.map((m, i) => (
            <MatchStatsRow key={m.id} match={m} last={i === allMatches.length - 1} />
          ))}
        </Card>
      )}

      {matches.hasNextPage && (
        <View style={{ marginTop: t.spacing.md }}>
          <Button
            label="Xem thêm trận"
            variant="ghost"
            icon="chevron-down"
            fullWidth
            loading={matches.isFetchingNextPage}
            onPress={() => void matches.fetchNextPage()}
          />
        </View>
      )}
    </View>
  );
}

/**
 * Một dòng trận đã đá:  15/09  [T]  VIE 3–0 LAO   62% · 18 sút
 *
 * Thông số in NHỎ ở bên phải và chỉ khi có — người lướt danh sách quan tâm
 * tỷ số trước tiên; thông số là lớp thông tin thứ hai.
 */
function MatchStatsRow({ match, last }: { match: StatsMatch; last: boolean }) {
  const t = useTheme();
  const router = useRouter();

  const vie = match.vietnam_is_home ? match.home_stats : match.away_stats;
  const extra = [
    vie?.possession_pct != null ? `${vie.possession_pct}%` : null,
    vie?.shots != null ? `${vie.shots} sút` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <Pressable
      onPress={() => router.push(`/match/${match.id}`)}
      accessibilityRole="button"
      accessibilityLabel={
        `${RESULT_WORD[match.result]}: ${match.home_team.name} ${match.home_score}, ` +
        `${match.away_team.name} ${match.away_score}, ngày ${formatDateShort(match.kickoff_at)}`
      }
      style={({ pressed }) => ({
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        minHeight: t.touchTarget + 12,
        paddingHorizontal: t.spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
        backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent',
      })}
    >
      <AppText variant="caption" tone="faint" tabular style={{ width: 42 }}>
        {formatDayMonth(match.kickoff_at)}
      </AppText>

      {/* Chữ T/H/B trong huy hiệu màu — chữ là kênh chính, màu là kênh phụ */}
      <Badge label={RESULT_SHORT[match.result]} tone={match.result} size="sm" />

      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold" tabular numberOfLines={1}>
          {match.home_team.fifa_code ?? match.home_team.name} {match.home_score}–{match.away_score}{' '}
          {match.away_team.fifa_code ?? match.away_team.name}
        </AppText>
        <AppText variant="caption" tone="faint" numberOfLines={1}>
          {match.competition}
        </AppText>
      </View>

      {extra !== '' && (
        <AppText variant="caption" tone="muted" tabular>
          {extra}
        </AppText>
      )}
    </Pressable>
  );
}
