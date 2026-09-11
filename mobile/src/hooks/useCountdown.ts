/**
 * ============================================================================
 * HOOKS/USECOUNTDOWN.TS — ĐẾM NGƯỢC TỚI GIỜ BÓNG LĂN
 * ============================================================================
 *
 * Hiển thị: "02 ngày 14 giờ 23 phút" và tự nhảy mỗi giây.
 *
 * BA ĐIỀU CẦN CHÚ Ý KHI LÀM ĐỒNG HỒ ĐẾM NGƯỢC:
 *
 * 1. PHẢI DỌN BỘ ĐẾM khi rời màn hình, nếu không nó chạy mãi trong nền
 *    -> hao pin và React cảnh báo cập nhật component đã bị gỡ.
 *
 * 2. KHÔNG CỘNG DỒN thủ công (kiểu seconds = seconds - 1). Cách đó sẽ lệch
 *    dần vì setInterval không bao giờ chính xác tuyệt đối. Thay vào đó, mỗi
 *    lần tick ta TÍNH LẠI từ mốc thời gian đích -> luôn đúng.
 *
 * 3. DỪNG KHI VỀ 0, không để đếm sang số âm.
 */

import { useEffect, useState } from 'react';

export interface Countdown {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  /** true khi đã tới hoặc qua giờ đích */
  isPast: boolean;
  /** Chuỗi hiển thị sẵn: "2 ngày 14 giờ" hoặc "23:45:10" */
  text: string;
}

export function useCountdown(targetIso: string | null | undefined): Countdown {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (!targetIso) return;

    const target = new Date(targetIso).getTime();

    // Đã qua giờ rồi thì khỏi chạy bộ đếm cho tốn tài nguyên
    if (target <= Date.now()) return;

    const timer = setInterval(() => setNow(Date.now()), 1000);

    // ⭐ DỌN DẸP: chạy khi component bị gỡ hoặc targetIso đổi
    return () => clearInterval(timer);
  }, [targetIso]);

  if (!targetIso) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, text: '' };
  }

  // Tính lại từ đầu mỗi lần render -> không bao giờ bị lệch
  const diff = new Date(targetIso).getTime() - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isPast: true, text: 'Đã bắt đầu' };
  }

  const totalSeconds = Math.floor(diff / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  /**
   * Cách hiển thị đổi theo độ dài thời gian còn lại — đây là chi tiết nhỏ
   * nhưng làm giao diện "thông minh" hẳn lên:
   *   Còn nhiều ngày -> "3 ngày 5 giờ"     (giây không còn ý nghĩa)
   *   Còn dưới 1 ngày -> "05:23:41"         (bắt đầu hồi hộp, cần đếm giây)
   */
  const pad = (n: number) => String(n).padStart(2, '0');

  const text =
    days > 0
      ? `${days} ngày ${hours} giờ`
      : `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;

  return { days, hours, minutes, seconds, isPast: false, text };
}
