/**
 * ============================================================================
 * COMPONENTS/SETTINGS/SETTINGSCONTENT.TSX — NỘI DUNG MÀN HÌNH CÀI ĐẶT
 * ============================================================================
 *
 * Tách khỏi app/settings.tsx để dùng ở HAI nơi:
 *
 *   app/settings.tsx          -> màn Cài đặt mở từ ảnh đại diện (giao diện thường)
 *   app/(tabs)/account.tsx    -> TAB "Cài đặt" của Senior mode (mục 7.2: 3 tab)
 *
 * ⚠️ VÌ SAO KHÔNG IMPORT THẲNG app/settings.tsx VÀO TAB?
 * File trong app/ là MÀN HÌNH của router: nó tự đặt tiêu đề thanh điều hướng
 * (<Stack.Screen>), tự chừa vùng an toàn (SafeAreaView). Nhúng nguyên màn hình
 * vào trong một tab thì các thứ đó bị lặp — hai lớp chừa tai thỏ, tiêu đề đặt
 * nhầm lên thanh tab. Tách phần NỘI DUNG ra, mỗi nơi tự lo phần "vỏ" của mình.
 *
 * Nhóm các mục theo CÂU HỎI người dùng đang có trong đầu (xem app/settings.tsx).
 * ============================================================================
 */

import { Pressable, ScrollView, Switch, View, type ViewStyle } from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Card } from '@/components/common/Card';
import { PlayerAvatar } from '@/components/common/TeamLogo';
import { SegmentedControl } from '@/components/common/SegmentedControl';
import { GoldStar } from '@/components/decor';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore, type ColorSchemePreference } from '@/store/settingsStore';
import { ThemePicker } from '@/components/settings/ThemePicker';

/**
 * ⭐ MỖI NHÓM MỘT MÀU CHỦ ĐẠO — ba nhóm, ba màu:
 *
 *   Giao diện            -> XANH TRE (khả năng đọc, dịu mắt)
 *   Giao diện theo sự kiện -> ĐỎ CỜ   (lễ hội, cảm xúc)
 *   Khác                 -> VÀNG SAO
 *
 * Màu chỉ để PHÂN NHÓM cho mắt lướt nhanh — mỗi nhóm vẫn có tiêu đề bằng chữ,
 * nên người mù màu không mất thông tin gì.
 */
type GroupTone = 'bamboo' | 'accent' | 'gold';

const SCHEME_SEGMENTS: Array<{ value: ColorSchemePreference; label: string }> = [
  { value: 'system', label: 'Theo máy' },
  { value: 'light', label: 'Sáng' },
  { value: 'dark', label: 'Tối' },
];

