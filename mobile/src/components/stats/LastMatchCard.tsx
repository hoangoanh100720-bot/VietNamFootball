/**
 * ============================================================================
 * COMPONENTS/STATS/LASTMATCHCARD.TSX — THẺ "TRẬN VỪA ĐÁ"
 * ============================================================================
 *
 *   ┌───────────────────────────────────┐
 *   │ TRẬN VỪA ĐÁ              [THẮNG]  │
 *   │ 🇻🇳 Việt Nam   2 – 0   Indonesia 🇮🇩│
 *   │ Giao hữu quốc tế · 09/09          │
 *   │ Kiểm soát bóng 58% ██████░░░░ 42% │
 *   │ Dứt điểm (trúng) …                │
 *   │ ⭐ Xuất sắc nhất: Xuân Son  8.8   │ ◄ chạm -> hồ sơ cầu thủ
 *   └───────────────────────────────────┘
 *     chạm vào thẻ -> Chi tiết trận
 *
 * Nhãn kết quả luôn bằng CHỮ ("THẮNG") kèm màu — không bao giờ chỉ là một
 * chấm xanh/đỏ (người mù màu đỏ-lục chiếm ~8% nam giới, đúng nhóm xem bóng đá).
 * ============================================================================
 */

import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Badge, Card } from '@/components/common/Card';
import { TeamLogo } from '@/components/common/TeamLogo';
import { RatingBadge } from '@/components/squad/RatingBadge';
import { StatCompareBar } from './StatCompareBar';
import { formatDate } from '@/utils/format';
import type { ManOfTheMatch, StatsMatch } from '@/types';

const RESULT_LABEL = { win: 'THẮNG', draw: 'HOÀ', lose: 'THUA' } as const;

export function LastMatchCard({ match, motm }: { match: StatsMatch; motm: ManOfTheMatch | null }) {
  const t = useTheme();
  const router = useRouter();

  const hs = match.home_stats;
  const as = match.away_stats;
  const barProps = {
    vietnamIsHome: match.vietnam_is_home,
    homeName: match.home_team.name,
    awayName: match.away_team.name,
  };

  return (
    <Card onPress={() => router.push(`/match/${match.id}`)}>
      {/* ---------- Dòng đầu: nhãn + kết quả ---------- */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="overline" tone="muted">
          Trận vừa đá
        </AppText>
        <Badge label={RESULT_LABEL[match.result]} tone={match.result} size="sm" />
      </View>

      {/* ---------- Tỷ số ---------- */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: t.spacing.md,
          marginTop: t.spacing.md,
        }}
      >
        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <TeamLogo
            uri={match.home_team.logo_url}
            fifaCode={match.home_team.fifa_code}
            name={match.home_team.name}
            size={36}
          />
          <AppText variant="label" center numberOfLines={1}>
            {match.home_team.name}
          </AppText>
        </View>

        {/* variant="h1" chứ không tự đặt fontSize — tránh lỗi chữ tràn dòng (xem app/(tabs)/intro.tsx) */}
        <AppText
          variant="h1"
          tabular
          style={{ fontWeight: t.fontWeight.black }}
          accessibilityLabel={`Tỷ số ${match.home_score} – ${match.away_score}`}
        >
          {match.home_score} – {match.away_score}
        </AppText>

        <View style={{ flex: 1, alignItems: 'center', gap: 4 }}>
          <TeamLogo
            uri={match.away_team.logo_url}
            fifaCode={match.away_team.fifa_code}
            name={match.away_team.name}
            size={36}
          />
          <AppText variant="label" center numberOfLines={1}>
            {match.away_team.name}
          </AppText>
        </View>
      </View>

      <AppText variant="caption" tone="faint" center style={{ marginTop: t.spacing.sm }}>
        {match.competition} · {formatDate(match.kickoff_at)}
      </AppText>

      {/* ---------- Thông số ---------- */}
      <View
        style={{
          marginTop: t.spacing.lg,
          paddingTop: t.spacing.lg,
          borderTopWidth: 1,
          borderTopColor: t.colors.border,
          gap: t.spacing.md,
        }}
      >
        {hs && as ? (
          <>
            <StatCompareBar label="Kiểm soát bóng" home={hs.possession_pct} away={as.possession_pct} suffix="%" {...barProps} />
            <StatCompareBar label="Dứt điểm" home={hs.shots} away={as.shots} {...barProps} />
            <StatCompareBar label="Trúng đích" home={hs.shots_on_target} away={as.shots_on_target} {...barProps} />
            <StatCompareBar label="Bàn thắng kỳ vọng (xG)" home={hs.expected_goals} away={as.expected_goals} decimals={2} {...barProps} />
            <StatCompareBar label="Phạt góc" home={hs.corners} away={as.corners} {...barProps} />
          </>
        ) : (
          /**
           * Trận chưa có thông số (trận giao hữu nhỏ, nhà cung cấp không theo
           * dõi) -> NÓI THẲNG, đừng để khoảng trống khiến người dùng tưởng lỗi.
           */
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <Ionicons name="information-circle-outline" size={15} color={t.colors.textMuted} />
            <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
              Trận này chưa có thông số chi tiết từ nhà cung cấp dữ liệu.
            </AppText>
          </View>
        )}
      </View>

      {/* ---------- Cầu thủ xuất sắc nhất ---------- */}
      {motm && (
        <Pressable
          onPress={() => router.push(`/player/${motm.player_id}`)}
          accessibilityRole="button"
          accessibilityLabel={`Xuất sắc nhất phía Việt Nam: ${motm.full_name}, ${motm.rating} điểm. Mở hồ sơ`}
          style={({ pressed }) => ({
            marginTop: t.spacing.lg,
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.md,
            minHeight: t.touchTarget,
            paddingHorizontal: t.spacing.md,
            borderRadius: t.radius.md,
            backgroundColor: pressed ? t.colors.surfaceRaised : t.colors.surfaceSunken,
          })}
        >
          <Ionicons name="star" size={18} color={t.colors.goldText} />
          <View style={{ flex: 1 }}>
            <AppText variant="caption" tone="muted">
              Xuất sắc nhất phía Việt Nam
            </AppText>
            <AppText variant="bodyBold" numberOfLines={1}>
              {motm.short_name ?? motm.full_name}
              {motm.goals > 0 ? ` · ${motm.goals} bàn` : ''}
              {motm.assists > 0 ? ` · ${motm.assists} kiến tạo` : ''}
            </AppText>
          </View>
          <RatingBadge rating={motm.rating} isMotm senior={t.isSenior} />
          <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
        </Pressable>
      )}
    </Card>
  );
}
