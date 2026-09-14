/**
 * ============================================================================
 * COMPONENTS/SENIOR/SENIORHOME.TSX — TAB "TRẬN ĐẤU" CHO NGƯỜI LỚN TUỔI
 * ============================================================================
 *
 * ARCHITECTURE.md mục 7.3. Senior mode chỉ trả lời đúng BA câu hỏi:
 *
 *     Mấy giờ đá?     Xem kênh nào?     Tỷ số bao nhiêu?
 *
 *   ┌───────────────────────────────────┐
 *   │  TRẬN TIẾP THEO                   │
 *   │  Việt Nam  –  Malaysia            │  chữ to, KHÔNG viết tắt tên đội
 *   │  19 giờ 30, Thứ Năm 8/10          │  giờ viết bằng CHỮ, có thứ trong tuần
 *   │  📺 Kênh VTV5 và FPT Play         │
 *   │  [ 🔔  NHẮC TÔI TRƯỚC GIỜ ĐÁ ]     │  nút cao 56pt, rộng cả màn
 *   ├───────────────────────────────────┤
 *   │  ĐANG ĐÁ — Phút 67                │  (chỉ khi có trận live)
 *   │  VIỆT NAM   2 – 1   THÁI LAN      │  tỷ số cỡ 56
 *   │  [ 🔊  ĐỌC TỶ SỐ ]                 │
 *   ├───────────────────────────────────┤
 *   │  KẾT QUẢ GẦN NHẤT                 │
 *   │  Việt Nam thắng Indonesia 2 – 0   │  CÂU hoàn chỉnh có chữ thắng/hoà/thua
 *   │  [ ↻  TẢI LẠI ]                    │
 *   └───────────────────────────────────┘
 *
 * ----------------------------------------------------------------------------
 * ✍️ VÌ SAO VIẾT THÀNH CÂU THAY VÌ BẢNG/KÝ HIỆU?
 *
 *   "VIE 2-0 IDN · FT"          -> phải biết VIE là gì, FT là gì, ai thắng
 *   "Việt Nam thắng Indonesia 2 – 0" -> đọc một lần là hiểu, không cần giải mã
 *
 * Ký hiệu nhanh với người quen dùng app thể thao, nhưng mỗi ký hiệu là một bước
 * dịch trong đầu. Người lớn tuổi không thiếu hiểu biết bóng đá — họ chỉ không
 * có lý do gì phải học bộ ký hiệu của app.
 * ============================================================================
 */

import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import * as Speech from 'expo-speech';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Card } from '@/components/common/Card';
import { Button } from '@/components/common/Button';
import { EmptyState, Skeleton } from '@/components/common/States';
import { Seo } from '@/components/common/Seo';
import { matchesApi } from '@/api/endpoints';
import { useLiveScore } from '@/hooks/useLiveScore';
import { scheduleKickoffReminder } from '@/services/notifications';
import type { Match } from '@/types';

// ---------------------------------------------------------------------------
// HÀM THUẦN — viết ngày giờ và kết quả thành CÂU
// ---------------------------------------------------------------------------

const WEEKDAYS = ['Chủ Nhật', 'Thứ Hai', 'Thứ Ba', 'Thứ Tư', 'Thứ Năm', 'Thứ Sáu', 'Thứ Bảy'];

/**
 * "19 giờ 30, Thứ Năm 8/10" — giờ viết bằng chữ, có thứ trong tuần.
 *
 * Vì sao có THỨ? Người lớn tuổi nhớ lịch theo thứ ("tối thứ Năm có bóng đá")
 * nhiều hơn theo ngày tháng. "8/10" một mình buộc họ phải đi xem lịch.
 *
 * Giờ 19:00 viết "19 giờ" chứ không "19 giờ 00" — không ai nói "không phút".
 * Dùng giờ của MÁY (getHours), tức giờ Việt Nam với người ở Việt Nam.
 */
