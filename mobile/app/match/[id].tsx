/**
 * ============================================================================
 * APP/MATCH/[ID].TSX — MÀN HÌNH CHI TIẾT TRẬN ĐẤU
 * ============================================================================
 *
 * TÊN FILE CÓ NGOẶC VUÔNG = ROUTE ĐỘNG.
 *
 *   app/match/[id].tsx   khớp với  /match/1, /match/12, /match/999...
 *
 * Lấy giá trị id bằng hook useLocalSearchParams():
 *
 *   const { id } = useLocalSearchParams<{ id: string }>();
 *
 * ⚠️ Giá trị luôn là CHUỖI (vì nó đến từ URL) -> phải Number() trước khi dùng.
 *
 * ----------------------------------------------------------------------------
 * NỘI DUNG MÀN HÌNH:
 *   1. Thẻ tỷ số (có realtime nếu trận đang đá)
 *   2. Dòng thời gian diễn biến (bàn thắng, thẻ phạt, thay người)
 *   3. Thống kê đối đầu lịch sử
 *   4. Nút xem dự đoán AI (với trận chưa đá)
 */

import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Card, SectionHeader, InfoRow, Badge } from '@/components/common/Card';
import { EmptyState, ErrorState, Skeleton } from '@/components/common/States';
import { LiveScoreCard } from '@/components/match/LiveScoreCard';
import { FixtureItem } from '@/components/match/FixtureItem';
import { Button } from '@/components/common/Button';
import { matchesApi } from '@/api/endpoints';
import { useLiveScore } from '@/hooks/useLiveScore';
import { formatDateTime, formatNumber } from '@/utils/format';
import type { MatchEvent } from '@/types';
import { Seo } from '@/components/common/Seo';

