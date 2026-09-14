/**
 * ============================================================================
 * COMPONENTS/SETTINGS/THEMEPICKER.TSX — CHỌN GIAO DIỆN THEO SỰ KIỆN
 * ============================================================================
 *
 * ARCHITECTURE.md mục 6.4:
 *
 *   ◉ Tự động theo sự kiện     Tết, 30/4, 2/9, Đi bão khi Việt Nam thắng
 *   ○ Cố định một theme        ┌────┐ ┌────┐ ┌────┐
 *                              │ ▇▇ │ │ ▇▇ │ │ ▇▇ │   ◄ thẻ xem trước màu
 *                              │Tết │ │2/9 │ │ASEAN│
 *   ○ Tắt                      Luôn dùng màu Đỏ cờ
 *
 *   Đang áp dụng: Đỏ cờ (mặc định)                     ◄ nói rõ trạng thái thật
 *
 * ----------------------------------------------------------------------------
 * 💾 LƯU Ở ĐÂU? — CẢ HAI NƠI, và thứ tự có chủ đích
 *
 *   1. Lưu TRÊN MÁY ngay lập tức (settingsStore) -> giao diện đổi tức thì,
 *      chạy được cả khi mất mạng và khi là khách.
 *   2. Nếu đã đăng nhập: gửi lên tài khoản (PUT /themes/preference) để đồng bộ
 *      sang máy khác. Lỗi mạng ở bước này KHÔNG hoàn tác bước 1 — người dùng
 *      vẫn thấy đúng thứ họ vừa chọn; lần sau mở app sẽ đồng bộ lại.
 *
 * Làm ngược lại (chờ server trả lời rồi mới đổi màu) thì mỗi cú chạm phải đợi
 * nửa giây mới thấy phản hồi — cảm giác app ì ạch ngay ở màn cài đặt.
 * ============================================================================
 */

import { Pressable, View } from 'react-native';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Skeleton } from '@/components/common/States';
import { themesApi } from '@/api/endpoints';
import { useSettingsStore } from '@/store/settingsStore';
import { useAuthStore } from '@/store/authStore';
import { ACTIVE_THEME_KEY } from '@/hooks/useActiveTheme';
import { formatDateTime } from '@/utils/format';
import type { EventTheme, ThemeMode } from '@/types';

const MODES: Array<{ value: ThemeMode; label: string; description: string }> = [
  { value: 'auto', label: 'Tự động theo sự kiện', description: 'Tết, 30/4, 2/9, mùa giải và “Đi bão” khi Việt Nam thắng' },
  { value: 'fixed', label: 'Cố định một theme', description: 'Luôn dùng theme bạn chọn bên dưới' },
  { value: 'off', label: 'Tắt', description: 'Luôn dùng màu gốc Đỏ cờ' },
];

