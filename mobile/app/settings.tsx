/**
 * ============================================================================
 * APP/SETTINGS.TSX — MÀN HÌNH CÀI ĐẶT
 * ============================================================================
 *
 * Đặc tả: ARCHITECTURE.md mục 5.5
 *
 * Mở từ ảnh đại diện ở góc phải mỗi tab — giống nút tài khoản của App Store.
 *
 * ----------------------------------------------------------------------------
 * 🗂️ VÌ SAO KHÔNG LÀM CÀI ĐẶT THÀNH MỘT TAB RIÊNG?
 *
 * Vì thanh tab chỉ nên chứa những nơi người dùng ĐI LẠI THƯỜNG XUYÊN. Cài đặt
 * thì mỗi tháng mở một lần — chiếm một ô tab vĩnh viễn cho nó là lãng phí
 * 20% diện tích điều hướng.
 *
 * ⚠️ NGOẠI LỆ: ở Senior mode, Cài đặt TRỞ THÀNH một trong ba tab (mục 7.3).
 * Người lớn tuổi khó tìm nút nhỏ ở góc màn hình, nên với họ thì việc dễ tìm
 * quan trọng hơn việc tiết kiệm chỗ.
 *
 * ----------------------------------------------------------------------------
 * 📐 CÁCH NHÓM CÁC MỤC
 *
 * Gom theo CÂU HỎI người dùng đang có trong đầu, không gom theo cấu trúc code:
 *
 *   TÀI KHOẢN — "thông tin của tôi"
 *   GIAO DIỆN — "app trông thế nào"
 *   KHÁC      — "những thứ còn lại"
 *
 * Danh sách 15 mục phẳng lì thì không ai tìm thấy gì. Ba nhóm 3-5 mục thì
 * mắt lướt qua là biết phải nhìn vào đâu.
 */

import { ScrollView, Switch, View } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Card } from '@/components/common/Card';
import { Seo } from '@/components/common/Seo';
import { PlayerAvatar } from '@/components/common/TeamLogo';
import { useAuthStore } from '@/store/authStore';
import { useSettingsStore, type ColorSchemePreference } from '@/store/settingsStore';

