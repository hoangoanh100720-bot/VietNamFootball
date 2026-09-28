/**
 * ============================================================================
 * COMPONENTS/STATS/PLAYERLEADERBOARD.TSX — BẢNG XẾP HẠNG CẦU THỦ
 * ============================================================================
 *
 *   BẢNG XẾP HẠNG CẦU THỦ           [2026 ▾]
 *   [Điểm TB] [Bàn] [Kiến tạo] [Xuất sắc]      ◄ chọn chỉ số
 *   1   Xuân Son      8.8   · 1 trận
 *   2   Hoàng Đức     8.0   · 1 trận
 *   2   Quang Hải     8.0   · 1 trận            ◄ ĐỒNG HẠNG hiện cùng số 2
 *   Chỉ xếp hạng cầu thủ đá tối thiểu 90 phút    ◄ nói rõ luật (mục 12.5)
 *
 * ----------------------------------------------------------------------------
 * ⚠️ VÌ SAO KHÔNG TỰ ĐÁNH SỐ HẠNG BẰNG index + 1?
 *
 * Vì sẽ sai khi đồng hạng. Server đã tính `rank` bằng RANK() của SQL: hai cầu
 * thủ cùng 8.0 điểm đều hạng 2, người kế tiếp hạng 4. Đánh số bằng index thì
 * ra 2 và 3 — người hâm mộ cầu thủ "hạng 3" sẽ (có lý) hỏi vì sao thần tượng
 * của mình bị xếp dưới khi điểm bằng nhau. Luôn dùng `row.rank` từ server.
 * ============================================================================
 */

import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Card } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { statsApi } from '@/api/endpoints';
import type { LeaderboardMetric } from '@/types';

/**
 * Các chỉ số cho chọn. Thiếu "thẻ phạt" là CÓ CHỦ ĐÍCH ở giao diện người hâm
 * mộ: "bảng xếp hạng nhận thẻ nhiều nhất" dễ bị dùng để bêu riếu cầu thủ, trong
 * khi chẳng giúp ai hiểu thêm về phong độ. API vẫn hỗ trợ `cards` cho ban
 * huấn luyện / admin nếu cần.
 */
const METRICS: Array<{ value: LeaderboardMetric; label: string; unit: string }> = [
  { value: 'avg_rating', label: 'Điểm TB', unit: 'điểm' },
  { value: 'goals', label: 'Bàn thắng', unit: 'bàn' },
  { value: 'assists', label: 'Kiến tạo', unit: 'kiến tạo' },
  { value: 'motm', label: 'Xuất sắc nhất', unit: 'lần' },
];

