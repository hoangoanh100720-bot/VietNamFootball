/**
 * ============================================================================
 * COMPONENTS/SQUAD/CALLUPLIST.TSX — DANH SÁCH TRIỆU TẬP
 * ============================================================================
 *
 * Đặc tả 5.8 — phân đoạn thứ 3 "Triệu tập" ở Tab Đội hình.
 *
 *   ┌───────────────────────────────────┐
 *   │ Đợt tập trung tháng 10/2026       │
 *   │ Công bố 01/10 · 25 cầu thủ · 2 mới│
 *   │ THỦ MÔN (3)                       │
 *   │  [1] Filip · CLB CAHN          ›  │
 *   │ HẬU VỆ (9)                        │
 *   │  [24] Đình Bắc · CLB X  [MỚI]  ›  │ ◄ lần đầu lên tuyển
 *   │ BỔ SUNG                           │
 *   │  Bùi Vĩ Hào — lý do…              │
 *   │ RÚT LUI                           │
 *   │  Hồ Tấn Tài — Chấn thương cơ đùi  │ ◄ luôn kèm LÝ DO bằng chữ
 *   │ Các đợt trước                  ›  │
 *   └───────────────────────────────────┘
 *
 * ⚠️ Người RÚT LUI không nằm trong nhóm vị trí (server đã tách sẵn). Đếm họ vào
 * "Hậu vệ (9)" là con số sai, và người đọc lướt sẽ tưởng cầu thủ vẫn ở đội.
 * ============================================================================
 */

import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Badge, Card, SectionHeader } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { PlayerAvatar } from '@/components/common/TeamLogo';
import { callUpApi } from '@/api/endpoints';
import { formatDate, POSITION_LABEL, shortenName } from '@/utils/format';
import type { CallUpDetail, CallUpMember } from '@/types';

export function CallUpList() {
  const t = useTheme();

  /** null = đợt mới nhất; số = người dùng đang xem lại một đợt cũ */
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);

  const current = useQuery({
    queryKey: ['callups', 'current'],
    queryFn: callUpApi.current,
    staleTime: 10 * 60 * 1000,
  });

  const detail = useQuery({
    queryKey: ['callups', selectedId],
    queryFn: () => callUpApi.detail(selectedId!),
    enabled: selectedId !== null,
  });

  const history = useQuery({
    queryKey: ['callups', 'list'],
    queryFn: callUpApi.list,
    enabled: showHistory,
  });

  const active = selectedId === null ? current : detail;

  if (active.isLoading) return <Skeleton height={420} radius={t.radius.lg} />;
  if (active.isError) {
    return <ErrorState title="Không tải được danh sách triệu tập" onRetry={() => void active.refetch()} />;
  }
  if (!active.data) {
    return (
      <EmptyState
        icon="people-outline"
        title="Chưa có danh sách triệu tập"
        message="Danh sách sẽ xuất hiện ngay khi Ban huấn luyện công bố đợt tập trung."
      />
    );
  }

  const data: CallUpDetail = active.data;

  return (
    <View>
      {/* Đang xem đợt cũ -> luôn có lối quay về đợt mới nhất */}
      {selectedId !== null && (
        <Pressable
          onPress={() => setSelectedId(null)}
          accessibilityRole="button"
          style={{ flexDirection: 'row', alignItems: 'center', gap: 4, minHeight: t.touchTarget }}
        >
          <Ionicons name="arrow-back" size={16} color={t.colors.accentText} />
          <AppText variant="label" tone="accent">
            Về đợt mới nhất
          </AppText>
        </Pressable>
      )}

      {/* ---------- Tiêu đề đợt ---------- */}
      <Card>
        <AppText variant="h3">{data.squad.title}</AppText>
        <AppText variant="caption" tone="muted" tabular style={{ marginTop: 2 }}>
          Công bố {formatDate(data.squad.announced_at)} · {data.squad.player_count} cầu thủ
          {data.new_count > 0 ? ` · ${data.new_count} gương mặt mới` : ''}
        </AppText>
        {data.squad.gather_from && data.squad.gather_to && (
          <AppText variant="caption" tone="faint" tabular>
            Tập trung {formatDate(data.squad.gather_from)} – {formatDate(data.squad.gather_to)}
          </AppText>
        )}
      </Card>

      {/* ---------- Theo vị trí ---------- */}
      {data.groups
        .filter((g) => g.members.length > 0)
        .map((g) => (
          <View key={g.position}>
            <SectionHeader title={`${POSITION_LABEL[g.position] ?? g.position} (${g.members.length})`} />
            <Card padded={false}>
              {g.members.map((m, i) => (
                <MemberRow key={m.player_id} member={m} last={i === g.members.length - 1} />
              ))}
            </Card>
          </View>
        ))}

      {/* ---------- Bổ sung ---------- */}
      {data.added.length > 0 && (
        <>
          <SectionHeader title="Bổ sung" />
          <Card>
            {data.added.map((m) => (
              <ChangeLine key={m.player_id} icon="add-circle" color={t.colors.win} member={m} />
            ))}
          </Card>
        </>
      )}

      {/* ---------- Rút lui ---------- */}
      {data.withdrawn.length > 0 && (
        <>
          <SectionHeader title="Rút lui" />
          <Card>
            {data.withdrawn.map((m) => (
              <ChangeLine key={m.player_id} icon="remove-circle" color={t.colors.lose} member={m} />
            ))}
          </Card>
        </>
      )}

      {/* ---------- Các đợt trước ---------- */}
      <Pressable
        onPress={() => setShowHistory((v) => !v)}
        accessibilityRole="button"
        accessibilityState={{ expanded: showHistory }}
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          minHeight: t.touchTarget,
          marginTop: t.spacing.xl,
        }}
      >
        <AppText variant="bodyBold">Các đợt trước</AppText>
        <Ionicons name={showHistory ? 'chevron-up' : 'chevron-down'} size={18} color={t.colors.textMuted} />
      </Pressable>

      {showHistory &&
        (history.isLoading ? (
          <Skeleton height={120} radius={t.radius.md} />
        ) : (
          <Card padded={false}>
            {(history.data?.squads ?? []).map((s, i, arr) => {
              const isShown = s.id === data.squad.id;
              return (
                <Pressable
                  key={s.id}
                  onPress={() => setSelectedId(s.id)}
                  disabled={isShown}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isShown }}
                  style={({ pressed }) => ({
                    flexDirection: 'row',
                    alignItems: 'center',
                    gap: t.spacing.md,
                    minHeight: t.touchTarget + 8,
                    paddingHorizontal: t.spacing.md,
                    borderBottomWidth: i === arr.length - 1 ? 0 : 1,
                    borderBottomColor: t.colors.border,
                    backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent',
                  })}
                >
                  <View style={{ flex: 1 }}>
                    <AppText variant="body">{s.title}</AppText>
                    <AppText variant="caption" tone="faint" tabular>
                      {formatDate(s.announced_at)} · {s.player_count} cầu thủ
                    </AppText>
                  </View>
                  {isShown ? (
                    <Badge label="ĐANG XEM" size="sm" />
                  ) : (
                    <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
                  )}
                </Pressable>
              );
            })}
          </Card>
        ))}
    </View>
  );
}

