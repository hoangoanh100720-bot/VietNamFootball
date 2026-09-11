/**
 * ============================================================================
 * COMPONENTS/MATCH/FIXTUREITEM.TSX — MỘT DÒNG TRONG DANH SÁCH TRẬN
 * ============================================================================
 *
 * Thẻ tỷ số lớn ở trên dành cho MỘT trận quan trọng nhất.
 * Còn danh sách lịch thi đấu cần DÀY và ĐỌC NHANH — mỗi dòng gọn gàng:
 *
 *   ┌────────────────────────────────────────┐
 *   │ Thứ 5, 08/10   Vòng loại Asian Cup     │  <- ngày + giải, chữ nhỏ mờ
 *   │ 🇻🇳 Việt Nam        19:30      Malaysia │  <- hai đội + giờ ở giữa
 *   └────────────────────────────────────────┘
 *
 * NGUYÊN TẮC MẬT ĐỘ: ở màn hình danh sách, ưu tiên xem được NHIỀU dòng.
 * Logo nhỏ lại còn 32px, lề trong giảm còn 12px, bỏ hết chi tiết phụ.
 */

import { View } from 'react-native';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Card, Badge } from '@/components/common/Card';
import { TeamLogo } from '@/components/common/TeamLogo';
import { formatDateShort, formatTime, getMatchResult, resultLabel } from '@/utils/format';
import type { Match } from '@/types';

export function FixtureItem({ match, onPress }: { match: Match; onPress?: () => void }) {
  const t = useTheme();

  const isFinished = match.status === 'finished';
  const isLive = match.status === 'live';

  // Với trận đã đá, tính kết quả theo góc nhìn Việt Nam để gắn huy hiệu T/H/B
  const result = isFinished ? getMatchResult(match) : null;
  const resultInfo = result ? resultLabel(result) : null;

  return (
    <Card onPress={onPress} padded={false}>
      <View style={{ padding: t.spacing.md, gap: t.spacing.sm }}>
        {/* ----- Dòng 1: ngày + giải đấu + huy hiệu kết quả ----- */}
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
          <AppText variant="caption" tone="faint" style={{ flexShrink: 0 }}>
            {formatDateShort(match.kickoff_at)}
          </AppText>

          <AppText variant="caption" tone="faint" numberOfLines={1} style={{ flex: 1 }}>
            · {match.competition}
          </AppText>

          {isLive && <Badge label="ĐANG ĐÁ" tone="live" size="sm" />}
          {resultInfo && (
            <Badge
              label={resultInfo.label}
              tone={result === 'W' ? 'win' : result === 'D' ? 'draw' : 'lose'}
              size="sm"
            />
          )}
        </View>

        {/* ----- Dòng 2: hai đội + tỷ số/giờ ----- */}
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          {/* Đội nhà: logo trước, tên sau — đọc từ trái sang */}
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
            <TeamLogo
              uri={match.home_team.logo_url}
              fifaCode={match.home_team.fifa_code}
              name={match.home_team.name}
              size={32}
            />
            <AppText variant="label" numberOfLines={1} style={{ flex: 1 }}>
              {match.home_team.name}
            </AppText>
          </View>

          {/* Ô giữa: tỷ số nếu đã đá, giờ nếu chưa */}
          <View style={{ minWidth: 62, alignItems: 'center' }}>
            {isFinished || isLive ? (
              <AppText
                variant="h3"
                tabular
                style={{ color: isLive ? t.colors.accentText : t.colors.text }}
              >
                {match.home_score} - {match.away_score}
              </AppText>
            ) : (
              <AppText variant="bodyBold" tabular tone="muted">
                {formatTime(match.kickoff_at)}
              </AppText>
            )}
          </View>

          {/* Đội khách: tên trước, logo sau — ĐỐI XỨNG GƯƠNG với đội nhà.
              Nhờ vậy hai logo nằm ở hai mép ngoài cùng, tỷ số cân giữa. */}
          <View
            style={{
              flex: 1,
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'flex-end',
              gap: t.spacing.sm,
            }}
          >
            <AppText variant="label" numberOfLines={1} style={{ flex: 1, textAlign: 'right' }}>
              {match.away_team.name}
            </AppText>
            <TeamLogo
              uri={match.away_team.logo_url}
              fifaCode={match.away_team.fifa_code}
              name={match.away_team.name}
              size={32}
            />
          </View>
        </View>
      </View>
    </Card>
  );
}