export default function MatchDetailScreen() {
  const t = useTheme();
  const router = useRouter();

  const { id } = useLocalSearchParams<{ id: string }>();
  const matchId = Number(id);

  const detailQuery = useQuery({
    queryKey: ['match', matchId],
    queryFn: () => matchesApi.detail(matchId),
    enabled: Number.isFinite(matchId) && matchId > 0,
  });

  const h2hQuery = useQuery({
    queryKey: ['match', matchId, 'h2h'],
    queryFn: () => matchesApi.h2h(matchId),
    enabled: Number.isFinite(matchId) && matchId > 0,
    staleTime: 24 * 60 * 60 * 1000, // lịch sử đối đầu gần như không đổi
  });

  const match = detailQuery.data?.match;
  const isLive = match?.status === 'live';

  const live = useLiveScore(
    matchId,
    {
      home: match?.home_score ?? 0,
      away: match?.away_score ?? 0,
      minute: match?.minute ?? null,
      status: match?.status ?? 'scheduled',
    },
    Boolean(isLive)
  );

  // Ưu tiên danh sách sự kiện realtime (dài hơn) nếu đang đá
  const events =
    isLive && live.events.length > 0 ? live.events : (detailQuery.data?.events ?? []);

  // -------------------------------------------------------------------
  // ĐANG TẢI / LỖI
  // -------------------------------------------------------------------
  if (detailQuery.isLoading) {
    return (
      <Screen>
        {/*
          ⭐ THẺ SEO DỰ PHÒNG — đừng bỏ qua phần này.

          🐛 LỖI CÓ THẬT ĐÃ PHÁT HIỆN KHI KIỂM TRA FILE HTML XUẤT RA:
          Bản web tĩnh dựng sẵn một file khuôn `match/[id].html` cho route động
          này. Lúc dựng chưa có id trận nào và cũng không gọi được API, nên màn
          hình đi qua nhánh "đang tải" rồi dừng ở nhánh "lỗi". Cả hai nhánh
          trước đây đều KHÔNG có <Seo> — kết quả là file xuất ra mang một thẻ
          <title></title> RỖNG, không description, không canonical.

          Giờ cả hai nhánh đều có thẻ dự phòng, nên khuôn trang luôn hợp lệ.
          Khi người dùng mở trang thật và dữ liệu về, <Seo> ở nhánh chính sẽ
          thay bằng tên hai đội thật.
        */}
        <Seo
          title="Chi tiết trận đấu"
          description="Tỷ số trực tiếp, diễn biến từng phút, đội hình ra sân và lịch sử đối đầu của trận đấu Đội tuyển Việt Nam."
          path={`/match/${id ?? ''}`}
        />
        <View style={{ gap: t.spacing.lg, paddingTop: t.spacing.lg }}>
          <Skeleton width="100%" height={210} radius={t.radius.xl} />
          <Skeleton width="100%" height={180} radius={t.radius.lg} />
        </View>
      </Screen>
    );
  }

  if (detailQuery.isError || !match) {
    return (
      <Screen>
        {/* noIndex: trang lỗi không được lọt vào kết quả tìm kiếm */}
        <Seo
          title="Không tải được trận đấu"
          description="Không tìm thấy dữ liệu trận đấu này."
          path={`/match/${id ?? ''}`}
          noIndex
        />
        <ErrorState
          title="Không tải được trận đấu"
          message={detailQuery.error instanceof Error ? detailQuery.error.message : undefined}
          onRetry={() => void detailQuery.refetch()}
        />
      </Screen>
    );
  }

  return (
    <>
      {/* Đặt tiêu đề thanh điều hướng theo tên hai đội */}
      <Stack.Screen
        options={{ title: `${match.home_team.fifa_code ?? ''} - ${match.away_team.fifa_code ?? ''}` }}
      />

      {/*
        ⭐ SEO ĐỘNG — tiêu đề và mô tả dựng từ DỮ LIỆU THẬT của trận đấu.

        Đây là khác biệt lớn nhất giữa một trang Google yêu thích và một trang
        bị bỏ qua: mỗi trận có tiêu đề riêng, khớp đúng thứ người ta gõ vào ô
        tìm kiếm ("Việt Nam vs Thái Lan tỷ số").

        Dùng chung một tiêu đề tĩnh cho mọi trận thì Google coi hàng trăm trang
        là trùng lặp và chỉ chọn hiện đúng một trang — toàn bộ phần còn lại
        coi như không tồn tại.
      */}
      <Seo
        title={`${match.home_team.name} vs ${match.away_team.name}`}
        description={
          `Tỷ số, diễn biến, đội hình ra sân và thống kê trận ` +
          `${match.home_team.name} gặp ${match.away_team.name}` +
          `${match.competition ? ' tại ' + match.competition : ''}. ` +
          `Cập nhật trực tiếp từng phút.`
        }
        path={`/match/${match.id}`}
      />

      <Screen edges={[]} onRefresh={() => void detailQuery.refetch()} refreshing={detailQuery.isRefetching}>
        <View style={{ paddingTop: t.spacing.md }}>
          {/* =============== THẺ TỶ SỐ =============== */}
          <LiveScoreCard
            match={match}
            liveScore={
              isLive
                ? { home: live.homeScore, away: live.awayScore, minute: live.minute, status: live.status }
                : undefined
            }
            connectionMode={isLive ? live.connectionMode : undefined}
            justScored={live.justScored}
          />

          {/* =============== NÚT DỰ ĐOÁN AI =============== */}
          {match.status === 'scheduled' && (
            <View style={{ marginTop: t.spacing.lg }}>
              <Button
                label="Xem dự đoán AI cho trận này"
                icon="sparkles"
                variant="secondary"
                fullWidth
                onPress={() => router.push('/ai')}
              />
            </View>
          )}

          {/* =============== DIỄN BIẾN TRẬN ĐẤU =============== */}
          {(match.status === 'live' || match.status === 'finished') && (
            <>
              <SectionHeader title="Diễn biến trận đấu" />

              {events.length === 0 ? (
                <EmptyState
                  icon="time-outline"
                  title="Chưa có diễn biến"
                  message="Các sự kiện sẽ xuất hiện khi trận đấu diễn ra."
                />
              ) : (
                <Card>
                  {/*
                    DÒNG THỜI GIAN: sắp xếp theo phút TĂNG DẦN để đọc như
                    tường thuật từ đầu trận tới cuối trận.
                    Dùng [...events] để tạo bản sao — sort() làm thay đổi
                    mảng gốc, mà mảng gốc thuộc về cache của React Query.
                  */}
                  {[...events]
                    .sort((a, b) => a.minute - b.minute)
                    .map((event, i, arr) => (
                      <EventRow key={event.id} event={event} last={i === arr.length - 1} />
                    ))}
                </Card>
              )}
            </>
          )}

          {/* =============== THÔNG TIN TRẬN =============== */}
          <SectionHeader title="Thông tin trận đấu" />

          <Card>
            <InfoRow label="Giải đấu" value={match.competition} />
            {match.round && <InfoRow label="Vòng đấu" value={match.round} />}
            <InfoRow label="Thời gian" value={formatDateTime(match.kickoff_at)} tabular />
            <InfoRow label="Sân vận động" value={match.venue ?? '—'} />
            <InfoRow label="Thành phố" value={match.city ?? '—'} />
            <InfoRow
              label="Khán giả"
              value={match.attendance ? formatNumber(match.attendance) : '—'}
              tabular
              last
            />
          </Card>

          {/* =============== LỊCH SỬ ĐỐI ĐẦU =============== */}
          <SectionHeader title="Lịch sử đối đầu" />

          {h2hQuery.isLoading ? (
            <Skeleton width="100%" height={160} radius={t.radius.lg} />
          ) : h2hQuery.data && h2hQuery.data.total > 0 ? (
            <>
              <Card>
                {/* --- Ba ô thống kê Thắng / Hoà / Thua --- */}
                <View style={{ flexDirection: 'row', gap: t.spacing.sm }}>
                  <H2HStat label="Thắng" value={h2hQuery.data.wins} color={t.colors.win} />
                  <H2HStat label="Hoà" value={h2hQuery.data.draws} color={t.colors.draw} />
                  <H2HStat label="Thua" value={h2hQuery.data.losses} color={t.colors.lose} />
                </View>

                {/*
                  THANH TỶ LỆ — trực quan hoá nhanh tương quan lịch sử.
                  Ba đoạn màu nối liền, chiều rộng theo tỷ lệ số trận.
                */}
                <View
                  style={{
                    flexDirection: 'row',
                    height: 8,
                    borderRadius: 4,
                    overflow: 'hidden',
                    marginTop: t.spacing.lg,
                    backgroundColor: t.colors.surfaceSunken,
                  }}
                >
                  <View style={{ flex: h2hQuery.data.wins, backgroundColor: t.colors.win }} />
                  <View style={{ flex: h2hQuery.data.draws, backgroundColor: t.colors.draw }} />
                  <View style={{ flex: h2hQuery.data.losses, backgroundColor: t.colors.lose }} />
                </View>

                <View
                  style={{
                    marginTop: t.spacing.lg,
                    paddingTop: t.spacing.md,
                    borderTopWidth: 1,
                    borderTopColor: t.colors.border,
                  }}
                >
                  <InfoRow
                    label="Tổng số lần gặp"
                    value={`${h2hQuery.data.total} trận`}
                    tabular
                  />
                  <InfoRow
                    label="Hiệu số bàn thắng"
                    value={`${h2hQuery.data.goals_for} - ${h2hQuery.data.goals_against}`}
                    tabular
                    last
                  />
                </View>
              </Card>

              {/* --- Các lần gặp gần nhất --- */}
              {h2hQuery.data.recent.length > 0 && (
                <View style={{ gap: t.spacing.sm, marginTop: t.spacing.md }}>
                  {h2hQuery.data.recent.map((m) => (
                    <FixtureItem
                      key={m.id}
                      match={m}
                      onPress={() => router.push(`/match/${m.id}`)}
                    />
                  ))}
                </View>
              )}
            </>
          ) : (
            <EmptyState
              icon="stats-chart-outline"
              title="Chưa có dữ liệu đối đầu"
              message="Hai đội chưa từng gặp nhau trong dữ liệu hiện có."
            />
          )}
        </View>
      </Screen>
    </>
  );
}

