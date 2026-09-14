/**
 * ============================================================================
 * COMPONENTS/MATCH/STANDINGSTABLE.TSX — BẢNG XẾP HẠNG BẢNG ĐẤU
 * ============================================================================
 *
 * Đặc tả 5.8:
 *
 *   Vòng loại Asian Cup 2027 · Bảng F
 *   #  Đội          Tr  T-H-B  HS   Đ
 *   1  Việt Nam      3  3-0-0  +10  9    ◄ nền accentSoft + chữ đậm
 *   ── 1 đội đầu đi tiếp ──              ◄ vạch + CHỮ (không chỉ dùng màu)
 *   2  Malaysia      3  2-0-1   +2  6
 *
 * ----------------------------------------------------------------------------
 * 📐 BẢNG 7 CỘT TRÊN MÀN HÌNH 360px — CÂN NHẮC TỪNG CỘT
 *
 *   • Cột SỐ rộng CỐ ĐỊNH + căn phải + chữ số đều nhau (tabular) -> các con số
 *     thẳng hàng dọc, mắt so sánh "9 vs 6 điểm" chỉ bằng một cái liếc.
 *   • Cột TÊN ĐỘI co giãn (flex: 1) và cắt "…" khi quá dài — tên đội là cột
 *     duy nhất được phép hy sinh chiều rộng.
 *   • Gộp Thắng-Hoà-Bại vào MỘT cột "3-0-0" thay vì ba cột: tiết kiệm ~60px,
 *     đúng quy ước mà người xem bóng đá Việt Nam đã quen trên báo chí.
 *   • Hiệu số luôn có DẤU: "+10", "−2", "0". Không có dấu thì "2" là +2 hay −2?
 *
 * ♿ Senior mode (mục 5.8): thay cả bảng bằng MỘT CÂU —
 *    "Việt Nam đang đứng thứ 1 bảng F với 9 điểm sau 3 trận."
 *    Bảng vẫn có nút "Xem cả bảng" cho ai muốn xem chi tiết.
 * ============================================================================
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Card } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { TeamLogo } from '@/components/common/TeamLogo';
import { Button } from '@/components/common/Button';
import { competitionsApi } from '@/api/endpoints';
import type { StandingGroup } from '@/types';

/** "−" (dấu trừ thật U+2212) chứ không phải "-" (gạch nối): cùng độ rộng với "+" */
function signed(n: number): string {
  if (n > 0) return `+${n}`;
  if (n < 0) return `−${Math.abs(n)}`;
  return '0';
}

export function StandingsPanel() {
  const t = useTheme();
  /** Senior mode mặc định chỉ hiện câu tóm tắt; bấm nút mới mở bảng */
  const [showTable, setShowTable] = useState(false);

  const query = useQuery({
    queryKey: ['competitions', 'standings', 'current'],
    queryFn: () => competitionsApi.standings(),
    staleTime: 10 * 60 * 1000,
  });

  if (query.isLoading) return <Skeleton height={260} radius={t.radius.lg} />;
  if (query.isError) {
    return <ErrorState title="Không tải được bảng xếp hạng" onRetry={() => void query.refetch()} />;
  }

  const data = query.data;
  if (!data?.season || data.groups.length === 0) {
    return (
      <EmptyState
        icon="podium-outline"
        title="Chưa có giải đấu vòng bảng"
        message="Bảng xếp hạng sẽ xuất hiện khi Việt Nam tham dự một giải có vòng bảng."
      />
    );
  }

  const senior = t.isSenior;

  return (
    <View style={{ gap: t.spacing.md }}>
      {/* ---------- Tên giải ---------- */}
      <View>
        <AppText variant="h3">{data.season.competition_name}</AppText>
        <AppText variant="caption" tone="muted">
          Mùa {data.season.name}
        </AppText>
      </View>

      {/* ---------- Câu tóm tắt — to, rõ, luôn hiện đầu tiên ---------- */}
      {data.vietnam_summary && (
        <Card>
          <View style={{ flexDirection: 'row', gap: t.spacing.md, alignItems: 'center' }}>
            <Ionicons name="flag" size={senior ? 28 : 20} color={t.colors.accentText} />
            <AppText variant={senior ? 'h3' : 'bodyBold'} style={{ flex: 1 }}>
              {data.vietnam_summary}
            </AppText>
          </View>
        </Card>
      )}

      {senior && !showTable ? (
        <Button label="Xem cả bảng xếp hạng" variant="secondary" icon="list" fullWidth onPress={() => setShowTable(true)} />
      ) : (
        data.groups.map((g) => <GroupTable key={g.group_name || 'all'} group={g} />)
      )}

      {/* Luật đi tiếp bằng chữ — vạch ngăn chỉ vẽ suất CHẮC CHẮN, phần còn lại phải nói rõ */}
      <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
        <Ionicons name="information-circle-outline" size={15} color={t.colors.textMuted} />
        <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
          {data.season.advance_note}
        </AppText>
      </View>
    </View>
  );
}