export function PlayerLeaderboard() {
  const t = useTheme();
  const router = useRouter();

  /**
   * Mặc định mở bảng BÀN THẮNG: đây là số liệu thật có đủ cho mọi trận. Điểm đánh
   * giá cần thông số chi tiết từng cầu thủ (cú sút, chuyền…) mà chưa có nguồn mở.
   */
  const [metric, setMetric] = useState<LeaderboardMetric>('goals');
  /** undefined = để backend tự chọn năm mới nhất có dữ liệu */
  const [periodKey, setPeriodKey] = useState<string | undefined>();

  const query = useQuery({
    queryKey: ['stats', 'leaderboard', 'year', periodKey ?? 'latest', metric],
    queryFn: () => statsApi.leaderboard({ period: 'year', key: periodKey, metric, limit: 10 }),
    staleTime: 5 * 60 * 1000,
    /**
     * placeholderData: GIỮ bảng cũ trên màn hình trong lúc tải bảng mới.
     *
     * Không có dòng này, mỗi lần bấm đổi chỉ số là bảng biến mất -> skeleton
     * nhấp nháy -> bảng mới hiện. Bấm qua lại 4 chỉ số là 4 lần giật màn hình.
     * Giữ dữ liệu cũ (hơi mờ đi) cho cảm giác chuyển đổi liền mạch.
     */
    placeholderData: (prev) => prev,
  });

  const data = query.data;
  const unit = METRICS.find((m) => m.value === metric)?.unit ?? '';
  const years = (data?.periods ?? []).filter((p) => p.period_type === 'year');

  return (
    <Card padded={false}>
      {/* ---------- Chọn chỉ số (cuộn ngang nếu màn hình hẹp) ---------- */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: t.spacing.sm, padding: t.spacing.md }}
        /**
         * ⚠️ nestedScrollEnabled: thanh chip này nằm TRONG băng chuyền ngang
         * của Tab 5. Vuốt trên chip thì chip cuộn, vuốt chỗ khác thì đổi khung.
         */
        nestedScrollEnabled
      >
        {METRICS.map((m) => {
          const active = m.value === metric;
          return (
            <Pressable
              key={m.value}
              onPress={() => setMetric(m.value)}
              accessibilityRole="tab"
              accessibilityState={{ selected: active }}
              style={({ pressed }) => ({
                minHeight: 34,
                justifyContent: 'center',
                paddingHorizontal: t.spacing.md,
                borderRadius: t.radius.pill,
                borderWidth: 1,
                borderColor: active ? t.colors.accent : t.colors.border,
                backgroundColor: active ? t.colors.accentSoft : pressed ? t.colors.surfaceSunken : 'transparent',
              })}
            >
              <AppText variant="label" style={{ color: active ? t.colors.accentText : t.colors.textMuted }}>
                {m.label}
              </AppText>
            </Pressable>
          );
        })}

        {/* Chọn năm — chỉ hiện khi có từ 2 năm dữ liệu trở lên */}
        {years.length > 1 &&
          years.map((y) => {
            const active = y.period_key === data?.period_key;
            return (
              <Pressable
                key={y.period_key}
                onPress={() => setPeriodKey(y.period_key)}
                accessibilityRole="button"
                accessibilityLabel={`Năm ${y.period_key}`}
                accessibilityState={{ selected: active }}
                style={{
                  minHeight: 34,
                  justifyContent: 'center',
                  paddingHorizontal: t.spacing.md,
                  borderRadius: t.radius.pill,
                  backgroundColor: active ? t.colors.surfaceRaised : 'transparent',
                }}
              >
                <AppText variant="label" tabular tone={active ? 'default' : 'muted'}>
                  {y.period_key}
                </AppText>
              </Pressable>
            );
          })}
      </ScrollView>

      {/* ---------- Bảng ---------- */}
      {query.isLoading ? (
        <View style={{ padding: t.spacing.md, gap: t.spacing.sm }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} height={40} radius={t.radius.md} />
          ))}
        </View>
      ) : query.isError ? (
        <ErrorState title="Không tải được bảng xếp hạng" onRetry={() => void query.refetch()} />
      ) : !data || data.rows.length === 0 ? (
        <EmptyState
          icon="podium-outline"
          title="Chưa có số liệu"
          message="Bảng xếp hạng sẽ có sau khi đội tuyển thi đấu và điểm cầu thủ được chấm."
        />
      ) : (
        <View style={{ opacity: query.isPlaceholderData ? 0.5 : 1 }} accessibilityLiveRegion="polite">
          {data.rows.map((row, i) => {
            const isTop = row.rank === 1;
            const display = metric === 'avg_rating' ? row.value.toFixed(1) : String(row.value);

            return (
              <Pressable
                key={row.player_id}
                onPress={() => router.push(`/player/${row.player_id}`)}
                accessibilityRole="button"
                accessibilityLabel={`Hạng ${row.rank}: ${row.full_name}, ${display} ${unit}, ${row.matches} trận`}
                style={({ pressed }) => ({
                  flexDirection: 'row',
                  alignItems: 'center',
                  gap: t.spacing.md,
                  minHeight: t.touchTarget + 8,
                  paddingHorizontal: t.spacing.md,
                  borderTopWidth: i === 0 ? 1 : 0,
                  borderBottomWidth: 1,
                  borderColor: t.colors.border,
                  backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent',
                })}
              >
                {/* Hạng — hạng 1 viết màu vàng lúa: vị trí DUY NHẤT dùng vàng trong bảng */}
                <AppText
                  tabular
                  style={{
                    width: 24,
                    fontSize: t.fontSize.md,
                    fontWeight: t.fontWeight.black,
                    color: isTop ? t.colors.goldText : t.colors.textMuted,
                  }}
                >
                  {row.rank}
                </AppText>

                <View style={{ flex: 1 }}>
                  <AppText variant="bodyBold" numberOfLines={1}>
                    {row.short_name ?? row.full_name}
                  </AppText>
                  <AppText variant="caption" tone="faint" tabular>
                    {/* Số trận/phút chỉ có với trận có biên bản đầy đủ — không có thì không in "0 trận" */}
                    {row.matches > 0 ? `${row.matches} trận · ${row.minutes} phút` : `${row.goals} bàn thắng`}
                  </AppText>
                </View>

                <AppText
                  tabular
                  style={{ fontSize: t.fontSize.md, fontWeight: t.fontWeight.bold, color: t.colors.text }}
                >
                  {display}
                </AppText>
                <Ionicons name="chevron-forward" size={14} color={t.colors.textMuted} />
              </Pressable>
            );
          })}

          {/* Nói rõ luật xếp hạng — đừng để người dùng tự đoán vì sao ai đó "vắng mặt" */}
          <AppText variant="caption" tone="faint" style={{ padding: t.spacing.md }}>
            {metric === 'avg_rating'
              ? `Năm ${data.period_key} · chỉ xếp hạng cầu thủ đá tối thiểu ${data.min_minutes} phút. Bằng điểm thì đồng hạng.`
              : `Năm ${data.period_key} · bằng chỉ số thì đồng hạng.`}
          </AppText>
        </View>
      )}
    </Card>
  );
}
