/**
 * ============================================================================
 * APP/(TABS)/SQUAD.TSX — TAB 2: ĐỘI HÌNH
 * ============================================================================
 *
 * BỐ CỤC:
 *   1. Sơ đồ sân với 11 cầu thủ đá chính  (hình ảnh, dễ nắm bắt nhất)
 *   2. Chú thích màu áo
 *   3. Tổng giá trị đội hình + phân tích theo tuyến
 *   4. Danh sách dự bị
 *
 * Thứ tự này theo nguyên tắc "từ trực quan tới chi tiết": người dùng nhìn
 * sơ đồ hiểu ngay cách bố trí, rồi mới đọc số liệu nếu quan tâm.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Card, SectionHeader, Badge } from '@/components/common/Card';
import { ErrorState, LoadingList, Skeleton } from '@/components/common/States';
import { PlayerAvatar } from '@/components/common/TeamLogo';
import { FormationPitch, PitchLegend } from '@/components/squad/FormationPitch';
import { squadApi } from '@/api/endpoints';
import { formatEuro, POSITION_LABEL, shortenName } from '@/utils/format';
import type { LineupPlayer } from '@/types';
import { HeroBanner } from '@/components/decor';
import { Seo } from '@/components/common/Seo';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { CallUpList } from '@/components/squad/CallUpList';

export default function SquadTab() {
  const t = useTheme();
  const router = useRouter();

  const squadQuery = useQuery({
    queryKey: ['squad', 'current'],
    queryFn: squadApi.current,
    // Đội hình 24 giờ mới đổi một lần (cron job chạy 01:00) -> cache 24 giờ
    staleTime: 24 * 60 * 60 * 1000,
  });

  const valueQuery = useQuery({
    queryKey: ['squad', 'value'],
    queryFn: squadApi.value,
    staleTime: 24 * 60 * 60 * 1000,
  });

  /**
   * ⭐ PHÂN ĐOẠN ĐANG XEM (ARCHITECTURE.md mục 5.3)
   *
   *   'current'    — đội hình dự kiến, chưa có điểm
   *   'last-match' — trận vừa đá, CÓ điểm + thẻ trên đầu cầu thủ
   *   'callup'     — ➕ danh sách TRIỆU TẬP của đợt tập trung (đặc tả 5.8)
   */
  const [segment, setSegment] = useState<'current' | 'last-match' | 'callup'>('current');

  /**
   * Truy vấn đội hình trận vừa đá.
   *
   * ⚠️ `enabled` chỉ bật khi người dùng THẬT SỰ chuyển sang phân đoạn đó.
   * Tải sẵn cả hai ngay từ đầu sẽ tốn một request mà phần lớn người dùng
   * không bao giờ dùng tới — họ mở tab này chủ yếu để xem đội hình dự kiến.
   *
   * React Query giữ cache nên chuyển qua lại giữa hai phân đoạn chỉ gọi mạng
   * đúng một lần cho mỗi bên.
   */
  const lastMatchQuery = useQuery({
    queryKey: ['squad', 'last-match'],
    queryFn: squadApi.lastMatch,
    enabled: segment === 'last-match',
    staleTime: 60 * 60 * 1000, // điểm đã chốt thì không đổi nữa
  });

  const queryClient = useQueryClient();
  const onRefresh = () => {
    void Promise.all([
      squadQuery.refetch(),
      valueQuery.refetch(),
      lastMatchQuery.refetch(),
      // Danh sách triệu tập nằm trong component con -> đánh dấu cũ theo khoá
      queryClient.invalidateQueries({ queryKey: ['callups'] }),
    ]);
  };

  // Dữ liệu đang hiển thị, tuỳ phân đoạn
  const showingLastMatch = segment === 'last-match';
  const activeQuery = showingLastMatch ? lastMatchQuery : squadQuery;
  const starting = showingLastMatch
    ? (lastMatchQuery.data?.starting ?? [])
    : (squadQuery.data?.starting ?? []);
  const bench = showingLastMatch
    ? (lastMatchQuery.data?.bench ?? [])
    : (squadQuery.data?.bench ?? []);

  /**
   * KHỐI HERO — xem giải thích đầy đủ ở app/(tabs)/index.tsx.
   * Màu chữ dùng staticColors vì nền hero luôn sẫm ở CẢ hai chế độ sáng/tối.
   */
  const hero = (
    <HeroBanner minHeight={116}>
      <AppText variant="h2" style={{ color: t.static.white }}>Đội hình ra sân</AppText>
      <AppText variant="caption" style={{ color: t.static.riceGradient[0], marginTop: 2 }}>
        Sơ đồ chiến thuật và danh sách dự bị
      </AppText>
    </HeroBanner>
  );

  return (
    <Screen header={hero} onRefresh={onRefresh} refreshing={squadQuery.isRefetching}>
      {/* Thẻ SEO riêng của màn hình — xem components/common/Seo.tsx */}
      <Seo
        title="Đội hình ra sân"
        description="Sơ đồ chiến thuật, danh sách đá chính và dự bị của Đội tuyển Việt Nam ở trận gần nhất, kèm tổng giá trị đội hình theo định giá chuyển nhượng."
        path="/squad"
      />
      {/* Khoảng thở giữa hero và nội dung */}
      <View style={{ height: t.spacing.lg }} />

      {/* =================== THANH CHỌN PHÂN ĐOẠN =================== */}
      <SegmentedControl
        segments={[
          // 'Dự kiến' thay cho 'Đội hình dự kiến': ba phân đoạn trên màn 360px, nhãn dài bị cắt '…'
          { value: 'current', label: 'Dự kiến' },
          {
            value: 'last-match',
            label: 'Trận vừa đá',
            /**
             * Chấm đỏ "Mới" khi có điểm mà người dùng chưa xem.
             * Ở đây đơn giản hoá: hiện chấm khi đã tải được dữ liệu trận.
             * Đặc tả gốc muốn chấm trong 48 giờ sau trận — cần lưu mốc "đã xem"
             * vào bộ nhớ thiết bị, để làm ở bước sau.
             */
            showDot: lastMatchQuery.data != null && segment !== 'last-match',
          },
          { value: 'callup', label: 'Triệu tập' },
        ]}
        value={segment}
        onChange={setSegment}
      />

      {/* Tỷ số trận đang xem — chỉ hiện ở phân đoạn "Trận vừa đá" */}
      {showingLastMatch && lastMatchQuery.data && (
        <View style={{ alignItems: 'center', marginTop: t.spacing.md }}>
          <AppText variant="label" tabular>
            {lastMatchQuery.data.match.home_name} {lastMatchQuery.data.match.home_score}
            {' – '}
            {lastMatchQuery.data.match.away_score} {lastMatchQuery.data.match.away_name}
          </AppText>
          <AppText variant="caption" tone="faint">
            Chạm vào cầu thủ để xem vì sao có điểm đó
          </AppText>
        </View>
      )}

      <View style={{ height: t.spacing.md }} />

      {/*
        ➕ PHÂN ĐOẠN TRIỆU TẬP — thay TOÀN BỘ phần sơ đồ sân + giá trị đội hình.
        Danh sách triệu tập là một khái niệm khác đội hình ra sân (xem đầu file
        components/squad/CallUpList.tsx), nên không trộn chung một giao diện.
      */}
      {segment === 'callup' ? (
        <CallUpList />
      ) : (
      <>
      {/* =================== SƠ ĐỒ SÂN =================== */}
      {activeQuery.isLoading ? (
        <Skeleton width="100%" height={480} radius={t.radius.lg} />
      ) : activeQuery.isError ? (
        <ErrorState
          message={activeQuery.error instanceof Error ? activeQuery.error.message : undefined}
          onRetry={() => void activeQuery.refetch()}
        />
      ) : starting.length > 0 ? (
        <>
          <FormationPitch
            players={starting}
            formation={squadQuery.data?.formation ?? '—'}
            onPlayerPress={(id) => router.push(`/player/${id}`)}
          />
          <PitchLegend />

          {/* =================== TỔNG GIÁ TRỊ =================== */}
          <SectionHeader title="Giá trị đội hình" />

          {valueQuery.isLoading ? (
            <Skeleton width="100%" height={150} radius={t.radius.lg} />
          ) : valueQuery.data ? (
            <Card>
              {/* Con số lớn nhất — điểm nhấn của thẻ */}
              <View style={{ alignItems: 'center', paddingBottom: t.spacing.lg }}>
                <AppText variant="overline" tone="muted">
                  Tổng giá trị chuyển nhượng
                </AppText>
                <AppText variant="h1" tabular tone="accent" style={{ marginTop: 4 }}>
                  {formatEuro(valueQuery.data.total_eur)}
                </AppText>
                <AppText variant="caption" tone="faint" tabular>
                  {valueQuery.data.total_players} cầu thủ · trung bình{' '}
                  {formatEuro(valueQuery.data.average_eur)}
                </AppText>
              </View>

              {/*
                PHÂN TÍCH THEO TUYẾN — dạng thanh ngang.
                Chọn thanh ngang thay vì biểu đồ tròn vì: dễ so sánh độ dài
                hơn là so sánh diện tích các múi, và đọc được nhãn thoải mái.
              */}
              <View style={{ gap: t.spacing.md, borderTopWidth: 1, borderTopColor: t.colors.border, paddingTop: t.spacing.lg }}>
                {valueQuery.data.by_position.map((pos) => {
                  // Tính % so với tuyến đắt nhất -> thanh dài nhất luôn đầy khung
                  const max = Math.max(...valueQuery.data!.by_position.map((p) => p.total_eur));
                  const widthPct = max > 0 ? (pos.total_eur / max) * 100 : 0;

                  return (
                    <View key={pos.position} style={{ gap: 5 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <AppText variant="label">
                          {pos.label}{' '}
                          <AppText variant="caption" tone="faint" tabular>
                            ({pos.count})
                          </AppText>
                        </AppText>
                        <AppText variant="label" tabular tone="muted">
                          {formatEuro(pos.total_eur)}
                        </AppText>
                      </View>

                      {/* Rãnh nền + thanh giá trị bên trong */}
                      <View
                        style={{
                          height: 6,
                          backgroundColor: t.colors.surfaceSunken,
                          borderRadius: 3,
                          overflow: 'hidden',
                        }}
                      >
                        <View
                          style={{
                            width: `${widthPct}%`,
                            height: '100%',
                            backgroundColor: t.colors.accent,
                            borderRadius: 3,
                          }}
                        />
                      </View>
                    </View>
                  );
                })}
              </View>
            </Card>
          ) : null}

          {/* =================== DANH SÁCH DỰ BỊ =================== */}
          {/*
            Dùng biến `bench` đã tính sẵn ở đầu component, KHÔNG đọc thẳng
            squadQuery.data.bench — vì ở phân đoạn "Trận vừa đá" thì danh sách
            dự bị phải lấy từ lastMatchQuery (và cầu thủ vào sân thay người
            cũng có điểm riêng của họ).
          */}
          <SectionHeader title={`Dự bị (${bench.length})`} />

          <Card padded={false}>
            {bench.map((player, index) => (
              <BenchRow
                key={player.id}
                player={player}
                last={index === bench.length - 1}
                onPress={() => router.push(`/player/${player.player_id}`)}
              />
            ))}
          </Card>
        </>
      ) : (
        <LoadingList count={2} />
      )}
      </>
      )}
    </Screen>
  );
}

/**
 * MỘT DÒNG CẦU THỦ DỰ BỊ.
 *
 * Bố cục 3 phần: [ảnh + số áo] [tên + CLB] [vị trí]
 * Cột giữa dùng flex:1 để "nuốt" hết chỗ trống, đẩy cột phải ra sát mép.
 */
function BenchRow({
  player,
  last,
  onPress,
}: {
  player: LineupPlayer;
  last: boolean;
  onPress: () => void;
}) {
  const t = useTheme();

  return (
    <Card
      onPress={onPress}
      padded={false}
      style={{
        borderWidth: 0,
        borderRadius: 0,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
        backgroundColor: 'transparent',
      }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.md,
          padding: t.spacing.md,
        }}
      >
        <PlayerAvatar
          uri={player.photo_url}
          name={player.full_name}
          size={44}
          shirtNumber={player.shirt_number}
        />

        <View style={{ flex: 1, gap: 1 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {shortenName(player.full_name, player.short_name)}
          </AppText>
          <AppText variant="caption" tone="faint" numberOfLines={1}>
            {player.current_club ?? '—'}
          </AppText>
        </View>

        <Badge label={POSITION_LABEL[player.position] ?? player.position} tone="neutral" size="sm" />
      </View>
    </Card>
  );
}