export function ThemePicker() {
  const t = useTheme();
  const queryClient = useQueryClient();

  const mode = useSettingsStore((s) => s.themeMode);
  const code = useSettingsStore((s) => s.themeCode);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  const themes = useQuery({
    queryKey: ['themes', 'list'],
    queryFn: themesApi.list,
    staleTime: 60 * 60 * 1000,
  });

  /** Theme ĐANG thực sự áp dụng — có thể khác lựa chọn (vd "Tự động" nhưng hôm nay không có sự kiện) */
  const active = useQuery({
    queryKey: [...ACTIVE_THEME_KEY, mode, code],
    queryFn: () => themesApi.active(mode, code ?? undefined),
    staleTime: 5 * 60 * 1000,
  });

  const choose = (nextMode: ThemeMode, nextCode?: string) => {
    /**
     * Chọn "Cố định" mà chưa bấm theme nào -> tạm giữ theme đang áp dụng
     * (hoặc theme đầu danh sách). Không để trạng thái "cố định… nhưng là gì?"
     */
    const resolvedCode =
      nextMode === 'fixed'
        ? (nextCode ?? code ?? active.data?.theme.code ?? themes.data?.themes[0]?.code)
        : undefined;

    setTheme(nextMode, resolvedCode ?? null);

    if (isAuthenticated) {
      void themesApi
        .savePreference(nextMode, resolvedCode)
        .catch(() => undefined) // lỗi đồng bộ không hoàn tác lựa chọn trên máy (xem đầu file)
        .finally(() => void queryClient.invalidateQueries({ queryKey: ACTIVE_THEME_KEY }));
    }
  };

  return (
    <View>
      {MODES.map((m, i) => {
        const selected = mode === m.value;
        return (
          <View key={m.value}>
            <Pressable
              onPress={() => choose(m.value)}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={`${m.label}. ${m.description}`}
              style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.md,
                padding: t.spacing.md,
                minHeight: t.touchTarget,
                borderBottomWidth: i === MODES.length - 1 && !(selected && m.value === 'fixed') ? 0 : 1,
                borderBottomColor: t.colors.border,
                backgroundColor: pressed ? t.colors.surfaceSunken : 'transparent',
              })}
            >
              <Ionicons
                name={selected ? 'radio-button-on' : 'radio-button-off'}
                size={22}
                color={selected ? t.colors.accentText : t.colors.textMuted}
              />
              <View style={{ flex: 1, gap: 2 }}>
                <AppText variant="body">{m.label}</AppText>
                <AppText variant="caption" tone="muted">
                  {m.description}
                </AppText>
              </View>
            </Pressable>

            {/* Lưới thẻ xem trước — chỉ mở ra dưới lựa chọn "Cố định" */}
            {selected && m.value === 'fixed' && (
              <View
                style={{
                  flexDirection: 'row',
                  flexWrap: 'wrap',
                  gap: t.spacing.sm,
                  padding: t.spacing.md,
                  borderBottomWidth: i === MODES.length - 1 ? 0 : 1,
                  borderBottomColor: t.colors.border,
                }}
              >
                {themes.isLoading
                  ? [0, 1, 2].map((k) => <Skeleton key={k} width={96} height={84} radius={t.radius.md} />)
                  : (themes.data?.themes ?? []).map((th) => (
                      <ThemeSwatch key={th.code} theme={th} selected={code === th.code} onPress={() => choose('fixed', th.code)} />
                    ))}
              </View>
            )}
          </View>
        );
      })}

      {/* Trạng thái THẬT — lựa chọn "Tự động" không nói cho người dùng biết hôm nay là theme gì */}
      {active.data && (
        <View
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: t.spacing.sm,
            padding: t.spacing.md,
            borderTopWidth: 1,
            borderTopColor: t.colors.border,
          }}
          accessibilityLiveRegion="polite"
        >
          <View style={{ width: 12, height: 12, borderRadius: 6, backgroundColor: t.colors.accent }} />
          <AppText variant="caption" tone="muted" style={{ flex: 1 }}>
            Đang áp dụng: <AppText variant="caption" style={{ color: t.colors.text }}>{active.data.theme.name}</AppText>
            {active.data.reason === 'schedule' && active.data.ends_at
              ? ` · theo lịch sự kiện tới ${formatDateTime(active.data.ends_at)}`
              : active.data.reason === 'default' && mode === 'auto'
                ? ' · hôm nay không có sự kiện'
                : ''}
          </AppText>
        </View>
      )}
    </View>
  );
}

/**
 * Thẻ xem trước một theme: dải màu nhấn + chấm vàng trên nền của app.
 *
 * Xem trước bằng MÀU THẬT của theme theo chế độ sáng/tối hiện tại, không
 * dùng ảnh chụp — ảnh sẽ lệch màu khi người dùng đổi chế độ, còn swatch thì
 * luôn đúng thứ họ sẽ thấy.
 */
function ThemeSwatch({ theme, selected, onPress }: { theme: EventTheme; selected: boolean; onPress: () => void }) {
  const t = useTheme();
  const palette = t.isDark ? theme.palette_dark : theme.palette_light;

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={`Theme ${theme.name}`}
      style={({ pressed }) => ({
        width: 96,
        minHeight: 84,
        padding: t.spacing.sm,
        gap: 6,
        borderRadius: t.radius.md,
        borderWidth: selected ? 2 : 1,
        borderColor: selected ? t.colors.accent : t.colors.border,
        backgroundColor: t.colors.bg,
        opacity: pressed ? 0.8 : 1,
      })}
    >
      <View style={{ flexDirection: 'row', gap: 4 }}>
        {/* Màu từ SERVER (dữ liệu, không phải mã màu viết cứng) — nếu thiếu thì lấy màu gốc */}
        <View style={{ flex: 1, height: 22, borderRadius: 4, backgroundColor: palette.accent ?? t.colors.accent }} />
        <View style={{ width: 22, height: 22, borderRadius: 11, backgroundColor: palette.gold ?? t.colors.gold }} />
      </View>
      <AppText variant="caption" numberOfLines={2} style={{ color: palette.accentText ?? t.colors.accentText }}>
        {theme.name}
      </AppText>
      {selected && (
        <Ionicons name="checkmark-circle" size={16} color={t.colors.accentText} style={{ position: 'absolute', bottom: 4, right: 4 }} />
      )}
    </Pressable>
  );
}
