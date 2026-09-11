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

import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
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

  const onRefresh = () => {
    void Promise.all([squadQuery.refetch(), valueQuery.refetch()]);
  };

  return (
    <Screen onRefresh={onRefresh} refreshing={squadQuery.isRefetching}>
      {/* =================== TIÊU ĐỀ =================== */}
      <View style={{ paddingTop: t.spacing.md, paddingBottom: t.spacing.lg }}>
        <AppText variant="h2">Đội hình ra sân</AppText>
        <AppText variant="caption" tone="muted">
          Sơ đồ chiến thuật và danh sách dự bị
        </AppText>
      </View>

      {/* =================== SƠ ĐỒ SÂN =================== */}
      {squadQuery.isLoading ? (
        <Skeleton width="100%" height={480} radius={t.radius.lg} />
      ) : squadQuery.isError ? (
        <ErrorState
          message={squadQuery.error instanceof Error ? squadQuery.error.message : undefined}
          onRetry={() => void squadQuery.refetch()}
        />
      ) : squadQuery.data ? (
        <>
          <FormationPitch
            players={squadQuery.data.starting}
            formation={squadQuery.data.formation}
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
          <SectionHeader title={`Dự bị (${squadQuery.data.bench.length})`} />

          <Card padded={false}>
            {squadQuery.data.bench.map((player, index) => (
              <BenchRow
                key={player.id}
                player={player}
                last={index === squadQuery.data!.bench.length - 1}
                onPress={() => router.push(`/player/${player.player_id}`)}
              />
            ))}
          </Card>
        </>
      ) : (
        <LoadingList count={2} />
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
