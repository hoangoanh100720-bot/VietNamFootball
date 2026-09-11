/**
 * ============================================================================
 * APP/PLAYER/[ID].TSX — HỒ SƠ CẦU THỦ
 * ============================================================================
 *
 * Hiển thị đúng những gì mục 4.2 của ARCHITECTURE.md yêu cầu:
 * quê quán, tuổi, chiều cao, vị trí, số áo, giá trị chuyển nhượng,
 * và lịch sử thi đấu ở các câu lạc bộ.
 *
 * ----------------------------------------------------------------------------
 * QUYẾT ĐỊNH THIẾT KẾ: BỐ CỤC "ẢNH LỚN Ở ĐẦU" (hero)
 *
 * Ảnh + tên + số áo chiếm trọn phần đầu màn hình, đặt trên nền tối chuyển sắc.
 * Vì sao? Đây là màn hình VỀ MỘT CON NGƯỜI. Danh tính phải là thứ đầu tiên và
 * rõ ràng nhất. Số liệu chi tiết xếp bên dưới, dạng bảng gọn gàng.
 */

import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, Stack } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Card, SectionHeader, InfoRow, Badge } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { PlayerAvatar } from '@/components/common/TeamLogo';
import { playersApi } from '@/api/endpoints';
import { formatDate, formatEuro, POSITION_LABEL } from '@/utils/format';

