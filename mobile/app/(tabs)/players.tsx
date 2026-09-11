/**
 * ============================================================================
 * APP/(TABS)/PLAYERS.TSX — TAB 3: CẦU THỦ & HUẤN LUYỆN VIÊN
 * ============================================================================
 *
 * HAI KỸ THUẬT QUAN TRỌNG Ở MÀN HÌNH NÀY:
 *
 * 1. DEBOUNCE Ô TÌM KIẾM
 *    Gõ "quang hải" là 9 lần thay đổi -> 9 request tới server!
 *    Debounce = "chờ người dùng ngừng gõ 350ms rồi mới gọi".
 *    Kết quả: 9 request giảm còn 1.
 *
 * 2. DÙNG FlatList, KHÔNG DÙNG map() TRONG ScrollView
 *    ScrollView + map dựng TOÀN BỘ danh sách ngay lập tức. 26 cầu thủ thì
 *    không sao, nhưng 500 dòng là app đơ.
 *    FlatList chỉ dựng những dòng ĐANG NHÌN THẤY, cuộn tới đâu dựng tới đó.
 *    Đây gọi là "virtualization" (ảo hoá danh sách).
 */

import { useMemo, useState } from 'react';
import { FlatList, TextInput, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Card, Badge } from '@/components/common/Card';
import { EmptyState, ErrorState, PlayerRowSkeleton } from '@/components/common/States';
import { PlayerAvatar } from '@/components/common/TeamLogo';
import { playersApi } from '@/api/endpoints';
import { useDebounce } from '@/hooks/useDebounce';
import { formatEuro, POSITION_LABEL, shortenName } from '@/utils/format';
import type { Player, PlayerPosition } from '@/types';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';

/** Các nút lọc. null = xem tất cả */
const FILTERS: Array<{ value: PlayerPosition | null; label: string }> = [
  { value: null, label: 'Tất cả' },
  { value: 'GK', label: 'Thủ môn' },
  { value: 'DF', label: 'Hậu vệ' },
  { value: 'MF', label: 'Tiền vệ' },
  { value: 'FW', label: 'Tiền đạo' },
];

