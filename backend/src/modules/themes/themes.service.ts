/**
 * ============================================================================
 * MODULES/THEMES/THEMES.SERVICE.TS — GIAO DIỆN THEO SỰ KIỆN
 * ============================================================================
 *
 * ARCHITECTURE.md mục 6. Ba việc:
 *
 *   1. resolveActive()        — HÔM NAY app nên khoác theme nào? (mục 6.3)
 *   2. scheduleResultTheme()  — Việt Nam vừa thắng/thua -> tự bật "Đi bão" /
 *                               "Tiếp lửa" trong 24 / 12 giờ
 *   3. validatePalette()      — admin tạo theme mới -> chặn nếu chữ không đọc
 *                               được (kiểm tra độ tương phản, mục 6.5)
 *
 * ----------------------------------------------------------------------------
 * 🎨 BỐN LỚP CHỒNG LÊN NHAU (mục 6.1)
 *
 *   Lớp 4  Senior mode        → cỡ chữ, khoảng cách      (app tự lo, không ở đây)
 *   Lớp 3  Theme phản ứng     → Đi bão / Tiếp lửa        priority 80–100
 *   Lớp 2  Theme sự kiện      → Tết, 30/4, 2/9…           priority 50
 *   Lớp 1  Bảng màu gốc       → colors.ts của app         priority 0
 *
 * Lớp trên đè lớp dưới — nhưng CHỈ đè những token trong DANH SÁCH TRẮNG
 * (THEMABLE_KEYS). Đây là cơ chế an toàn quan trọng nhất của cả hệ thống theme:
 * dù admin nhập màu kiểu gì, màu CHỮ, NỀN, và màu THẮNG/HOÀ/THUA không bao giờ
 * bị đổi — nên app không bao giờ rơi vào cảnh chữ đỏ trên nền đỏ.
 * ============================================================================
 */

import { query, queryOne } from '@/config/database';
import { cached, cacheDel } from '@/utils/cache';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/AppError';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

export type ThemeKind = 'default' | 'event' | 'result_win' | 'result_lose';

/** Lựa chọn của người dùng ở màn Cài đặt → Giao diện theo sự kiện */
export type ThemeMode = 'auto' | 'fixed' | 'off';

export interface Theme {
  id: number;
  code: string;
  name: string;
  kind: ThemeKind;
  palette_light: Record<string, string>;
  palette_dark: Record<string, string>;
  assets: { effect?: string | null; greeting?: string | null; [k: string]: unknown };
  preview_url: string | null;
  is_selectable: boolean;
}

export interface ActiveTheme {
  theme: Theme;
  /** Vì sao theme này được chọn — app hiện ở màn Cài đặt: "Đang theo sự kiện: Tết" */
  reason: 'user_fixed' | 'user_off' | 'schedule' | 'default';
  /** Thời điểm lịch hiện tại hết hạn (null nếu không theo lịch) — app hẹn giờ tải lại */
  ends_at: string | null;
}

// ---------------------------------------------------------------------------
// DANH SÁCH TRẮNG TOKEN
// ---------------------------------------------------------------------------

/**
 * ⭐ NHỮNG TOKEN MÀU MỘT THEME ĐƯỢC PHÉP GHI ĐÈ — mục 6.1.
 *
 *   Được ghi đè          Không bao giờ ghi đè
 *   ───────────────      ─────────────────────────────────────────
 *   accent, accentText   bg, surface*, text*, border*
 *   accentSoft, accentFg win / draw / lose   (ý nghĩa kết quả)
 *   gold, goldSoft       rating*, card*      (thẻ vàng phải VÀNG)
 *   pitch, pitchStripe
 *
 * App (src/theme/themes.ts) cũng lọc theo đúng danh sách này. Lọc ở CẢ HAI
 * đầu là phòng thủ nhiều lớp: dữ liệu cũ trong DB lỡ chứa khoá lạ, hay một
 * bản app cũ nhận theme mới — không đầu nào tin đầu kia tuyệt đối.
 */