export function SettingsContent() {
  const t = useTheme();
  const router = useRouter();

  const { user, isAuthenticated, logout } = useAuthStore();
  const { isSenior, setSenior, colorScheme, setColorScheme, setSeenOnboarding } =
    useSettingsStore();

  return (
    <ScrollView
      contentContainerStyle={{
        padding: t.spacing.lg,
        paddingBottom: t.spacing.xxxl,
        gap: t.spacing.lg,
      }}
      showsVerticalScrollIndicator={false}
    >
      {/* ==================== THẺ TÀI KHOẢN ==================== */}
      {/*
        Thẻ đầu trang mang DẢI CỜ đỏ + sao vàng: là mảng màu lớn nhất màn hình,
        báo ngay "đây là app của đội tuyển". Nền gradient cố định nên chữ trên
        nó dùng staticColors.onDark, không dùng t.colors.text (đổi theo chế độ).
      */}
      <Pressable
        onPress={() => router.push(isAuthenticated ? '/settings' : '/login')}
        accessibilityRole="button"
        accessibilityLabel={isAuthenticated ? 'Tài khoản của bạn' : 'Đăng nhập'}
        style={({ pressed }) => ({
          borderRadius: t.radius.lg,
          overflow: 'hidden',
          opacity: pressed ? 0.9 : 1,
        })}
      >
        <LinearGradient
          colors={t.static.flagGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.md,
            padding: t.spacing.lg,
          }}
        >
          <View>
            <PlayerAvatar
              uri={user?.avatar_url ?? null}
              name={user?.full_name ?? 'Khách'}
              size={52}
            />
            <View style={{ position: 'absolute', right: -4, bottom: -4 }}>
              <GoldStar size={20} />
            </View>
          </View>

          <View style={{ flex: 1, gap: 2 }}>
            <AppText variant="h3" style={{ color: t.static.onDark.text }}>
              {user?.full_name ?? 'Chưa đăng nhập'}
            </AppText>
            <AppText variant="caption" style={{ color: t.static.onDark.textMuted }}>
              {user?.email ?? 'Đăng nhập để lưu cầu thủ yêu thích'}
            </AppText>
          </View>

          <Ionicons name="chevron-forward" size={18} color={t.static.liveGold} />
        </LinearGradient>
      </Pressable>

      {/* ==================== GIAO DIỆN ==================== */}
      <SettingsGroup title="Giao diện" tone="bamboo">
        {/*
          ⭐ CÔNG TẮC SENIOR MODE — bật/tắt NGAY TẠI CHỖ, không vào màn con.

          Vì sao? Vì người dùng cần THẤY NGAY hiệu quả: bật lên là chữ toàn
          app to lên tức thì, họ biết mình vừa làm đúng. Bắt họ vào màn con,
          bật, rồi quay ra mới thấy thay đổi thì mất hẳn sự liên hệ nhân-quả.
        */}
        <SettingsRow
          icon="text"
          tone="bamboo"
          label="Giao diện người lớn tuổi"
          description="Chữ to hơn, nút bấm rộng hơn, bớt số liệu phụ"
          right={
            <Switch
              value={isSenior}
              onValueChange={setSenior}
              accessibilityLabel="Bật giao diện cho người lớn tuổi"
              /**
               * BẬT = xanh tre. Không dùng đỏ: công tắc đỏ dễ bị hiểu là
               * "đang lỗi / nguy hiểm", còn xanh lá là "đang bật" ai cũng hiểu.
               * TẮT = xám trung tính (draw), không dùng viền ngả xanh — ảnh chụp
               * cho thấy rãnh xanh nhạt khi tắt trông như đang bật.
               */
              trackColor={{ false: t.colors.draw, true: t.colors.bamboo }}
              thumbColor={t.static.white}
              // react-native-web đọc màu nút gạt khi bật từ prop riêng này
              {...({ activeThumbColor: t.static.white } as object)}
            />
          }
        />

        {/*
          Chọn chế độ sáng/tối.

          🐛 Bản trước vẽ ba nút bằng <View onTouchEnd>. Sự kiện touch CHỈ có
          trên màn hình cảm ứng — trình duyệt máy tính bấm chuột thì không bao
          giờ phát ra, nên trên web bấm "Sáng"/"Tối" không có tác dụng gì.
          Dùng lại SegmentedControl (bên trong là <Pressable>, nhận cả chạm,
          chuột lẫn bàn phím) và đặt xuống dòng riêng cho đủ rộng trên điện thoại.
        */}
        <View
          style={{
            padding: t.spacing.md,
            gap: t.spacing.sm,
          }}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
            <ToneIcon icon={t.isDark ? 'moon' : 'sunny'} tone="gold" />
            <AppText variant="body" style={{ flex: 1 }}>
              Sáng / Tối
            </AppText>
          </View>
          <SegmentedControl
            segments={SCHEME_SEGMENTS}
            value={colorScheme}
            onChange={setColorScheme}
          />
        </View>
      </SettingsGroup>

      {/* ==================== ⭐ GIAO DIỆN THEO SỰ KIỆN (mục 6.4) ==================== */}
      {/*
        Tách thành nhóm riêng, không nhét chung nhóm "Giao diện" ở trên: Sáng/Tối
        và Senior mode là cài đặt về KHẢ NĂNG ĐỌC, còn theme sự kiện là cài đặt
        về CẢM XÚC/TRANG TRÍ. Hai loại lựa chọn khác nhau về bản chất.
      */}
      <SettingsGroup title="Giao diện theo sự kiện" tone="accent">
        <ThemePicker />
      </SettingsGroup>

      {/* ==================== KHÁC ==================== */}
      <SettingsGroup title="Khác" tone="gold">
        <SettingsRow
          icon="information-circle-outline"
          tone="gold"
          label="Xem lại phần giới thiệu"
          description="Các slide khi mở app lần đầu"
          onPress={() => {
            // Đặt lại cờ rồi điều hướng — màn onboarding sẽ hiện lại từ đầu
            setSeenOnboarding(false);
            router.replace('/onboarding');
          }}
        />

        <SettingsRow
          icon="document-text-outline"
          tone="bamboo"
          label="Điều khoản · Quyền riêng tư"
          onPress={() => {}}
          last={!isAuthenticated}
        />

        {isAuthenticated && (
          <SettingsRow
            icon="log-out-outline"
            label="Đăng xuất"
            danger
            onPress={() => {
              void logout();
              router.replace('/');
            }}
            last
          />
        )}
      </SettingsGroup>

      {/*
        Số phiên bản — nhìn thì thừa, nhưng là thứ ĐẦU TIÊN bạn hỏi khi có
        người báo lỗi: "bạn đang dùng bản nào?". Không có nó thì mọi báo lỗi
        đều phải hỏi qua hỏi lại.
      */}
      <AppText variant="caption" tone="faint" center>
        Đội tuyển Việt Nam · Phiên bản 2.0.0
      </AppText>
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// CÁC THÀNH PHẦN NHỎ
// ---------------------------------------------------------------------------

/** Bảng tra màu theo tone: [màu vạch/mảng, màu chữ-icon đủ tương phản, nền nhạt] */
function useToneColors(tone: GroupTone) {
  const t = useTheme();
  return {
    bamboo: { solid: t.colors.bamboo, text: t.colors.bambooText, soft: t.colors.bambooSoft },
    accent: { solid: t.colors.accent, text: t.colors.accentText, soft: t.colors.accentSoft },
    gold: { solid: t.colors.gold, text: t.colors.goldText, soft: t.colors.goldSoft },
  }[tone];
}

/** Icon đặt trong ô tròn nền nhạt cùng sắc — thay cho icon trơ trọi một màu */
function ToneIcon({ icon, tone }: { icon: keyof typeof Ionicons.glyphMap; tone: GroupTone }) {
  const t = useTheme();
  const c = useToneColors(tone);
  const size = t.isSenior ? 44 : 36;

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: t.radius.full,
        backgroundColor: c.soft,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <Ionicons name={icon} size={size * 0.55} color={c.text} />
    </View>
  );
}

