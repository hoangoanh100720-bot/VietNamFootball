/**
 * ============================================================================
 * HOOKS/USEACTIVETHEME.TS — HÔM NAY APP KHOÁC THEME NÀO?
 * ============================================================================
 *
 * Hỏi server theme đang áp dụng (Tết, Quốc khánh, Đi bão…) và giữ cho nó luôn
 * đúng theo thời gian thực. Ba cơ chế cập nhật, mỗi cái xử lý một tình huống:
 *
 *   1. SOCKET `theme:changed`  — Việt Nam vừa thắng, server bật "Đi bão" ->
 *                                 mọi app đang mở đổi màu trong vòng 1 giây
 *   2. HẸN GIỜ theo `ends_at`   — "Đi bão" hết hạn lúc 21:30 mai -> app tự tải
 *                                 lại đúng lúc đó, không cần server nhắc
 *   3. staleTime 5 phút         — lưới an toàn khi hai cơ chế trên đều trượt
 *                                 (mất mạng lúc socket bắn, máy ngủ qua giờ hẹn)
 *
 * ----------------------------------------------------------------------------
 * ⚠️ THEME LỖI KHÔNG ĐƯỢC LÀM HỎNG APP
 *
 * Không tải được theme (mất mạng, server bảo trì) -> trả về `null` -> app dùng
 * bảng màu gốc Đỏ cờ. Theme là LỚP TRANG TRÍ; người dùng mở app để xem tỷ số,
 * không phải để xem màu. Vì vậy ở đây không có trạng thái lỗi nào được đẩy lên
 * giao diện, và `retry: 1` (không thử lại dồn dập như dữ liệu quan trọng).
 * ============================================================================
 */

import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { themesApi } from '@/api/endpoints';
import { useSettingsStore } from '@/store/settingsStore';
import { getSocket } from '@/services/socket';
import type { ActiveThemeResponse } from '@/types';

export const ACTIVE_THEME_KEY = ['themes', 'active'] as const;

/**
 * Hẹn giờ tối đa ~24 ngày. setTimeout của JavaScript dùng số nguyên 32-bit:
 * truyền quá 2^31−1 mili-giây (≈ 24,8 ngày) thì nó chạy NGAY LẬP TỨC — một lỗi
 * kinh điển khiến app tải lại theme liên tục không ngừng. Lịch Tết dài vài
 * tuần hoàn toàn có thể chạm ngưỡng này.
 */
const MAX_TIMEOUT_MS = 2_000_000_000;

export function useActiveTheme(): ActiveThemeResponse | null {
  const queryClient = useQueryClient();
  const mode = useSettingsStore((s) => s.themeMode);
  const code = useSettingsStore((s) => s.themeCode);
  const hydrated = useSettingsStore((s) => s.hydrated);

  const query = useQuery({
    // mode + code nằm trong khoá: đổi lựa chọn là một truy vấn mới, không dùng nhầm cache cũ
    queryKey: [...ACTIVE_THEME_KEY, mode, code],
    queryFn: () => themesApi.active(mode, code ?? undefined),
    /**
     * Chờ đọc xong cài đặt trên máy. Không có dòng này, lần gọi đầu dùng mặc
     * định 'auto' -> app hiện theme sự kiện -> đọc xong thấy người dùng chọn
     * 'off' -> nhảy về màu gốc. Một cú nháy màu ngay lúc mở app.
     */
    enabled: hydrated,
    staleTime: 5 * 60 * 1000,
    retry: 1,
  });

  // ---- 1. Socket: server báo có theme mới ----
  useEffect(() => {
    const socket = getSocket();
    const onChanged = () => void queryClient.invalidateQueries({ queryKey: ACTIVE_THEME_KEY });
    socket.on('theme:changed', onChanged);
    // Gỡ đúng listener này khi unmount — gỡ tất cả (socket.off('theme:changed'))
    // sẽ xoá luôn listener của nơi khác đang nghe cùng sự kiện
    return () => {
      socket.off('theme:changed', onChanged);
    };
  }, [queryClient]);

  // ---- 2. Hẹn giờ: tự tải lại khi lịch hiện tại hết hạn ----
  const endsAt = query.data?.ends_at;
  useEffect(() => {
    if (!endsAt) return;
    const ms = new Date(endsAt).getTime() - Date.now();
    if (ms <= 0) return;

    const timer = setTimeout(
      () => void queryClient.invalidateQueries({ queryKey: ACTIVE_THEME_KEY }),
      Math.min(ms + 1000, MAX_TIMEOUT_MS) // +1 giây để chắc chắn server đã qua mốc
    );
    return () => clearTimeout(timer);
  }, [endsAt, queryClient]);

  return query.data ?? null;
}
