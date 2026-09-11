/**
 * ============================================================================
 * APP/(TABS)/AI.TSX — TAB 4: DỰ ĐOÁN AI & BẢNG XẾP HẠNG FIFA
 * ============================================================================
 *
 * BỐ CỤC:
 *   1. Thẻ dự đoán trận sắp tới: biểu đồ vòng + bài nhận định + yếu tố then chốt
 *   2. Bảng xếp hạng FIFA, làm nổi bật dòng của Việt Nam
 *
 * ----------------------------------------------------------------------------
 * ⭐ NGUYÊN TẮC ĐẠO ĐỨC KHI HIỂN THỊ KẾT QUẢ AI
 *
 * App PHẢI nói rõ ba điều, không được giấu:
 *   1. Đây là DỰ ĐOÁN, không phải sự thật
 *   2. Dự đoán do MODEL NÀO tạo ra (Gemini hay mô hình thống kê dự phòng)
 *   3. TẠO LÚC NÀO (dữ liệu cũ thì độ tin cậy giảm)
 *
 * Giấu những thông tin này là khiến người dùng tin nhầm rằng đó là chân lý.
 */

import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Card, SectionHeader, Badge } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { TeamLogo } from '@/components/common/TeamLogo';
import { PredictionDonut } from '@/components/ai/PredictionDonut';
import { aiApi, matchesApi, rankingApi } from '@/api/endpoints';
import { formatDateTime, formatRelative } from '@/utils/format';

export default function AiTab() {
  const t = useTheme();
  const router = useRouter();

  // ---------------------------------------------------------------------
  // Bước 1: tìm trận sắp tới để dự đoán
  // ---------------------------------------------------------------------
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

  // ---------------------------------------------------------------------
  // Bước 2: xin dự đoán cho trận đó
  // ---------------------------------------------------------------------
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

  const prediction = predictionQuery.data?.prediction;

  const onRefresh = () => {
    void Promise.all([upcomingQuery.refetch(), predictionQuery.refetch(), rankingQuery.refetch()]);
  };

  return (
    <Screen onRefresh={onRefresh} refreshing={predictionQuery.isRefetching}>
      {/* =================== TIÊU ĐỀ =================== */}
      <View style={{ paddingTop: t.spacing.md, paddingBottom: t.spacing.lg }}>
        <AppText variant="h2">Dự đoán & Xếp hạng</AppText>
        <AppText variant="caption" tone="muted">
          Phân tích bằng trí tuệ nhân tạo
        </AppText>
      </View>

      {/* =================== THẺ DỰ ĐOÁN =================== */}
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
      ) : prediction ? (
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
              uri={nextMatch.home_team.logo_url}
              fifaCode={nextMatch.home_team.fifa_code}
              name={nextMatch.home_team.name}
              size={38}
            />
            <View style={{ alignItems: 'center' }}>
              <AppText variant="label" center>
                {nextMatch.home_team.name} vs {nextMatch.away_team.name}
              </AppText>
              <AppText variant="caption" tone="faint" tabular>
                {formatDateTime(nextMatch.kickoff_at)} · {formatRelative(nextMatch.kickoff_at)}
              </AppText>
            </View>
            <TeamLogo
              uri={nextMatch.away_team.logo_url}
              fifaCode={nextMatch.away_team.fifa_code}
              name={nextMatch.away_team.name}
              size={38}
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
          <View
            style={{
              flexDirection: 'row',
              gap: t.spacing.md,
              paddingBottom: t.spacing.lg,
            }}
          >
            <StatBox label="Tỷ số dự đoán" value={prediction.predicted_score ?? '—'} />
            <StatBox
              label="Độ tin cậy"
              value={
                prediction.confidence === 'high' ? 'Cao'
                : prediction.confidence === 'medium' ? 'Trung bình'
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
                <View key={i} style={{ flexDirection: 'row', gap: t.spacing.sm, alignItems: 'flex-start' }}>
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
      ) : null}

      {/* Nhãn cho biết đang chạy AI thật hay mô hình dự phòng */}
      {aiStatusQuery.data && !aiStatusQuery.data.gemini_enabled && (
        <View style={{ marginTop: t.spacing.md }}>
          <Badge label="ĐANG DÙNG MÔ HÌNH THỐNG KÊ" tone="gold" size="sm" />
        </View>
      )}

      {/* =================== BẢNG XẾP HẠNG FIFA =================== */}
      <SectionHeader title="Bảng xếp hạng FIFA" />

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
            <AppText variant="overline" tone="faint" style={{ width: 34 }}>
              #
            </AppText>
            <AppText variant="overline" tone="faint" style={{ flex: 1 }}>
              Đội tuyển
            </AppText>
            <AppText variant="overline" tone="faint" style={{ width: 64, textAlign: 'right' }}>
              Điểm
            </AppText>
            <AppText variant="overline" tone="faint" style={{ width: 44, textAlign: 'right' }}>
              Thay đổi
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
                  style={{ width: 34 }}
                >
                  {row.rank}
                </AppText>

                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                  <TeamLogo
                    uri={row.team_logo}
                    fifaCode={row.fifa_code}
                    name={row.team_name}
                    size={26}
                  />
                  <AppText
                    variant={isVietnam ? 'bodyBold' : 'body'}
                    numberOfLines={1}
                    style={{ flex: 1 }}
                  >
                    {row.team_name}
                  </AppText>
                </View>

                <AppText variant="label" tabular tone="muted" style={{ width: 64, textAlign: 'right' }}>
                  {row.points.toFixed(1)}
                </AppText>

                {/* Cột thay đổi: icon + số, KHÔNG chỉ dùng màu */}
                <View
                  style={{
                    width: 44,
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
                Cập nhật ngày {new Date(rankingQuery.data.snapshot_date).toLocaleDateString('vi-VN')}
              </AppText>
            </View>
          )}
        </Card>
      ) : null}
    </Screen>
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