/**
 * Một nhóm cài đặt: tiêu đề nhỏ + thẻ chứa các dòng.
 * Tiêu đề có lóng tre màu của nhóm đứng trước — cùng nhịp với SectionHeader.
 */
function SettingsGroup({
  title,
  tone,
  children,
}: {
  title: string;
  tone: GroupTone;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const c = useToneColors(tone);

  return (
    <View style={{ gap: t.spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.sm, paddingLeft: 4 }}>
        <View style={{ width: 4, height: 14, borderRadius: 2, backgroundColor: c.solid }} />
        <AppText variant="overline" style={{ color: c.text }}>
          {title}
        </AppText>
      </View>
      <Card padded={false} style={{ borderTopWidth: 3, borderTopColor: c.solid }}>
        {children}
      </Card>
    </View>
  );
}

/**
 * Một dòng cài đặt.
 *
 * Ba hình thái tuỳ prop truyền vào:
 *   right    -> có công tắc / nút chọn bên phải
 *   onPress  -> có mũi tên ›, chạm để vào màn con
 *   danger   -> chữ đỏ, dành cho hành động khó đảo ngược (đăng xuất, xoá)
 *
 * 🐛 Dùng <Pressable>, KHÔNG dùng <View onTouchEnd>: onTouchEnd không bao giờ
 * chạy khi bấm CHUỘT trên web (xem ô Sáng/Tối phía trên).
 */
function SettingsRow({
  icon,
  tone = 'bamboo',
  label,
  description,
  right,
  onPress,
  danger = false,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  tone?: GroupTone;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  const color = danger ? t.colors.accentText : t.colors.text;

  const rowStyle: ViewStyle = {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.md,
    padding: t.spacing.md,
    // Chiều cao tối thiểu lấy từ token -> tự rộng ra ở senior mode
    minHeight: t.touchTarget,
    borderBottomWidth: last ? 0 : 1,
    borderBottomColor: t.colors.border,
  };

  const content = (
    <>
      <ToneIcon icon={icon} tone={danger ? 'accent' : tone} />

      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="body" style={{ color }}>
          {label}
        </AppText>
        {description && (
          <AppText variant="caption" tone="muted">
            {description}
          </AppText>
        )}
      </View>

      {right ?? (onPress && <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />)}
    </>
  );

  // Dòng có công tắc thì KHÔNG bọc Pressable: công tắc tự nhận thao tác,
  // bọc thêm một vùng bấm bên ngoài chỉ gây nháy nền khi gạt.
  if (!onPress) return <View style={rowStyle}>{content}</View>;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={label}
      style={({ pressed }) => [rowStyle, pressed && { backgroundColor: t.colors.surfaceSunken }]}
    >
      {content}
    </Pressable>
  );
}