function MemberRow({ member: m, last }: { member: CallUpMember; last: boolean }) {
  const t = useTheme();
  const router = useRouter();

  return (
    <Pressable
      onPress={() => router.push(`/player/${m.player_id}`)}
      accessibilityRole="button"
      accessibilityLabel={
        `${m.full_name}${m.shirt_number ? `, số áo ${m.shirt_number}` : ''}` +
        `${m.current_club ? `, ${m.current_club}` : ''}${m.is_new ? ', lần đầu được triệu tập' : ''}. Mở hồ sơ`
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
      <PlayerAvatar uri={m.photo_url} name={m.full_name} size={36} shirtNumber={m.shirt_number ?? undefined} />
      <View style={{ flex: 1 }}>
        <AppText variant="bodyBold" numberOfLines={1}>
          {shortenName(m.full_name, m.short_name)}
        </AppText>
        {m.current_club && (
          <AppText variant="caption" tone="faint" numberOfLines={1}>
            {m.current_club}
          </AppText>
        )}
      </View>
      {/* Nhãn "MỚI" bằng chữ, màu vàng lúa — ý nghĩa "đáng chú ý, đáng mừng" */}
      {m.is_new && <Badge label="MỚI" tone="gold" size="sm" />}
      <Ionicons name="chevron-forward" size={16} color={t.colors.textMuted} />
    </Pressable>
  );
}

/** Một dòng Bổ sung / Rút lui — icon + tên + LÝ DO bằng chữ */
function ChangeLine({
  icon,
  color,
  member: m,
}: {
  icon: 'add-circle' | 'remove-circle';
  color: string;
  member: CallUpMember;
}) {
  const t = useTheme();
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: t.spacing.sm, paddingVertical: 4 }}>
      <Ionicons name={icon} size={18} color={color} style={{ marginTop: 2 }} />
      <AppText variant="body" style={{ flex: 1 }}>
        <AppText variant="bodyBold">{m.full_name}</AppText>
        {m.note ? ` — ${m.note}` : ''}
      </AppText>
    </View>
  );
}