export default function PlayersTab() {
  const t = useTheme();
  const router = useRouter();

  const [search, setSearch] = useState('');
  const [position, setPosition] = useState<PlayerPosition | null>(null);

  // Chờ 350ms sau khi ngừng gõ mới gọi API
  const debouncedSearch = useDebounce(search, 350);

  const playersQuery = useQuery({
    // queryKey chứa cả bộ lọc -> đổi bộ lọc là React Query tự coi đây là
    // dữ liệu KHÁC và đi gọi lại. Đồng thời kết quả cũ vẫn nằm trong cache,
    // quay lại bộ lọc trước là hiện ngay tức thì.
    queryKey: ['players', position, debouncedSearch],
    queryFn: () =>
      playersApi.list({
        position: position ?? undefined,
        search: debouncedSearch || undefined,
        limit: 50,
      }),
  });

  const coachQuery = useQuery({
    queryKey: ['coach'],
    queryFn: playersApi.coach,
    staleTime: 24 * 60 * 60 * 1000,
  });

  const players = playersQuery.data?.data.players ?? [];

  /**
   * Phần đầu danh sách (thẻ HLV + ô tìm kiếm + nút lọc) được truyền vào
   * ListHeaderComponent của FlatList thay vì đặt ngoài.
   * Lý do: như vậy nó cuộn CÙNG danh sách, không bị "dính" cứng ở trên.
   *
   * useMemo để không dựng lại phần đầu mỗi lần cuộn.
   */
  const header = useMemo(
    () => (
      <View style={{ gap: t.spacing.lg, paddingBottom: t.spacing.md }}>
        {/* ---------- Tiêu đề ---------- */}
        <View style={{ paddingTop: t.spacing.md }}>
          <AppText variant="h2">Cầu thủ & HLV</AppText>
          <AppText variant="caption" tone="muted">
            Danh sách triệu tập đội tuyển quốc gia
          </AppText>
        </View>

        {/* ---------- Thẻ huấn luyện viên ---------- */}
        {coachQuery.data && (
          <Card>
            <View style={{ flexDirection: 'row', gap: t.spacing.md, alignItems: 'center' }}>
              <PlayerAvatar
                uri={coachQuery.data.coach.photo_url}
                name={coachQuery.data.coach.full_name}
                size={56}
              />

              <View style={{ flex: 1, gap: 2 }}>
                <Badge label="HLV TRƯỞNG" tone="accent" size="sm" />
                <AppText variant="h3" style={{ marginTop: 2 }}>
                  {coachQuery.data.coach.full_name}
                </AppText>
                <AppText variant="caption" tone="muted">
                  {coachQuery.data.coach.nationality}
                  {coachQuery.data.coach.age ? ` · ${coachQuery.data.coach.age} tuổi` : ''}
                  {coachQuery.data.coach.tenure_text
                    ? ` · tại vị ${coachQuery.data.coach.tenure_text}`
                    : ''}
                </AppText>
              </View>
            </View>

            {/* Thành tích — chỉ hiện khi có, không để mảng rỗng tạo khoảng trống */}
            {coachQuery.data.coach.achievements?.length > 0 && (
              <View
                style={{
                  marginTop: t.spacing.md,
                  paddingTop: t.spacing.md,
                  borderTopWidth: 1,
                  borderTopColor: t.colors.border,
                  gap: 6,
                }}
              >
                {coachQuery.data.coach.achievements.slice(0, 3).map((item, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 6, alignItems: 'flex-start' }}>
                    <Ionicons
                      name="trophy"
                      size={12}
                      color={t.colors.gold}
                      style={{ marginTop: 3 }}
                    />
                    <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
                      {item}
                    </AppText>
                  </View>
                ))}
              </View>
            )}
          </Card>
        )}

        {/* ---------- Ô TÌM KIẾM ---------- */}
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.sm,
            backgroundColor: t.colors.surfaceSunken,
            borderRadius: t.radius.md,
            borderWidth: 1,
            borderColor: t.colors.border,
            paddingHorizontal: t.spacing.md,
            height: 44, // đúng chiều cao vùng chạm tối thiểu
          }}
        >
          <Ionicons name="search" size={17} color={t.colors.textFaint} />

          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Tìm theo tên hoặc câu lạc bộ..."
            placeholderTextColor={t.colors.textFaint}
            style={{
              flex: 1,
              color: t.colors.text,
              fontSize: t.fontSize.base,
              // Bỏ padding mặc định của Android để chữ căn giữa đúng
              paddingVertical: 0,
            }}
            // Tắt tự viết hoa và tự sửa chính tả: tên riêng hay bị sửa sai
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            accessibilityLabel="Ô tìm kiếm cầu thủ"
          />

          {/* Nút xoá chỉ hiện khi đã gõ gì đó */}
          {search.length > 0 && (
            <Ionicons
              name="close-circle"
              size={17}
              color={t.colors.textFaint}
              onPress={() => setSearch('')}
              suppressHighlighting
            />
          )}
        </View>

        {/* ---------- NÚT LỌC THEO TUYẾN ---------- */}
        <FlatList
          data={FILTERS}
          keyExtractor={(item) => item.label}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: t.spacing.sm }}
          renderItem={({ item }) => {
            const active = position === item.value;

            return (
              <Card
                onPress={() => setPosition(item.value)}
                padded={false}
                style={{
                  // Trạng thái được chọn đổi CẢ nền LẪN viền -> nhìn là biết ngay
                  backgroundColor: active ? t.colors.accent : t.colors.surface,
                  borderColor: active ? t.colors.accent : t.colors.border,
                  borderRadius: t.radius.pill,
                  paddingHorizontal: t.spacing.lg,
                  paddingVertical: t.spacing.sm,
                }}
              >
                <AppText
                  variant="label"
                  style={{ color: active ? t.colors.accentFg : t.colors.textMuted }}
                >
                  {item.label}
                </AppText>
              </Card>
            );
          }}
        />

        {/* ---------- Số lượng kết quả ---------- */}
        {!playersQuery.isLoading && (
          <AppText variant="caption" tone="faint" tabular>
            {playersQuery.data?.meta?.total ?? players.length} cầu thủ
          </AppText>
        )}
      </View>
    ),
    [t, coachQuery.data, search, position, playersQuery.isLoading, playersQuery.data, players.length]
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={['top']}>
      <StatusBar style={t.isDark ? 'light' : 'dark'} />

      <FlatList
        data={players}
        keyExtractor={(item) => String(item.id)}
        ListHeaderComponent={header}
        contentContainerStyle={{
          paddingHorizontal: t.spacing.lg,
          paddingBottom: t.spacing.xxxl,
        }}
        showsVerticalScrollIndicator={false}
        onRefresh={() => void playersQuery.refetch()}
        refreshing={playersQuery.isRefetching}
        renderItem={({ item }) => (
          <PlayerRow player={item} onPress={() => router.push(`/player/${item.id}`)} />
        )}
        // Ba trạng thái khi danh sách trống: đang tải / lỗi / không có kết quả
        ListEmptyComponent={
          playersQuery.isLoading ? (
            <View>
              {Array.from({ length: 6 }).map((_, i) => (
                <PlayerRowSkeleton key={i} />
              ))}
            </View>
          ) : playersQuery.isError ? (
            <ErrorState
              message={
                playersQuery.error instanceof Error ? playersQuery.error.message : undefined
              }
              onRetry={() => void playersQuery.refetch()}
            />
          ) : (
            <EmptyState
              icon="search-outline"
              title="Không tìm thấy cầu thủ"
              message={
                debouncedSearch
                  ? `Không có kết quả cho "${debouncedSearch}". Thử từ khoá khác xem sao.`
                  : 'Chưa có cầu thủ nào ở vị trí này.'
              }
            />
          )
        }
      />
    </SafeAreaView>
  );
}

/** Một dòng cầu thủ trong danh sách */
function PlayerRow({ player, onPress }: { player: Player; onPress: () => void }) {
  const t = useTheme();

  return (
    <Card
      onPress={onPress}
      padded={false}
      style={{ marginBottom: t.spacing.sm }}
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
          size={48}
          shirtNumber={player.shirt_number}
        />

        <View style={{ flex: 1, gap: 2 }}>
          <AppText variant="bodyBold" numberOfLines={1}>
            {shortenName(player.full_name, player.short_name)}
          </AppText>
          <AppText variant="caption" tone="faint" numberOfLines={1}>
            {POSITION_LABEL[player.position]}
            {player.age ? ` · ${player.age} tuổi` : ''}
            {player.current_club ? ` · ${player.current_club}` : ''}
          </AppText>
        </View>

        {/* Cột phải: giá trị + số trận. Căn phải để dễ so sánh theo cột dọc. */}
        <View style={{ alignItems: 'flex-end', gap: 2 }}>
          <AppText variant="label" tabular tone="accent">
            {formatEuro(player.market_value_eur)}
          </AppText>
          <AppText variant="caption" tone="faint" tabular>
            {player.caps} trận · {player.goals} bàn
          </AppText>
        </View>
      </View>
    </Card>
  );
}