export function kickoffInWords(iso: string): string {
  const d = new Date(iso);
  const minutes = d.getMinutes();
  const time = minutes === 0 ? `${d.getHours()} giờ` : `${d.getHours()} giờ ${String(minutes).padStart(2, '0')}`;
  return `${time}, ${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

const isVietnam = (team: Match['home_team']) => team.fifa_code === 'VIE';

/**
 * "Việt Nam thắng Indonesia 2 – 0" — luôn nói TỪ PHÍA VIỆT NAM, Việt Nam đứng trước.
 *
 * ⚠️ Tỷ số cũng phải đảo theo: VN đá sân khách thắng 1-2 thì câu là
 * "Việt Nam thắng Thái Lan 2 – 1", KHÔNG phải "2 – 1" giữ nguyên thứ tự nhà-khách
 * nhưng đặt Việt Nam lên trước (sẽ thành "Việt Nam thắng Thái Lan 1 – 2" — vô lý).
 */
export function resultSentence(m: Match): string {
  const vieHome = isVietnam(m.home_team);
  const [vie, opp] = vieHome ? [m.home_score, m.away_score] : [m.away_score, m.home_score];
  const opponent = vieHome ? m.away_team.name : m.home_team.name;
  const verb = vie > opp ? 'thắng' : vie < opp ? 'thua' : 'hoà';
  return `Việt Nam ${verb} ${opponent} ${vie} – ${opp}`;
}

// ---------------------------------------------------------------------------
// COMPONENT
// ---------------------------------------------------------------------------

export function SeniorHome() {
  const t = useTheme();

  const latest = useQuery({ queryKey: ['match', 'latest'], queryFn: matchesApi.latest });
  const upcoming = useQuery({ queryKey: ['matches', 'upcoming', 'senior'], queryFn: () => matchesApi.upcoming(1, 3) });
  const results = useQuery({ queryKey: ['matches', 'results', 'senior'], queryFn: () => matchesApi.results(1, 1) });

  const liveMatch = latest.data?.match?.status === 'live' ? latest.data.match : null;
  const nextMatch = upcoming.data?.data.matches.find((m) => m.status === 'scheduled') ?? null;
  const lastResult = results.data?.data.matches[0] ?? null;

  const reload = () => {
    void Promise.all([latest.refetch(), upcoming.refetch(), results.refetch()]);
  };

  const loading = latest.isLoading || upcoming.isLoading || results.isLoading;

  return (
    <Screen onRefresh={reload} refreshing={latest.isRefetching}>
      <Seo
        title="Lịch thi đấu và tỷ số Đội tuyển Việt Nam"
        description="Giờ thi đấu, kênh phát sóng và tỷ số trực tiếp của Đội tuyển Việt Nam, trình bày chữ to, dễ đọc."
        path="/"
      />

      <View style={{ gap: t.spacing.xl, paddingTop: t.spacing.lg }}>
        {loading ? (
          <>
            <Skeleton height={260} radius={t.radius.lg} />
            <Skeleton height={140} radius={t.radius.lg} />
          </>
        ) : (
          <>
            {liveMatch && <LiveBlock match={liveMatch} />}
            {nextMatch ? (
              <NextMatchBlock match={nextMatch} />
            ) : (
              !liveMatch && <EmptyState icon="calendar-outline" title="Chưa có lịch thi đấu mới" />
            )}
            {lastResult && (
              <Card>
                <AppText variant="overline" tone="muted">
                  Kết quả gần nhất
                </AppText>
                <AppText variant="h2" style={{ marginTop: t.spacing.sm }}>
                  {resultSentence(lastResult)}
                </AppText>
                <AppText variant="body" tone="muted" style={{ marginTop: 4 }}>
                  {lastResult.competition} · {kickoffInWords(lastResult.kickoff_at)}
                </AppText>
              </Card>
            )}
          </>
        )}

        {/* Mục 7.2: "Mọi thao tác đều có nút bấm" — kéo để làm mới vẫn còn, nhưng không ai phải biết cử chỉ đó */}
        <Button label="Tải lại" icon="refresh" variant="secondary" size="lg" fullWidth onPress={reload} loading={latest.isRefetching} />
      </View>
    </Screen>
  );
}

function NextMatchBlock({ match }: { match: Match }) {
  const t = useTheme();
  const [notice, setNotice] = useState<{ ok: boolean; message: string } | null>(null);
  const [busy, setBusy] = useState(false);
  const channels = match.tv_channels ?? [];

  const remind = async () => {
    setBusy(true);
    setNotice(
      await scheduleKickoffReminder({
        matchId: match.id,
        homeName: match.home_team.name,
        awayName: match.away_team.name,
        kickoffAt: match.kickoff_at,
        channels,
      })
    );
    setBusy(false);
  };

  return (
    <Card>
      <AppText variant="overline" tone="muted">
        Trận tiếp theo
      </AppText>

      {/* Tên đầy đủ, xuống dòng thoải mái — không bao giờ cắt "…" tên đội ở Senior mode */}
      <AppText variant="h1" style={{ marginTop: t.spacing.sm }}>
        {match.home_team.name} – {match.away_team.name}
      </AppText>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, marginTop: t.spacing.md }}>
        <Ionicons name="time" size={26} color={t.colors.accentText} />
        <AppText variant="h3" style={{ flex: 1 }}>
          {kickoffInWords(match.kickoff_at)}
        </AppText>
      </View>

      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, marginTop: t.spacing.sm }}>
        <Ionicons name="tv" size={26} color={t.colors.bambooText} />
        <AppText variant="h3" style={{ flex: 1 }}>
          {channels.length > 0 ? `Kênh ${channels.join(' và ')}` : 'Chưa có thông tin kênh phát sóng'}
        </AppText>
      </View>

      {match.venue && (
        <AppText variant="body" tone="muted" style={{ marginTop: t.spacing.sm }}>
          Sân {match.venue} · {match.competition}
        </AppText>
      )}

      <View style={{ marginTop: t.spacing.lg }}>
        <Button label="Nhắc tôi trước giờ đá" icon="notifications" size="lg" fullWidth loading={busy} onPress={() => void remind()} />
      </View>

      {/* Kết quả của nút nói bằng câu đầy đủ, ngay dưới nút — không toast biến mất sau 2 giây */}
      {notice && (
        <View style={{ flexDirection: 'row', gap: t.spacing.sm, marginTop: t.spacing.md }} accessibilityLiveRegion="polite">
          <Ionicons
            name={notice.ok ? 'checkmark-circle' : 'alert-circle'}
            size={24}
            color={notice.ok ? t.colors.win : t.colors.accentText}
          />
          <AppText variant="body" style={{ flex: 1 }}>
            {notice.message}
          </AppText>
        </View>
      )}
    </Card>
  );
}

function LiveBlock({ match }: { match: Match }) {
  const t = useTheme();
  const router = useRouter();
  const [speaking, setSpeaking] = useState(false);

  const live = useLiveScore(
    match.id,
    { home: match.home_score, away: match.away_score, minute: match.minute, status: match.status },
    true
  );

  // Rời màn hình thì tắt giọng đọc — xem giải thích ở components/ai/AiAssistant.tsx
  useEffect(() => () => void Speech.stop(), []);

  const speak = () => {
    if (speaking) {
      void Speech.stop();
      setSpeaking(false);
      return;
    }
    /**
     * Câu đọc: "Phút 67. Việt Nam 2, Thái Lan 1." (mục 7.4)
     * Dấu chấm sau số phút tạo một nhịp ngừng tự nhiên — đọc liền "phút 67 Việt
     * Nam 2" nghe như "phút 67 Việt Nam hai" dính vào nhau, rất khó nghe.
     */
    const minute = live.minute ? `Phút ${live.minute}. ` : '';
    setSpeaking(true);
    Speech.speak(`${minute}${match.home_team.name} ${live.homeScore}, ${match.away_team.name} ${live.awayScore}.`, {
      language: 'vi-VN',
      rate: 0.85,
      onDone: () => setSpeaking(false),
      onStopped: () => setSpeaking(false),
      onError: () => setSpeaking(false),
    });
  };

  return (
    <Card onPress={() => router.push(`/match/${match.id}`)}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm }}>
        <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.colors.accent }} />
        <AppText variant="h3" tone="accent">
          ĐANG ĐÁ{live.minute ? ` — Phút ${live.minute}` : ''}
        </AppText>
      </View>

      <View style={{ alignItems: 'center', marginTop: t.spacing.md, gap: t.spacing.sm }}>
        <AppText variant="h3" center>
          {match.home_team.name}
        </AppText>
        <AppText
          variant="display"
          tabular
          center
          accessibilityLabel={`${match.home_team.name} ${live.homeScore}, ${match.away_team.name} ${live.awayScore}`}
        >
          {live.homeScore} – {live.awayScore}
        </AppText>
        <AppText variant="h3" center>
          {match.away_team.name}
        </AppText>
      </View>

      <View style={{ marginTop: t.spacing.lg }}>
        <Button
          label={speaking ? 'Dừng đọc' : 'Đọc tỷ số'}
          icon={speaking ? 'stop-circle' : 'volume-high'}
          variant="secondary"
          size="lg"
          fullWidth
          onPress={speak}
        />
      </View>
    </Card>
  );
}
