/**
 * ============================================================================
 * COMPONENTS/MATCH/LIVESCORECARD.TSX — THẺ TỶ SỐ (ngôi sao của app)
 * ============================================================================
 *
 * Đây là thành phần ĐƯỢC NHÌN NHIỀU NHẤT. Nó phải trả lời trong 1 giây:
 * "Đội tuyển Việt Nam đang thế nào?"
 *
 * BA HÌNH THÁI, MỘT BỐ CỤC:
 *
 *   ĐANG ĐÁ                SẮP ĐÁ                 ĐÃ XONG
 *   ┌──────────────┐      ┌──────────────┐      ┌──────────────┐
 *   │ 🔴 ĐANG ĐÁ 67'│      │ Còn 2 ngày   │      │ Kết thúc     │
 *   │ VIE  2 - 0 IDN│      │ VIE   vs  MAS│      │ VIE  3-1  MAS│
 *   │ nền đỏ gradient│     │  19:30 08/10 │      │  nền phẳng   │
 *   └──────────────┘      └──────────────┘      └──────────────┘
 *
 * ----------------------------------------------------------------------------
 * QUYẾT ĐỊNH THIẾT KẾ: VÌ SAO CHỈ TRẬN LIVE MỚI CÓ NỀN GRADIENT ĐỎ?
 *
 * Vì trong toàn app chỉ nên có ĐÚNG MỘT điểm "hét to nhất". Nếu thẻ nào cũng
 * rực rỡ thì chẳng thẻ nào nổi bật. Trận đang đá là thông tin khẩn cấp nhất
 * -> nó được độc quyền dùng màu mạnh. Mọi thứ khác giữ nền trung tính.
 *
 * Chấm đỏ nhấp nháy cũng vậy: đây là hoạt ảnh liên tục DUY NHẤT của app.
 * Chuyển động thu hút mắt rất mạnh — dùng nhiều là gây khó chịu.
 */

import { useEffect } from 'react';
import { Pressable, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Badge } from '@/components/common/Card';
import { TeamLogo } from '@/components/common/TeamLogo';
import { useCountdown } from '@/hooks/useCountdown';
import { formatDateTime, formatRelative } from '@/utils/format';
import type { Match } from '@/types';

interface LiveScoreCardProps {
  match: Match;
  /** Tỷ số thời gian thực, ghi đè lên dữ liệu tĩnh của match */
  liveScore?: { home: number; away: number; minute: number | null; status: string };
  connectionMode?: 'socket' | 'polling' | 'offline';
  justScored?: boolean;
  onPress?: () => void;
}

