/**
 * ============================================================================
 * COMPONENTS/COMMON/STATES.TSX — BỐN TRẠNG THÁI CỦA MỌI MÀN HÌNH
 * ============================================================================
 *
 * ⭐ BÀI HỌC QUAN TRỌNG NHẤT VỀ GIAO DIỆN THỰC TẾ:
 *
 * Người mới thường chỉ làm trạng thái "có dữ liệu đẹp" rồi coi là xong.
 * Nhưng một màn hình hoàn chỉnh phải xử lý ĐỦ BỐN tình huống:
 *
 *   1. ĐANG TẢI  -> Skeleton (khung xám mô phỏng bố cục), KHÔNG phải vòng quay
 *   2. LỖI       -> nói rõ lỗi gì + nút "Thử lại"
 *   3. RỖNG      -> giải thích vì sao trống + gợi ý việc nên làm
 *   4. CÓ DỮ LIỆU
 *
 * VÌ SAO SKELETON TỐT HƠN VÒNG QUAY?
 *   • Vòng quay không cho biết sắp thấy gì -> cảm giác chờ lâu hơn thực tế
 *   • Skeleton vẽ sẵn hình dạng nội dung -> não người dùng "chuẩn bị" trước,
 *     và khi dữ liệu về thì không bị giật bố cục
 * Nghiên cứu về trải nghiệm cho thấy skeleton khiến người dùng CẢM GIÁC
 * nhanh hơn ~20% dù thời gian tải y hệt.
 */

import { useEffect } from 'react';
import { View, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from './Text';
import { Button } from './Button';

// ===========================================================================
// 1. SKELETON — khối xám nhấp nháy
// ===========================================================================
export function Skeleton({
  width = '100%',
  height = 16,
  radius,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}) {
  const t = useTheme();

  /**
   * useSharedValue là "biến sống trên luồng đồ hoạ" của Reanimated.
   * Hoạt ảnh chạy ở đó nên vẫn mượt 60fps kể cả khi luồng JavaScript
   * đang bận xử lý dữ liệu vừa tải về.
   */
  const opacity = useSharedValue(0.4);

  useEffect(() => {
    // withRepeat(..., -1, true) = lặp vô hạn, chạy tới rồi chạy lui
    opacity.value = withRepeat(
      withTiming(0.9, { duration: 900, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: t.colors.skeleton,
          borderRadius: radius ?? t.radius.sm,
        },
        animatedStyle,
        style,
      ]}
    />
  );
}

/** Skeleton mô phỏng một thẻ trận đấu — dùng cho danh sách đang tải */
export function MatchCardSkeleton() {
  const t = useTheme();

  return (
    <View
      style={{
        backgroundColor: t.colors.surface,
        borderRadius: t.radius.lg,
        borderWidth: 1,
        borderColor: t.colors.border,
        padding: t.spacing.lg,
        gap: t.spacing.md,
      }}
    >
      <Skeleton width="40%" height={11} />
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <View style={{ alignItems: 'center', gap: t.spacing.sm, flex: 1 }}>
          <Skeleton width={44} height={44} radius={t.radius.full} />
          <Skeleton width="70%" height={13} />
        </View>
        <Skeleton width={54} height={30} />
        <View style={{ alignItems: 'center', gap: t.spacing.sm, flex: 1 }}>
          <Skeleton width={44} height={44} radius={t.radius.full} />
          <Skeleton width="70%" height={13} />
        </View>
      </View>
    </View>
  );
}

/** Skeleton mô phỏng một dòng cầu thủ */
export function PlayerRowSkeleton() {
  const t = useTheme();

  return (
    <View
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        paddingVertical: t.spacing.md,
      }}
    >
      <Skeleton width={48} height={48} radius={t.radius.full} />
      <View style={{ flex: 1, gap: t.spacing.sm }}>
        <Skeleton width="55%" height={15} />
        <Skeleton width="35%" height={12} />
      </View>
      <Skeleton width={56} height={14} />
    </View>
  );
}

// ===========================================================================
// 2. TRẠNG THÁI LỖI
// ===========================================================================
/**
 * Một màn hình lỗi tốt phải trả lời 3 câu hỏi của người dùng:
 *   "Chuyện gì vậy?"  -> tiêu đề
 *   "Vì sao?"         -> mô tả
 *   "Giờ làm gì?"     -> nút hành động
 */
export function ErrorState({
  title = 'Không tải được dữ liệu',
  message,
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  const t = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: t.spacing.xxxl,
        paddingHorizontal: t.spacing.xl,
        gap: t.spacing.md,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: t.radius.full,
          backgroundColor: t.colors.loseSoft,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name="cloud-offline-outline" size={30} color={t.colors.lose} />
      </View>

      <AppText variant="h3" center>
        {title}
      </AppText>

      {message && (
        <AppText variant="caption" tone="muted" center style={{ maxWidth: 320 }}>
          {message}
        </AppText>
      )}

      {onRetry && (
        <Button
          label="Thử lại"
          onPress={onRetry}
          variant="secondary"
          icon="refresh"
          style={{ marginTop: t.spacing.sm }}
        />
      )}
    </View>
  );
}

// ===========================================================================
// 3. TRẠNG THÁI RỖNG
// ===========================================================================
export function EmptyState({
  icon = 'football-outline',
  title,
  message,
  action,
}: {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  action?: React.ReactNode;
}) {
  const t = useTheme();

  return (
    <View
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: t.spacing.xxxl,
        paddingHorizontal: t.spacing.xl,
        gap: t.spacing.md,
      }}
    >
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: t.radius.full,
          backgroundColor: t.colors.surfaceRaised,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Ionicons name={icon} size={30} color={t.colors.textFaint} />
      </View>

      <AppText variant="h3" tone="muted" center>
        {title}
      </AppText>

      {message && (
        <AppText variant="caption" tone="faint" center style={{ maxWidth: 300 }}>
          {message}
        </AppText>
      )}

      {action}
    </View>
  );
}

// ===========================================================================
// 4. ĐANG TẢI (dạng danh sách)
// ===========================================================================
/** Lặp lại skeleton N lần — dùng khi biết trước sắp hiện ra danh sách */
export function LoadingList({
  count = 3,
  variant = 'match',
}: {
  count?: number;
  variant?: 'match' | 'player';
}) {
  const t = useTheme();
  const Item = variant === 'match' ? MatchCardSkeleton : PlayerRowSkeleton;

  return (
    <View style={{ gap: t.spacing.md }}>
      {/* Array.from tạo mảng rỗng độ dài count để lặp */}
      {Array.from({ length: count }).map((_, i) => (
        <Item key={i} />
      ))}
    </View>
  );
}