// ---------------------------------------------------------------------------
// MỘT BẢNG
// ---------------------------------------------------------------------------

/** Bề rộng cột số — khai MỘT chỗ để dòng tiêu đề và dòng dữ liệu luôn thẳng hàng */
const COL = { rank: 22, played: 26, record: 50, diff: 38, pts: 30 } as const;

function GroupTable({ group }: { group: StandingGroup }) {
  const t = useTheme();

  const header = (label: string, width: number, align: 'left' | 'right' | 'center' = 'right') => (
    <AppText variant="overline" tone="faint" style={{ width, textAlign: align }}>
      {label}
    </AppText>
  );

  return (
    <Card padded={false}>
      {group.group_name !== '' && (
        <AppText variant="label" tone="muted" style={{ paddingHorizontal: t.spacing.md, paddingTop: t.spacing.md }}>
          {group.group_name}
        </AppText>
      )}

      {/* Dòng tiêu đề cột */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          gap: 6,
          paddingHorizontal: t.spacing.md,
          paddingVertical: t.spacing.sm,
          borderBottomWidth: 1,
          borderBottomColor: t.colors.border,
        }}
        // Trình đọc màn hình bỏ qua hàng tiêu đề viết tắt — từng dòng đã đọc đủ nghĩa
        importantForAccessibility="no-hide-descendants"
        accessibilityElementsHidden
      >
        {header('#', COL.rank, 'left')}
        <AppText variant="overline" tone="faint" style={{ flex: 1 }}>
          Đội
        </AppText>
        {header('Tr', COL.played)}
        {header('T-H-B', COL.record, 'center')}
        {header('HS', COL.diff)}
        {header('Đ', COL.pts)}
      </View>

      {group.rows.map((r, i) => {
        const isLast = i === group.rows.length - 1;
        /** Vạch "đi tiếp" nằm NGAY SAU đội cuối cùng trong nhóm đi tiếp */
        const drawCutLine = r.position === group.advance_count && !isLast;

        return (
          <View key={r.team_id}>
            <View
              accessible
              accessibilityLabel={
                `Hạng ${r.position}, ${r.team_name}, ${r.played} trận, ${r.won} thắng ${r.drawn} hoà ${r.lost} thua, ` +
                `hiệu số ${signed(r.goal_diff)}, ${r.points} điểm`
              }
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 6,
                minHeight: t.touchTarget,
                paddingHorizontal: t.spacing.md,
                backgroundColor: r.is_vietnam ? t.colors.accentSoft : 'transparent',
                borderBottomWidth: isLast || drawCutLine ? 0 : 1,
                borderBottomColor: t.colors.border,
              }}
            >
              <AppText variant="label" tabular tone={r.is_vietnam ? 'accent' : 'muted'} style={{ width: COL.rank }}>
                {r.position}
              </AppText>

              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
                <TeamLogo uri={r.logo_url} fifaCode={r.fifa_code} name={r.team_name} size={20} />
                <AppText variant={r.is_vietnam ? 'bodyBold' : 'body'} numberOfLines={1} style={{ flex: 1 }}>
                  {r.team_name}
                </AppText>
              </View>

              <AppText variant="label" tabular tone="muted" style={{ width: COL.played, textAlign: 'right' }}>
                {r.played}
              </AppText>
              <AppText variant="label" tabular tone="muted" style={{ width: COL.record, textAlign: 'center' }}>
                {r.won}-{r.drawn}-{r.lost}
              </AppText>
              <AppText variant="label" tabular tone="muted" style={{ width: COL.diff, textAlign: 'right' }}>
                {signed(r.goal_diff)}
              </AppText>
              <AppText
                tabular
                style={{
                  width: COL.pts,
                  textAlign: 'right',
                  fontSize: t.fontSize.base,
                  fontWeight: t.fontWeight.black,
                  color: t.colors.text,
                }}
              >
                {r.points}
              </AppText>
            </View>

            {drawCutLine && (
              <View
                style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, paddingHorizontal: t.spacing.md }}
                accessibilityLabel={`Ranh giới: ${group.advance_count} đội đầu đi tiếp`}
              >
                <View style={{ flex: 1, height: 1, backgroundColor: t.colors.bambooText }} />
                <AppText variant="caption" style={{ color: t.colors.bambooText }}>
                  {group.advance_count} đội đầu đi tiếp
                </AppText>
                <View style={{ flex: 1, height: 1, backgroundColor: t.colors.bambooText }} />
              </View>
            )}
          </View>
        );
      })}
    </Card>
  );
}
