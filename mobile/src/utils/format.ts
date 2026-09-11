/**
 * ============================================================================
 * UTILS/FORMAT.TS — ĐỊNH DẠNG HIỂN THỊ
 * ============================================================================
 *
 * Gom mọi việc "biến dữ liệu thô thành chữ đẹp" vào một chỗ.
 * Nếu để rải rác, mỗi màn hình sẽ hiển thị ngày tháng một kiểu khác nhau.
 */

/**
 * ⚠️ MÚI GIỜ — nguồn gốc của vô số lỗi khó tìm
 *
 * Backend lưu và trả về giờ UTC: "2026-10-08T12:30:00Z"
 * Người Việt cần thấy: "19:30 08/10/2026" (UTC+7)
 *
 * Ta luôn ép hiển thị theo Asia/Ho_Chi_Minh thay vì để mặc định theo máy.
 * Lý do: người dùng đang ở Nhật vẫn muốn biết giờ Việt Nam của trận đấu.
 */
const TZ = 'Asia/Ho_Chi_Minh';
const LOCALE = 'vi-VN';

/** "19:30" */
export function formatTime(iso: string | Date): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

/** "08/10/2026" */
export function formatDate(iso: string | Date): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    timeZone: TZ, day: '2-digit', month: '2-digit', year: 'numeric',
  });
}

/** "Thứ 5, 08/10" — dùng cho danh sách lịch thi đấu */
export function formatDateShort(iso: string | Date): string {
  const d = new Date(iso);
  const weekday = d.toLocaleDateString(LOCALE, { timeZone: TZ, weekday: 'long' });
  const dayMonth = d.toLocaleDateString(LOCALE, { timeZone: TZ, day: '2-digit', month: '2-digit' });
  // "thứ năm" -> "Thứ năm"
  return weekday.charAt(0).toUpperCase() + weekday.slice(1) + ', ' + dayMonth;
}

/** "19:30 · 08/10/2026" */
export function formatDateTime(iso: string | Date): string {
  return formatTime(iso) + ' · ' + formatDate(iso);
}

/**
 * Khoảng cách thời gian dễ đọc: "còn 3 ngày", "2 giờ trước".
 * Dùng cho thẻ trận đấu để người dùng nắm ngay mà không phải tính nhẩm.
 */
export function formatRelative(iso: string | Date): string {
  const diffMs = new Date(iso).getTime() - Date.now();
  const absMin = Math.abs(diffMs) / 60000;
  const future = diffMs > 0;

  if (absMin < 1) return 'ngay bây giờ';
  if (absMin < 60) {
    const m = Math.round(absMin);
    return future ? `còn ${m} phút` : `${m} phút trước`;
  }
  if (absMin < 1440) {
    const h = Math.round(absMin / 60);
    return future ? `còn ${h} giờ` : `${h} giờ trước`;
  }

  const days = Math.round(absMin / 1440);
  if (days < 30) return future ? `còn ${days} ngày` : `${days} ngày trước`;

  const months = Math.round(days / 30);
  return future ? `còn ${months} tháng` : `${months} tháng trước`;
}

/**
 * GIÁ TRỊ CHUYỂN NHƯỢNG — rút gọn cho dễ đọc.
 *   700000  -> "700 N €"   (nghìn)
 *   9350000 -> "9,35 Tr €" (triệu)
 *
 * Vì sao rút gọn? Trên màn hình điện thoại, "9.350.000 €" chiếm quá nhiều chỗ
 * và mắt phải đếm số 0 mới hiểu.
 */
export function formatEuro(value: number | string): string {
  const n = typeof value === 'string' ? Number(value) : value;
  if (!Number.isFinite(n) || n <= 0) return '—';

  if (n >= 1_000_000) {
    const millions = n / 1_000_000;
    // Dưới 10 triệu thì hiện 2 số lẻ cho chính xác, trên thì làm tròn
    return millions.toFixed(millions < 10 ? 2 : 1).replace('.', ',') + ' Tr €';
  }
  if (n >= 1000) return Math.round(n / 1000) + ' N €';
  return n + ' €';
}

/** Số đầy đủ có dấu phân cách: 9350000 -> "9.350.000" */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat(LOCALE).format(value);
}

/** Nhãn tiếng Việt cho vị trí thi đấu */
export const POSITION_LABEL: Record<string, string> = {
  GK: 'Thủ môn',
  DF: 'Hậu vệ',
  MF: 'Tiền vệ',
  FW: 'Tiền đạo',
};

/** Nhãn ngắn hiển thị trên sơ đồ sân */
export const POSITION_SHORT: Record<string, string> = {
  GK: 'TM', DF: 'HV', MF: 'TV', FW: 'TĐ',
};

/** Nhãn trạng thái trận đấu */
export const STATUS_LABEL: Record<string, string> = {
  scheduled: 'Sắp diễn ra',
  live: 'ĐANG ĐÁ',
  finished: 'Đã kết thúc',
  postponed: 'Hoãn',
  cancelled: 'Huỷ',
};

/**
 * Tên hiển thị gọn của cầu thủ.
 * "Nguyễn Quang Hải" -> "Quang Hải" (lấy 2 từ cuối, đúng thói quen gọi tên VN)
 */
export function shortenName(fullName: string, shortName?: string | null): string {
  if (shortName) return shortName;

  const parts = fullName.trim().split(/\s+/);
  return parts.length <= 2 ? fullName : parts.slice(-2).join(' ');
}

/** Ký hiệu kết quả: 'W' -> { label: 'T', ... } — LUÔN kèm chữ, không chỉ màu */
export function resultLabel(result: 'W' | 'D' | 'L' | string) {
  switch (result) {
    case 'W': return { label: 'T', full: 'Thắng' };
    case 'D': return { label: 'H', full: 'Hoà' };
    case 'L': return { label: 'B', full: 'Bại' };
    default: return { label: '?', full: 'Chưa rõ' };
  }
}

/**
 * Xác định kết quả của một trận theo góc nhìn Việt Nam.
 * Trả về 'W' | 'D' | 'L' để hiển thị badge màu + chữ.
 */
export function getMatchResult(
  match: { home_team: { fifa_code: string | null }; home_score: number; away_score: number },
  ourCode = 'VIE'
): 'W' | 'D' | 'L' {
  const weAreHome = match.home_team.fifa_code === ourCode;
  const ourScore = weAreHome ? match.home_score : match.away_score;
  const theirScore = weAreHome ? match.away_score : match.home_score;

  if (ourScore > theirScore) return 'W';
  if (ourScore === theirScore) return 'D';
  return 'L';
}