/**
 * ============================================================================
 * MỘT DÒNG DIỄN BIẾN TRẬN ĐẤU
 * ============================================================================
 *
 * Bố cục ba cột:
 *
 *     45'+2   ⚽   Nguyễn Tiến Linh
 *     ▲       ▲    ▲
 *     │       │    └─ nội dung, chiếm hết chỗ còn lại
 *     │       └────── icon loại sự kiện, rộng cố định
 *     └────────────── phút, rộng CỐ ĐỊNH 42px
 *
 * 📐 VÌ SAO CỘT PHÚT PHẢI RỘNG CỐ ĐỊNH?
 * Để mọi dòng thẳng hàng nhau. Mắt người lướt dọc một cột thẳng nhanh hơn hẳn
 * so với cột so le. Nếu để cột co giãn theo nội dung, dòng "9'" sẽ hẹp hơn
 * dòng "90'+5" và cả danh sách trông như răng cưa.
 *
 * Kết hợp với `tabular` (chữ số cùng bề rộng) thì các con số xếp thẳng tăm tắp.
 */
function EventRow({ event, last }: { event: MatchEvent; last: boolean }) {
  const t = useTheme();

  /**
   * BẢNG TRA: mỗi loại sự kiện -> icon, màu, tên tiếng Việt.
   *
   * 💡 VÌ SAO DÙNG BẢNG TRA MÀ KHÔNG DÙNG if/else HAY switch?
   *   • Thêm loại sự kiện mới = thêm MỘT dòng, không đụng vào logic
   *   • Nhìn một cái là thấy hết các loại đang hỗ trợ
   *   • Không sợ quên `break` như trong switch
   *
   * ⚠️ Bảng này phải đặt BÊN TRONG component, không đặt ở cấp module.
   * Lý do: nó dùng `t.colors.*`, mà bảng màu đổi theo chế độ sáng/tối. Đặt ở
   * ngoài thì màu sẽ bị "đóng băng" theo lần render đầu tiên và không đổi khi
   * người dùng chuyển chế độ.
   *
   * 🎨 Riêng thẻ vàng/thẻ đỏ dùng `t.static.card.*` chứ không dùng token theo
   * theme: đó là màu của VẬT THỂ CÓ THẬT, không đổi theo giao diện.
   * Xem giải thích trong theme/colors.ts.
   */
  const config: Record<string, { icon: keyof typeof Ionicons.glyphMap; color: string; label: string }> = {
    goal: { icon: 'football', color: t.colors.win, label: 'Bàn thắng' },
    own_goal: { icon: 'football', color: t.colors.lose, label: 'Phản lưới' },
    penalty: { icon: 'football', color: t.colors.win, label: 'Phạt đền' },
    missed_penalty: { icon: 'close-circle', color: t.colors.lose, label: 'Hỏng phạt đền' },
    yellow_card: { icon: 'square', color: t.static.card.yellow, label: 'Thẻ vàng' },
    red_card: { icon: 'square', color: t.static.card.red, label: 'Thẻ đỏ' },
    substitution: { icon: 'swap-horizontal', color: t.colors.textMuted, label: 'Thay người' },
    var: { icon: 'videocam', color: t.colors.textMuted, label: 'VAR' },
  };

  /**
   * 🛟 GIÁ TRỊ DỰ PHÒNG — dòng này quan trọng hơn vẻ ngoài của nó.
   *
   * Nếu backend (hoặc nhà cung cấp dữ liệu) thêm một loại sự kiện mới mà app
   * chưa biết — ví dụ 'penalty_shootout' — thì `config[event.type]` là
   * undefined, và `cfg.icon` sẽ làm app SẬP ngay giữa trận đấu.
   *
   * Với `??` thì loại lạ vẫn hiện ra dưới dạng một chấm tròn trung tính kèm
   * đúng mã sự kiện. Xấu một chút, nhưng app không chết và người dùng vẫn
   * biết là "có chuyện gì đó vừa xảy ra ở phút này".
   *
   * 👉 Nguyên tắc chung: dữ liệu đến từ mạng thì LUÔN phải có nhánh dự phòng.
   */
  const cfg = config[event.type] ?? {
    icon: 'ellipse' as const,
    color: t.colors.textMuted,
    label: event.type,
  };

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        paddingVertical: t.spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
      }}
    >
      {/* Phút — chiều rộng cố định + tabular để luôn thẳng cột */}
      <AppText variant="label" tabular tone="muted" style={{ width: 42 }}>
        {event.minute}'{event.extra_minute ? `+${event.extra_minute}` : ''}
      </AppText>

      <Ionicons name={cfg.icon} size={16} color={cfg.color} />

      <View style={{ flex: 1 }}>
        <AppText variant="body">
          {event.player_name ?? cfg.label}
        </AppText>
        {/*
          Dòng phụ ghi LOẠI sự kiện bằng chữ ("Thẻ vàng"), không chỉ dựa vào
          màu icon -> người mù màu vẫn phân biệt được thẻ vàng với thẻ đỏ.
          Chỉ hiện khi dòng trên là tên cầu thủ (nếu không, dòng trên đã là
          tên loại sự kiện rồi). Bỏ phần detail khi nó trùng nhãn — bản đầu
          hiện "Bàn thắng · Bàn thắng".
        */}
        {event.player_name && (
          <AppText variant="caption" tone="faint">
            {event.detail && event.detail !== cfg.label
              ? `${cfg.label} · ${event.detail}`
              : cfg.label}
          </AppText>
        )}
      </View>
    </View>
  );
}

/** Một ô thống kê đối đầu */
function H2HStat({ label, value, color }: { label: string; value: number; color: string }) {
  const t = useTheme();

  return (
    <View
      style={{
        flex: 1,
        alignItems: 'center',
        paddingVertical: t.spacing.md,
        backgroundColor: t.colors.surfaceSunken,
        borderRadius: t.radius.md,
        gap: 2,
      }}
    >
      <AppText variant="h1" tabular style={{ color }}>
        {value}
      </AppText>
      <AppText variant="caption" tone="muted">
        {label}
      </AppText>
    </View>
  );
}