export default function SettingsScreen() {
  const t = useTheme();
  const router = useRouter();

  const { user, isAuthenticated, logout } = useAuthStore();
  const { isSenior, setSenior, colorScheme, setColorScheme, setSeenOnboarding } =
    useSettingsStore();

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }}>
      <Stack.Screen options={{ title: 'Cài đặt', headerShown: true }} />
      <StatusBar style={t.isDark ? 'light' : 'dark'} />

      {/* noIndex: cài đặt cá nhân không được lọt vào kết quả tìm kiếm */}
      <Seo
        title="Cài đặt"
        description="Tuỳ chỉnh giao diện và thông báo của ứng dụng Đội tuyển Việt Nam."
        path="/settings"
        noIndex
      />

      <ScrollView
        contentContainerStyle={{
          padding: t.spacing.lg,
          paddingBottom: t.spacing.xxxl,
          gap: t.spacing.lg,
        }}
        showsVerticalScrollIndicator={false}
      >
        {/* ==================== THẺ TÀI KHOẢN ==================== */}
        <Card onPress={() => router.push(isAuthenticated ? '/settings' : '/login')}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: t.spacing.md }}>
            <PlayerAvatar
              uri={user?.avatar_url ?? null}
              name={user?.full_name ?? 'Khách'}
              size={52}
            />

            <View style={{ flex: 1, gap: 2 }}>
              <AppText variant="h3">{user?.full_name ?? 'Chưa đăng nhập'}</AppText>
              <AppText variant="caption" tone="muted">
                {user?.email ?? 'Đăng nhập để lưu cầu thủ yêu thích'}
              </AppText>
            </View>

            <Ionicons name="chevron-forward" size={18} color={t.colors.textFaint} />
          </View>
        </Card>

        {/* ==================== GIAO DIỆN ==================== */}
        <SettingsGroup title="Giao diện">
          {/*
            ⭐ CÔNG TẮC SENIOR MODE — bật/tắt NGAY TẠI CHỖ, không vào màn con.

            Vì sao? Vì người dùng cần THẤY NGAY hiệu quả: bật lên là chữ toàn
            app to lên tức thì, họ biết mình vừa làm đúng. Bắt họ vào màn con,
            bật, rồi quay ra mới thấy thay đổi thì mất hẳn sự liên hệ nhân-quả.
          */}
          <SettingsRow
            icon="text"
            label="Giao diện người lớn tuổi"
            description="Chữ to hơn, nút bấm rộng hơn, bớt số liệu phụ"
            right={
              <Switch
                value={isSenior}
                onValueChange={setSenior}
                accessibilityLabel="Bật giao diện cho người lớn tuổi"
                // Màu nút gạt theo bộ nhận diện, không để màu mặc định xanh dương
                trackColor={{ false: t.colors.surfaceSunken, true: t.colors.accent }}
                thumbColor={t.static.white}
              />
            }
          />

          {/* Chọn chế độ sáng/tối — ba nút xếp hàng ngang */}
          <SettingsRow
            icon="contrast"
            label="Sáng / Tối"
            right={
              <View style={{ flexDirection: 'row', gap: 4 }}>
                {(
                  [
                    { value: 'system', label: 'Hệ thống' },
                    { value: 'light', label: 'Sáng' },
                    { value: 'dark', label: 'Tối' },
                  ] as Array<{ value: ColorSchemePreference; label: string }>
                ).map((opt) => {
                  const selected = colorScheme === opt.value;
                  return (
                    <View
                      key={opt.value}
                      onTouchEnd={() => setColorScheme(opt.value)}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      style={{
                        paddingHorizontal: t.spacing.sm,
                        paddingVertical: 6,
                        borderRadius: t.radius.sm,
                        backgroundColor: selected ? t.colors.accentSoft : t.static.transparent,
                        borderWidth: 1,
                        borderColor: selected ? t.colors.accent : t.colors.border,
                      }}
                    >
                      <AppText
                        variant="caption"
                        style={{
                          color: selected ? t.colors.accentText : t.colors.textMuted,
                          fontWeight: selected ? t.fontWeight.bold : t.fontWeight.medium,
                        }}
                      >
                        {opt.label}
                      </AppText>
                    </View>
                  );
                })}
              </View>
            }
          />
        </SettingsGroup>

        {/* ==================== KHÁC ==================== */}
        <SettingsGroup title="Khác">
          <SettingsRow
            icon="information-circle-outline"
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
            label="Điều khoản · Quyền riêng tư"
            onPress={() => {}}
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
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// CÁC THÀNH PHẦN NHỎ
// ---------------------------------------------------------------------------

/** Một nhóm cài đặt: tiêu đề nhỏ + thẻ chứa các dòng */
function SettingsGroup({ title, children }: { title: string; children: React.ReactNode }) {
  const t = useTheme();

  return (
    <View style={{ gap: t.spacing.sm }}>
      <AppText variant="overline" tone="muted" style={{ paddingLeft: 4 }}>
        {title}
      </AppText>
      <Card padded={false}>{children}</Card>
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
 */
function SettingsRow({
  icon,
  label,
  description,
  right,
  onPress,
  danger = false,
  last = false,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  description?: string;
  right?: React.ReactNode;
  onPress?: () => void;
  danger?: boolean;
  last?: boolean;
}) {
  const t = useTheme();
  const color = danger ? t.colors.accentText : t.colors.text;

  return (
    <View
      onTouchEnd={onPress}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: t.spacing.md,
        padding: t.spacing.md,
        // Chiều cao tối thiểu lấy từ token -> tự rộng ra ở senior mode
        minHeight: t.touchTarget,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
      }}
    >
      <Ionicons name={icon} size={20} color={danger ? t.colors.accentText : t.colors.bambooText} />

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
    </View>
  );
}