export function LiveScoreCard({
  match,
  liveScore,
  connectionMode,
  justScored = false,
  onPress,
}: LiveScoreCardProps) {
  const t = useTheme();

  // Ưu tiên dữ liệu realtime; chưa có thì dùng dữ liệu từ API
  const homeScore = liveScore?.home ?? match.home_score;
  const awayScore = liveScore?.away ?? match.away_score;
  const minute = liveScore?.minute ?? match.minute;
  const status = liveScore?.status ?? match.status;

  const isLive = status === 'live';
  const isFinished = status === 'finished';
  const isScheduled = status === 'scheduled';

  const countdown = useCountdown(isScheduled ? match.kickoff_at : null);

  // -----------------------------------------------------------------------
  // HOẠT ẢNH 1: chấm đỏ "ĐANG ĐÁ" nhấp nháy
  // -----------------------------------------------------------------------
  const dotOpacity = useSharedValue(1);

  useEffect(() => {
    if (!isLive) return;

    // Mờ dần rồi rõ lại, lặp vô hạn — như nhịp đập
    dotOpacity.value = withRepeat(
      withTiming(0.25, { duration: 800, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [isLive, dotOpacity]);

  const dotStyle = useAnimatedStyle(() => ({ opacity: dotOpacity.value }));

  // -----------------------------------------------------------------------
  // HOẠT ẢNH 2: tỷ số "nảy" lên khi có bàn thắng
  // -----------------------------------------------------------------------
  const scoreScale = useSharedValue(1);

  useEffect(() => {
    if (!justScored) return;

    // Phóng to 1.18 lần trong 180ms rồi thu về — cảm giác ăn mừng
    scoreScale.value = withSequence(
      withTiming(1.18, { duration: 180, easing: Easing.out(Easing.quad) }),
      withTiming(1, { duration: 240, easing: Easing.inOut(Easing.ease) })
    );
  }, [justScored, scoreScale]);

  const scoreStyle = useAnimatedStyle(() => ({ transform: [{ scale: scoreScale.value }] }));

  // -----------------------------------------------------------------------
  // NỘI DUNG THẺ
  // -----------------------------------------------------------------------
  const content = (
    <View style={{ padding: t.spacing.lg, gap: t.spacing.lg }}>
      {/* ===== HÀNG TRÊN: giải đấu + trạng thái ===== */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: t.spacing.sm }}>
        <View style={{ flex: 1 }}>
          <AppText
            variant="overline"
            style={{ color: isLive ? 'rgba(255,255,255,0.85)' : t.colors.textMuted }}
            numberOfLines={1}
          >
            {match.competition}
          </AppText>
          {match.round && (
            <AppText
              variant="caption"
              style={{ color: isLive ? 'rgba(255,255,255,0.65)' : t.colors.textFaint }}
              numberOfLines={1}
            >
              {match.round}
            </AppText>
          )}
        </View>

        {/* Nhãn trạng thái ở góc phải */}
        {isLive ? (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
            <Animated.View
              style={[
                { width: 8, height: 8, borderRadius: 4, backgroundColor: t.static.liveGold },
                dotStyle,
              ]}
            />
            <AppText
              tabular
              style={{
                fontSize: t.fontSize.sm,
                fontWeight: t.fontWeight.bold,
                color: t.static.liveGold,
                letterSpacing: 0.5,
              }}
            >
              {minute != null ? `${minute}'` : 'ĐANG ĐÁ'}
            </AppText>
          </View>
        ) : isFinished ? (
          <Badge label="KẾT THÚC" tone="neutral" size="sm" />
        ) : (
          <Badge label={countdown.text || formatRelative(match.kickoff_at)} tone="accent" size="sm" />
        )}
      </View>

      {/* ===== HÀNG GIỮA: hai đội và tỷ số ===== */}
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        {/* --- Đội nhà --- */}
        <TeamColumn
          name={match.home_team.name}
          logo={match.home_team.logo_url}
          code={match.home_team.fifa_code}
          onDark={isLive}
        />

        {/* --- Tỷ số hoặc "VS" --- */}
        <View style={{ paddingHorizontal: t.spacing.md, alignItems: 'center', minWidth: 96 }}>
          {isScheduled ? (
            <>
              <AppText
                variant="h2"
                style={{ color: t.colors.textFaint, letterSpacing: 1 }}
              >
                VS
              </AppText>
              <AppText variant="caption" tone="muted" tabular style={{ marginTop: 2 }}>
                {formatDateTime(match.kickoff_at).split(' · ')[0]}
              </AppText>
            </>
          ) : (
            <Animated.View style={scoreStyle}>
              <AppText
                variant="display"
                tabular
                center
                style={{ color: isLive ? '#FFFFFF' : t.colors.text }}
              >
                {homeScore}
                <AppText
                  variant="h1"
                  style={{ color: isLive ? 'rgba(255,255,255,0.5)' : t.colors.textFaint }}
                >
                  {'  -  '}
                </AppText>
                {awayScore}
              </AppText>
            </Animated.View>
          )}
        </View>

        {/* --- Đội khách --- */}
        <TeamColumn
          name={match.away_team.name}
          logo={match.away_team.logo_url}
          code={match.away_team.fifa_code}
          onDark={isLive}
        />
      </View>

      {/* ===== HÀNG DƯỚI: sân + tình trạng kết nối ===== */}
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: t.spacing.sm,
          borderTopWidth: 1,
          borderTopColor: isLive ? 'rgba(255,255,255,0.15)' : t.colors.border,
          paddingTop: t.spacing.md,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1 }}>
          <Ionicons
            name="location-outline"
            size={13}
            color={isLive ? 'rgba(255,255,255,0.7)' : t.colors.textFaint}
          />
          <AppText
            variant="caption"
            numberOfLines={1}
            style={{ color: isLive ? 'rgba(255,255,255,0.7)' : t.colors.textFaint, flex: 1 }}
          >
            {match.venue ?? 'Chưa xác định sân'}
          </AppText>
        </View>

        {/*
          CHỈ BÁO KẾT NỐI — chi tiết nhỏ nhưng rất hữu ích.
          Người dùng biết được dữ liệu đang tươi hay đang chậm.
          Có ICON + CHỮ, không chỉ màu.
        */}
        {isLive && connectionMode && (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
            <Ionicons
              name={
                connectionMode === 'socket' ? 'flash' :
                connectionMode === 'polling' ? 'refresh' : 'cloud-offline-outline'
              }
              size={12}
              color={connectionMode === 'socket' ? t.static.liveGold : 'rgba(255,255,255,0.7)'}
            />
            <AppText
              style={{
                fontSize: 10,
                fontWeight: t.fontWeight.semibold,
                color: connectionMode === 'socket' ? t.static.liveGold : 'rgba(255,255,255,0.7)',
              }}
            >
              {connectionMode === 'socket' ? 'TRỰC TIẾP' :
               connectionMode === 'polling' ? 'ĐỒNG BỘ' : 'MẤT KẾT NỐI'}
            </AppText>
          </View>
        )}
      </View>
    </View>
  );

  // -----------------------------------------------------------------------
  // VỎ NGOÀI: gradient đỏ nếu đang đá, nền phẳng nếu không
  // -----------------------------------------------------------------------
  const wrapperStyle = {
    borderRadius: t.radius.xl,
    overflow: 'hidden' as const,
    borderWidth: isLive ? 0 : 1,
    borderColor: t.colors.border,
  };

  const inner = isLive ? (
    <LinearGradient
      colors={t.static.liveGradient}
      // Gradient chéo từ góc trên-trái xuống dưới-phải: có chiều sâu hơn
      // là gradient thẳng đứng đơn điệu
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    >
      {content}
    </LinearGradient>
  ) : (
    <View style={{ backgroundColor: t.colors.surface }}>{content}</View>
  );

  if (!onPress) return <View style={wrapperStyle}>{inner}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`Chi tiết trận ${match.home_team.name} gặp ${match.away_team.name}`}
      style={({ pressed }) => [wrapperStyle, pressed && { opacity: 0.92, transform: [{ scale: 0.995 }] }]}
    >
      {inner}
    </Pressable>
  );
}

/**
 * Một cột đội: logo bên trên, tên bên dưới.
 * flex: 1 để hai cột chia đều phần còn lại sau khi trừ ô tỷ số ở giữa.
 */
function TeamColumn({
  name,
  logo,
  code,
  onDark,
}: {
  name: string;
  logo: string | null;
  code: string | null;
  onDark: boolean;
}) {
  const t = useTheme();

  return (
    <View style={{ flex: 1, alignItems: 'center', gap: t.spacing.sm }}>
      <TeamLogo uri={logo} fifaCode={code} name={name} size={52} />
      <AppText
        variant="label"
        center
        numberOfLines={2}
        style={{ color: onDark ? '#FFFFFF' : t.colors.text }}
      >
        {name}
      </AppText>
    </View>
  );
}