export const THEMABLE_KEYS = [
  'accent', 'accentText', 'accentSoft', 'accentFg',
  'gold', 'goldSoft', 'pitch', 'pitchStripe',
] as const;

/** Chỉ giữ các khoá trong danh sách trắng + giá trị là mã HEX hợp lệ */
export function pickThemable(palette: Record<string, unknown>): Record<string, string> {
  const out: Record<string, string> = {};
  for (const key of THEMABLE_KEYS) {
    const value = palette[key];
    if (typeof value === 'string' && /^#[0-9A-Fa-f]{6}$/.test(value)) out[key] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// ĐỘ TƯƠNG PHẢN (WCAG 2.1) — hàm thuần, test không cần DB
// ---------------------------------------------------------------------------

/**
 * Độ sáng tương đối của một màu, theo công thức WCAG.
 *
 * ⚠️ Không phải trung bình cộng R, G, B! Mắt người nhạy với XANH LÁ hơn đỏ
 * gấp ~3 lần và hơn xanh dương gấp ~10 lần — nên có ba hệ số 0.2126 / 0.7152
 * / 0.0722. Và mỗi kênh phải "gỡ gamma" trước (bước if <= 0.03928), vì giá trị
 * 0–255 trong mã HEX KHÔNG tỷ lệ tuyến tính với lượng ánh sáng thật.
 */
export function relativeLuminance(hex: string): number {
  const n = parseInt(hex.replace('#', ''), 16);
  const channels = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  const [r, g, b] = channels as [number, number, number];
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Tỷ lệ tương phản giữa hai màu: từ 1 (giống hệt) tới 21 (đen trên trắng).
 *
 * +0.05 ở cả tử và mẫu là để tránh chia cho 0 với màu đen tuyệt đối, đồng thời
 * mô phỏng ánh sáng môi trường phản chiếu trên màn hình.
 */
export function contrastRatio(foreground: string, background: string): number {
  const a = relativeLuminance(foreground);
  const b = relativeLuminance(background);
  const [light, dark] = a > b ? [a, b] : [b, a];
  return (light + 0.05) / (dark + 0.05);
}

/**
 * Màu NỀN gốc của app, dùng để kiểm tra tương phản theme.
 *
 * ⚠️ Phải khớp với `bg` trong mobile/src/theme/colors.ts. Theme không được
 * đổi nền (không nằm trong THEMABLE_KEYS), nên kiểm tra với nền gốc là đủ.
 */
const BASE_BG = { light: '#EDF5EE', dark: '#0A1A12' } as const;

/** Tối thiểu 4.5:1 — chuẩn WCAG AA cho chữ thường */
const MIN_CONTRAST = 4.5;

export interface ContrastIssue {
  mode: 'light' | 'dark';
  pair: string;
  ratio: number;
}

/**
 * Kiểm tra một palette theme có đủ tương phản không (mục 6.5).
 *
 * Hai cặp bắt buộc cho MỖI chế độ sáng/tối:
 *   • accentText trên nền bg      — chữ nhấn (link, số liệu nổi bật) đọc được
 *   • chữ trắng trên nền accent   — chữ trên nút bấm màu nhấn đọc được
 *     (dùng accentFg nếu theme khai, không thì mặc định trắng)
 *
 * Trả về danh sách lỗi (rỗng = đạt). Trả kèm tỷ lệ ĐO ĐƯỢC để admin biết cần
 * chỉnh đậm hơn bao nhiêu, thay vì chỉ một câu "không đạt" khó hiểu.
 */
export function validatePalette(
  paletteLight: Record<string, string>,
  paletteDark: Record<string, string>
): ContrastIssue[] {
  const issues: ContrastIssue[] = [];

  for (const mode of ['light', 'dark'] as const) {
    const p = mode === 'light' ? paletteLight : paletteDark;
    const bg = BASE_BG[mode];

    if (p.accentText) {
      const ratio = contrastRatio(p.accentText, bg);
      if (ratio < MIN_CONTRAST) issues.push({ mode, pair: 'accentText / bg', ratio: round2(ratio) });
    }
    if (p.accent) {
      const ratio = contrastRatio(p.accentFg ?? '#FFFFFF', p.accent);
      if (ratio < MIN_CONTRAST) issues.push({ mode, pair: 'accentFg / accent', ratio: round2(ratio) });
    }
  }

  return issues;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

// ---------------------------------------------------------------------------
// ĐỌC THEME
// ---------------------------------------------------------------------------

const THEME_COLUMNS = `t.id, t.code, t.name, t.kind, t.palette_light, t.palette_dark,
                       t.assets, t.preview_url, t.is_selectable`;

/**
 * Chuẩn hoá theme trước khi trả ra: lọc palette theo danh sách trắng.
 * Mọi đường đọc theme đều đi qua đây — không có đường nào trả palette thô.
 */
function sanitize(theme: Theme): Theme {
  return {
    ...theme,
    palette_light: pickThemable(theme.palette_light),
    palette_dark: pickThemable(theme.palette_dark),
  };
}

/** GET /themes — các theme người dùng được chọn "cố định" */
export async function listSelectable(): Promise<Theme[]> {
  return cached('themes:selectable', 300, async () => {
    const { rows } = await query<Theme>(
      `SELECT ${THEME_COLUMNS} FROM themes t
       WHERE t.is_active AND t.is_selectable
       ORDER BY (t.kind = 'default') DESC, t.id`
    );
    return rows.map(sanitize);
  });
}

async function getDefaultTheme(): Promise<Theme> {
  const theme = await queryOne<Theme>(
    `SELECT ${THEME_COLUMNS} FROM themes t WHERE t.code = 'default'`
  );
  if (!theme) {
    // Thiếu theme 'default' = lỗi dữ liệu nghiêm trọng (seed hỏng). Báo rõ.
    throw AppError.serviceUnavailable('Chưa có theme mặc định. Hãy chạy lại seed dữ liệu.');
  }
  return sanitize(theme);
}

/**
 * Theme theo LỊCH đang hiệu lực (không xét lựa chọn người dùng).
 *
 * ⭐ CACHE TỐI ĐA 5 PHÚT — và vì sao không lâu hơn.
 *
 * Mọi người dùng ở chế độ "Tự động" đều hỏi cùng một câu -> cache chung một
 * khoá. Nhưng lịch có mốc bắt đầu/kết thúc chính xác tới từng giây (Đi bão
 * bật ngay khi trận kết thúc). Cache 24 giờ thì người hâm mộ phải chờ tới
 * ngày mai mới thấy pháo hoa. 5 phút là trần; thêm nữa, scheduleResultTheme()
 * chủ động XOÁ cache ngay khi tạo lịch mới, nên "Đi bão" thực tế bật tức thì.
 */
async function getScheduledTheme(): Promise<{ theme: Theme; ends_at: string } | null> {
  return cached('theme:active', 300, async () => {
    const row = await queryOne<Theme & { ends_at: string | Date }>(
      /**
       * Thuật toán mục 6.3: lịch đang hiệu lực, ƯU TIÊN CAO NHẤT thắng; bằng
       * ưu tiên thì lịch BẮT ĐẦU MUỘN HƠN thắng (sự kiện mới hơn, cụ thể hơn).
       *
       * Ví dụ: đang mùa ASEAN Cup (50) mà Việt Nam vô địch (100) -> "Đi bão"
       * đè lên "Mùa ASEAN Cup" trong 72 giờ, hết 72 giờ tự quay về ASEAN Cup.
       * Không cần job nào "tắt" Đi bão — lịch tự hết hạn.
       */
      `SELECT ${THEME_COLUMNS}, s.end_at AS ends_at
       FROM theme_schedules s
       JOIN themes t ON t.id = s.theme_id
       WHERE NOW() >= s.start_at AND NOW() < s.end_at AND t.is_active
       ORDER BY s.priority DESC, s.start_at DESC
       LIMIT 1`
    );
    return row
      ? { theme: sanitize(row), ends_at: new Date(row.ends_at).toISOString() }
      : null;
  });
}

/**
 * ⭐ HÔM NAY APP NÊN KHOÁC THEME NÀO? — mục 6.3.
 *
 * Nguồn lựa chọn của người dùng:
 *   • Đã đăng nhập -> đọc user_settings.theme_id (đồng bộ giữa các máy)
 *   • Khách        -> app gửi kèm ?mode=&code= lưu trên máy
 *
 * Quy ước lưu trong MỘT cột theme_id (đúng kế hoạch DEV 4):
 *   NULL                 = Tự động theo sự kiện   (mặc định)
 *   id của theme default = Tắt theme sự kiện
 *   id khác              = Cố định theme đó
 *
 * ⚠️ Người chọn "Cố định" KHÔNG bị Đi bão ghi đè. Tôn trọng lựa chọn rõ ràng
 * của người dùng quan trọng hơn hiệu ứng ăn mừng — có người chọn theme tối
 * giản vì lý do thị lực, và pháo hoa bất ngờ là một trải nghiệm tệ với họ.
 */
export async function resolveActive(input: {
  userId?: number;
  mode?: ThemeMode;
  code?: string;
}): Promise<ActiveTheme> {
  let mode: ThemeMode = input.mode ?? 'auto';
  let fixedCode = input.code;

  // Người đã đăng nhập: cài đặt trên server THẮNG tham số gửi từ máy
  if (input.userId !== undefined) {
    const pref = await queryOne<{ theme_id: number | null; code: string | null }>(
      `SELECT us.theme_id, t.code
       FROM user_settings us LEFT JOIN themes t ON t.id = us.theme_id
       WHERE us.user_id = $1`,
      [input.userId]
    );
    if (pref) {
      if (pref.theme_id === null) mode = 'auto';
      else if (pref.code === 'default') mode = 'off';
      else { mode = 'fixed'; fixedCode = pref.code ?? undefined; }
    }
  }

  if (mode === 'off') {
    return { theme: await getDefaultTheme(), reason: 'user_off', ends_at: null };
  }

  if (mode === 'fixed' && fixedCode) {
    const fixed = await queryOne<Theme>(
      `SELECT ${THEME_COLUMNS} FROM themes t
       WHERE t.code = $1 AND t.is_active AND t.is_selectable`,
      [fixedCode]
    );
    // Theme đã bị admin tắt -> lặng lẽ rơi về chế độ tự động, không báo lỗi
    if (fixed) return { theme: sanitize(fixed), reason: 'user_fixed', ends_at: null };
  }

  const scheduled = await getScheduledTheme();
  if (scheduled) return { theme: scheduled.theme, reason: 'schedule', ends_at: scheduled.ends_at };

  return { theme: await getDefaultTheme(), reason: 'default', ends_at: null };
}

/**
 * Lưu lựa chọn theme của người dùng đã đăng nhập (PUT /themes/preference).
 *
 * UPSERT vì user_settings có thể chưa có dòng nào cho người dùng mới.
 */
export async function savePreference(userId: number, mode: ThemeMode, code?: string) {
  let themeId: number | null = null;

  if (mode !== 'auto') {
    const targetCode = mode === 'off' ? 'default' : code;
    if (!targetCode) throw AppError.badRequest('Chọn "cố định" thì phải kèm mã theme.');

    const theme = await queryOne<{ id: number }>(
      `SELECT id FROM themes WHERE code = $1 AND is_active AND is_selectable`,
      [targetCode]
    );
    if (!theme) throw AppError.notFound('Không tìm thấy theme này hoặc theme không cho phép chọn.');
    themeId = theme.id;
  }

  await query(
    `INSERT INTO user_settings (user_id, theme_id) VALUES ($1, $2)
     ON CONFLICT (user_id) DO UPDATE SET theme_id = EXCLUDED.theme_id, updated_at = NOW()`,
    [userId, themeId]
  );

  return resolveActive({ userId });
}

// ---------------------------------------------------------------------------
// THEME PHẢN ỨNG SAU TRẬN — "ĐI BÃO" / "TIẾP LỬA"
// ---------------------------------------------------------------------------

/**
 * Tính lịch theme phản ứng cho một kết quả trận — HÀM THUẦN.
 *
 *   Thắng           -> 'victory',   24 giờ, ưu tiên 80
 *   Thắng chung kết -> 'victory',   72 giờ, ưu tiên 100  (vô địch!)
 *   Thua            -> 'keep-fire', 12 giờ, ưu tiên 80
 *   Hoà             -> không đổi theme (mục 6.2)
 *
 * Vì sao "Tiếp lửa" ngắn hơn "Đi bão"? Niềm vui thì muốn kéo dài; nỗi buồn thì
 * một lời động viên là đủ — giữ giao diện tông buồn cả ngày lại thành xát muối.
 */
export function planResultTheme(
  vietnamResult: 'win' | 'draw' | 'lose',
  isFinal: boolean,
  finishedAt: Date
): { code: 'victory' | 'keep-fire'; priority: number; startAt: Date; endAt: Date } | null {
  if (vietnamResult === 'draw') return null;

  const hours = vietnamResult === 'win' ? (isFinal ? 72 : 24) : 12;
  return {
    code: vietnamResult === 'win' ? 'victory' : 'keep-fire',
    priority: vietnamResult === 'win' && isFinal ? 100 : 80,
    startAt: finishedAt,
    endAt: new Date(finishedAt.getTime() + hours * 3600 * 1000),
  };
}

/**
 * Gọi khi trận của Việt Nam vừa chuyển sang 'finished' (từ livePoll.job.ts).
 *
 * @returns true nếu có tạo lịch mới -> nơi gọi phát socket `theme:changed`
 *
 * ⚠️ IDEMPOTENT — gọi hai lần cho cùng một trận KHÔNG tạo hai lịch.
 * Ràng buộc `uq_schedule_match UNIQUE (match_id)` trong DB + `ON CONFLICT DO
 * NOTHING`. Job polling có thể chạy lại (server khởi động lại giữa chừng, hai
 * worker cùng chạy) — code không được giả định mình chỉ chạy đúng một lần.
 */
export async function scheduleResultTheme(matchId: number): Promise<boolean> {
  const match = await queryOne<{
    home_score: number; away_score: number; round: string | null;
    vietnam_is_home: boolean; is_vietnam: boolean;
  }>(
    `SELECT m.home_score, m.away_score, m.round,
            (ht.fifa_code = 'VIE') AS vietnam_is_home,
            (ht.fifa_code = 'VIE' OR at.fifa_code = 'VIE') AS is_vietnam
     FROM matches m
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     WHERE m.id = $1 AND m.status = 'finished'`,
    [matchId]
  );

  if (!match || !match.is_vietnam) return false;

  const { home_score: h, away_score: a } = match;
  const result = h === a ? 'draw' : (match.vietnam_is_home ? h > a : a > h) ? 'win' : 'lose';
  const isFinal = /chung kết|final/i.test(match.round ?? '') && !/bán kết|semi/i.test(match.round ?? '');

  const plan = planResultTheme(result, isFinal, new Date());
  if (!plan) return false;

  const res = await query(
    `INSERT INTO theme_schedules (theme_id, start_at, end_at, priority, source, match_id)
     SELECT t.id, $2, $3, $4, 'auto_result', $1 FROM themes t WHERE t.code = $5 AND t.is_active
     ON CONFLICT (match_id) DO NOTHING`,
    [matchId, plan.startAt.toISOString(), plan.endAt.toISOString(), plan.priority, plan.code]
  );

  if (res.rowCount === 0) return false;

  // Xoá cache NGAY để người đang mở app thấy theme mới tức thì, không chờ 5 phút
  await cacheDel('theme:active');
  logger.info(`[Theme] Bật "${plan.code}" cho trận ${matchId} tới ${plan.endAt.toISOString()}`);
  return true;
}