export default function PlayerDetailScreen() {
  const t = useTheme();
  const { id } = useLocalSearchParams<{ id: string }>();
  const playerId = Number(id);

  const query = useQuery({
    queryKey: ['player', playerId],
    queryFn: () => playersApi.detail(playerId),
    enabled: Number.isFinite(playerId) && playerId > 0,
    staleTime: 24 * 60 * 60 * 1000,
  });

  if (query.isLoading) {
    return (
      <Screen>
        <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.lg }}>
          <Skeleton width="100%" height={190} radius={t.radius.lg} />
          <Skeleton width="100%" height={260} radius={t.radius.lg} />
        </View>
      </Screen>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Screen>
        <ErrorState
          title="Không tải được hồ sơ"
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      </Screen>
    );
  }

  const { player, clubs } = query.data;

  /** Chuyển 'left'/'right'/'both' sang tiếng Việt */
  const footLabel =
    player.preferred_foot === 'left' ? 'Chân trái'
    : player.preferred_foot === 'right' ? 'Chân phải'
    : player.preferred_foot === 'both' ? 'Hai chân'
    : '—';

  return (
    <>
      <Stack.Screen options={{ title: player.short_name ?? 'Cầu thủ' }} />

      <Screen edges={[]} padded={false}>
        {/* ================= PHẦN ĐẦU: ẢNH + TÊN ================= */}
        <LinearGradient
          colors={t.static.heroGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingVertical: t.spacing.xxl,
            paddingHorizontal: t.spacing.lg,
            alignItems: 'center',
            gap: t.spacing.md,
          }}
        >
          <PlayerAvatar
            uri={player.photo_url}
            name={player.full_name}
            size={104}
            shirtNumber={player.shirt_number}
          />

          <View style={{ alignItems: 'center', gap: 4 }}>
            <AppText variant="h2" center style={{ color: '#FFFFFF' }}>
              {player.full_name}
            </AppText>

            <View style={{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'center' }}>
              <Badge label={POSITION_LABEL[player.position] ?? player.position} tone="accent" size="sm" />
              {/* Thủ môn chỉ có một vị trí -> bỏ dòng trùng "Thủ môn Thủ môn" */}
              {player.detailed_position &&
                player.detailed_position !== POSITION_LABEL[player.position] && (
                <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.7)' }}>
                  {player.detailed_position}
                </AppText>
              )}
            </View>
          </View>

          {/* Ba số liệu nổi bật nhất — đặt ngay dưới tên để thấy tức thì */}
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.xl,
              marginTop: t.spacing.sm,
              paddingTop: t.spacing.lg,
              borderTopWidth: 1,
              borderTopColor: 'rgba(255,255,255,0.12)',
              width: '100%',
              justifyContent: 'center',
            }}
          >
            <HeroStat label="Trận" value={String(player.caps)} />
            <HeroStat label="Bàn thắng" value={String(player.goals)} />
            <HeroStat label="Giá trị" value={formatEuro(player.market_value_eur)} />
          </View>
        </LinearGradient>

        <View style={{ paddingHorizontal: t.spacing.lg }}>
          {/* ================= THÔNG TIN CÁ NHÂN ================= */}
          <SectionHeader title="Thông tin cá nhân" />

          <Card>
            <InfoRow label="Quê quán" value={player.hometown ?? '—'} />
            <InfoRow
              label="Ngày sinh"
              value={
                player.birth_date
                  ? `${formatDate(player.birth_date)}${player.age ? ` (${player.age} tuổi)` : ''}`
                  : '—'
              }
              tabular
            />
            <InfoRow
              label="Chiều cao"
              value={player.height_cm ? `${player.height_cm} cm` : '—'}
              tabular
            />
            <InfoRow
              label="Cân nặng"
              value={player.weight_kg ? `${player.weight_kg} kg` : '—'}
              tabular
            />
            <InfoRow label="Chân thuận" value={footLabel} />
            <InfoRow
              label="Số áo"
              value={player.shirt_number ? `Số ${player.shirt_number}` : '—'}
              tabular
            />
            <InfoRow label="CLB hiện tại" value={player.current_club ?? '—'} last />
          </Card>

          {/* ================= LỊCH SỬ CLB ================= */}
          <SectionHeader title="Lịch sử thi đấu" />

          {clubs.length === 0 ? (
            <EmptyState
              icon="shirt-outline"
              title="Chưa có dữ liệu câu lạc bộ"
              message="Thông tin sẽ được bổ sung khi đồng bộ dữ liệu."
            />
          ) : (
            <Card padded={false}>
              {clubs.map((club, i) => {
                const isCurrent = club.to_date === null;

                return (
                  <View
                    key={club.id}
                    style={{
                      flexDirection: 'row',
                      gap: t.spacing.md,
                      padding: t.spacing.md,
                      borderBottomWidth: i === clubs.length - 1 ? 0 : 1,
                      borderBottomColor: t.colors.border,
                      alignItems: 'center',
                    }}
                  >
                    {/*
                      Chấm tròn dòng thời gian: CLB hiện tại tô đặc màu nhấn,
                      CLB cũ chỉ có viền rỗng. Khác biệt hình dạng + màu.
                    */}
                    <View
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: 5,
                        backgroundColor: isCurrent ? t.colors.accent : 'transparent',
                        borderWidth: isCurrent ? 0 : 2,
                        borderColor: t.colors.borderStrong,
                      }}
                    />

                    <View style={{ flex: 1, gap: 2 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                        <AppText variant="bodyBold" numberOfLines={1} style={{ flexShrink: 1 }}>
                          {club.club_name}
                        </AppText>
                        {isCurrent && <Badge label="HIỆN TẠI" tone="accent" size="sm" />}
                        {club.is_loan && <Badge label="CHO MƯỢN" tone="neutral" size="sm" />}
                      </View>

                      <AppText variant="caption" tone="faint" tabular>
                        {club.from_date ? formatDate(club.from_date) : '?'} —{' '}
                        {club.to_date ? formatDate(club.to_date) : 'nay'}
                      </AppText>
                    </View>

                    {/* Số liệu ra sân, căn phải */}
                    <View style={{ alignItems: 'flex-end' }}>
                      <AppText variant="label" tabular>
                        {club.apps}
                      </AppText>
                      <AppText variant="caption" tone="faint">
                        trận
                      </AppText>
                    </View>

                    <View style={{ alignItems: 'flex-end', minWidth: 32 }}>
                      <AppText variant="label" tabular tone="accent">
                        {club.goals}
                      </AppText>
                      <AppText variant="caption" tone="faint">
                        bàn
                      </AppText>
                    </View>
                  </View>
                );
              })}
            </Card>
          )}

          <View style={{ height: t.spacing.xxxl }} />
        </View>
      </Screen>
    </>
  );
}

/** Ô số liệu trong phần đầu (nền tối) */
function HeroStat({ label, value }: { label: string; value: string }) {
  const t = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <AppText variant="h3" tabular style={{ color: '#FFFFFF' }}>
        {value}
      </AppText>
      <AppText variant="caption" style={{ color: 'rgba(255,255,255,0.6)' }}>
        {label}
      </AppText>
    </View>
  );
}
