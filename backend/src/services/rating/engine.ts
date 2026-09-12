/**
 * ============================================================================
 * SERVICES/RATING/ENGINE.TS — ENGINE CHẤM ĐIỂM CẦU THỦ (thang 0–10)
 * ============================================================================
 *
 * Đặc tả gốc: ARCHITECTURE.md mục 12.2
 *
 * 🎯 ENGINE NÀY LÀM GÌ?
 * Quy đổi sự kiện thật của trận đấu (bàn thắng, kiến tạo, thẻ phạt, cứu thua…)
 * thành điểm số cho từng cầu thủ, theo từng vị trí thi đấu.
 *
 * ----------------------------------------------------------------------------
 * ⭐ ĐIỂM KHÁC BIỆT LỚN NHẤT: GIẢI THÍCH ĐƯỢC TỪNG ĐIỂM
 *
 * FotMob và SofaScore cho ra một con số "8.3" và người dùng phải tin. App này
 * trả về kèm BẢNG PHÂN TÍCH:
 *
 *     Điểm khởi đầu                6.0
 *     2 bàn thắng    × +1.0       +2.0
 *     1 đường chuyền quyết định   +0.2
 *     3 cú sút trúng đích × +0.1  +0.3
 *     Đội thắng                   +0.3
 *     Thẻ vàng                    −0.5
 *     ─────────────────────────────────
 *     TỔNG                         8.3
 *
 * Người dùng chạm "Vì sao 8.3?" là thấy đúng bảng này. Đó là thứ hai app kia
 * không làm được, và là lý do bộ quy tắc phải nằm trong DATABASE (bảng
 * `rating_rulesets`) chứ không ghi cứng trong code — sửa hệ số không cần deploy.
 *
 * ----------------------------------------------------------------------------
 * 🧪 VÌ SAO ĐÂY LÀ "HÀM THUẦN" (pure function)?
 *
 * `rate()` KHÔNG gọi database, KHÔNG gọi mạng, KHÔNG đọc giờ hệ thống.
 * Đưa vào cùng dữ liệu thì LUÔN cho ra cùng kết quả. Ba lợi ích:
 *
 *   1. Test được mà không cần dựng database — chỉ truyền object vào rồi so kết quả
 *   2. Chấm lại 40 cầu thủ của một trận bao nhiêu lần cũng ra y hệt
 *   3. Sửa dữ liệu (VAR huỷ bàn) -> chấm lại TOÀN BỘ, không cộng dồn,
 *      nên không bao giờ có chuyện điểm bị lệch do tính hai lần
 *
 * ----------------------------------------------------------------------------
 * ⚠️ MỘT NGUYÊN TẮC QUAN TRỌNG VỀ DỮ LIỆU THIẾU
 *
 * Nhà cung cấp dữ liệu miễn phí thường KHÔNG có các chỉ số chi tiết (đường
 * chuyền quyết định, số pha tắc bóng...). Engine xử lý bằng cách coi chúng
 * bằng 0 — vẫn chạy đúng với các sự kiện chính (bàn thắng, kiến tạo, thẻ,
 * cứu thua, bàn thua) vốn gần như luôn có.
 *
 * 👉 Engine KHÔNG BAO GIỜ được ném lỗi vì thiếu một chỉ số. Thiếu thì bỏ qua
 *    dòng đó, không phải là lý do để cả trận không chấm được điểm.
 * ============================================================================
 */

import type { PlayerPosition } from '@/types';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

/**
 * Bộ quy tắc quy đổi, đọc từ bảng `rating_rulesets`.
 *
 * 📐 CÁCH ĐỌC MẢNG 4 PHẦN TỬ: mỗi mảng ứng với 4 vị trí THEO ĐÚNG THỨ TỰ
 * khai trong `positions`:
 *
 *     goal: [1.5, 1.3, 1.1, 1.0]
 *            GK   DF   MF   FW
 *
 * Thủ môn ghi bàn được +1.5 (hiếm nên đáng giá), tiền đạo +1.0 (đó là việc
 * của họ). Đây chính là cách engine "hiểu" vị trí mà không cần if/else.
 */
export interface RatingRuleset {
  version: string;
  rules: {
    /** Điểm khởi đầu cho cầu thủ đá đủ số phút tối thiểu */
    base: number;
    /** [min, max] — điểm cuối cùng luôn bị kẹp vào khoảng này */
    clamp: [number, number];
    /** Đá dưới số phút này thì KHÔNG chấm, app hiện "–" */
    min_minutes: number;
    /** Thứ tự vị trí, quyết định chỉ số nào trong mảng hệ số được dùng */
    positions: PlayerPosition[];
    /** Bảng hệ số: tên sự kiện -> mảng 4 hệ số theo vị trí */
    per_event: Record<string, number[]>;
  };
}

/** Số liệu của một cầu thủ trong một trận (bảng player_match_stats) */
export interface PlayerMatchStats {
  minutes_played: number;
  goals: number;
  assists: number;
  /** Đường chuyền quyết định — có thể thiếu ở nhà cung cấp miễn phí */
  key_passes?: number | null;
  shots_on_target?: number | null;
  tackles?: number | null;
  interceptions?: number | null;
  /** Thủ môn */
  saves?: number | null;
  goals_conceded?: number | null;
  penalties_saved?: number | null;
  yellow_cards?: number | null;
  red_cards?: number | null;
  own_goals?: number | null;
  missed_penalties?: number | null;
}

/** Bối cảnh trận đấu — ảnh hưởng tới điểm thắng/thua và giữ sạch lưới */
export interface MatchContext {
  /** Đội của cầu thủ này ghi bao nhiêu bàn */
  team_goals: number;
  /** Đội đối phương ghi bao nhiêu bàn */
  opponent_goals: number;
  /** Trận đã kết thúc chưa — chỉ trận xong mới cộng điểm thắng/thua */
  is_finished: boolean;
}

/** Một dòng trong bảng giải thích điểm */
export interface RatingBreakdownItem {
  /** Mã sự kiện, ví dụ 'goal' — để app dịch sang ngôn ngữ khác nếu cần */
  code: string;
  /** Nhãn tiếng Việt hiển thị cho người dùng */
  label: string;
  /** Số lần xảy ra. 1 với các mục không đếm được (điểm khởi đầu, thắng/thua) */
  count: number;
  /** Hệ số cho MỘT lần */
  unit: number;
  /** count × unit, đã làm tròn */
  points: number;
}

export interface RatingResult {
  /** Điểm cuối cùng 3.0–10.0, một chữ số thập phân. null = không đủ điều kiện chấm */
  rating: number | null;
  breakdown: RatingBreakdownItem[];
  /** Lý do không chấm được, để app hiển thị thay vì hiện "–" trơ trọi */
  skip_reason?: string;
}

// ---------------------------------------------------------------------------
// NHÃN TIẾNG VIỆT
// ---------------------------------------------------------------------------

/**
 * Mã sự kiện -> nhãn hiển thị.
 *
 * Tách riêng khỏi bộ quy tắc (vốn nằm trong database) vì đây là chuyện NGÔN
 * NGỮ, không phải chuyện quy tắc tính điểm. Thêm tiếng Anh sau này chỉ cần
 * thêm một bảng tra nữa, không đụng tới hệ số.
 */
const EVENT_LABELS: Record<string, string> = {
  base: 'Điểm khởi đầu',
  goal: 'Bàn thắng',
  assist: 'Kiến tạo',
  key_pass: 'Đường chuyền quyết định',
  shot_on_target: 'Dứt điểm trúng đích',
  tackle_interception: 'Tắc bóng / cắt bóng',
  save: 'Cứu thua',
  penalty_saved: 'Cản phạt đền',
  clean_sheet_60min: 'Giữ sạch lưới',
  goal_conceded: 'Bàn thua khi đang trên sân',
  yellow_card: 'Thẻ vàng',
  red_card: 'Thẻ đỏ',
  own_goal: 'Phản lưới nhà',
  missed_penalty: 'Đá hỏng phạt đền',
  team_win: 'Đội thắng',
  team_lose: 'Đội thua',
};

// ---------------------------------------------------------------------------
// HÀM PHỤ
// ---------------------------------------------------------------------------

/**
 * Làm tròn tới 1 chữ số thập phân.
 *
 * ⚠️ VÌ SAO PHẢI LÀM TRÒN Ở TỪNG BƯỚC, KHÔNG CHỈ Ở CUỐI?
 * Vì số thực trong máy tính không chính xác tuyệt đối: 0.1 + 0.2 ra
 * 0.30000000000000004. Cộng dồn 10 dòng như vậy thì bảng giải thích sẽ hiện
 * "+0.30000000000000004" — trông như lỗi.
 *
 * Làm tròn từng dòng còn bảo đảm TỔNG CÁC DÒNG ĐÚNG BẰNG điểm cuối cùng.
 * Không có điều đó thì người dùng cộng tay lại sẽ ra số khác, và mất niềm tin
 * vào toàn bộ bảng giải thích.
 */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Lấy hệ số của một sự kiện theo vị trí cầu thủ.
 *
 * Trả 0 khi:
 *   • Bộ quy tắc không khai sự kiện đó (ruleset cũ, sự kiện mới)
 *   • Vị trí không nằm trong danh sách (dữ liệu hỏng)
 *
 * 👉 Trả 0 thay vì ném lỗi: một hệ số thiếu không đáng để cả trận không chấm
 *    được điểm. Xem nguyên tắc "dữ liệu thiếu" ở đầu file.
 */
function coefficient(ruleset: RatingRuleset, code: string, position: PlayerPosition): number {
  const row = ruleset.rules.per_event[code];
  if (!row) return 0;

  const index = ruleset.rules.positions.indexOf(position);
  if (index < 0) return 0;

  return row[index] ?? 0;
}

// ---------------------------------------------------------------------------
// HÀM CHÍNH
// ---------------------------------------------------------------------------

/**
 * ⭐ CHẤM ĐIỂM MỘT CẦU THỦ.
 *
 * @param stats    Số liệu trong trận (phút, bàn, kiến tạo, thẻ…)
 * @param position Vị trí thi đấu — quyết định dùng cột hệ số nào
 * @param context  Bối cảnh trận (tỷ số, đã kết thúc chưa)
 * @param ruleset  Bộ quy tắc đọc từ database
 *
 * @returns Điểm + bảng giải thích. `rating = null` nghĩa là không đủ điều kiện.
 *
 * Ví dụ (theo đúng ARCHITECTURE.md mục 12.2):
 *   Tiến Linh, Tiền đạo, đá 67 phút, VN thắng 2–1, ghi 2 bàn, 1 đường chuyền
 *   quyết định, 3 cú sút trúng đích, 1 thẻ vàng
 *   -> 6.0 + 2.0 + 0.2 + 0.3 + 0.3 − 0.5 = 8.3
 */
export function rate(
  stats: PlayerMatchStats,
  position: PlayerPosition,
  context: MatchContext,
  ruleset: RatingRuleset
): RatingResult {
  const { base, clamp, min_minutes } = ruleset.rules;

  // -------------------------------------------------------------------------
  // CỬA 1: đá đủ số phút tối thiểu chưa?
  // -------------------------------------------------------------------------
  /**
   * Vào sân phút 89 rồi chạm bóng hai lần thì không có cơ sở nào để chấm điểm.
   * Chấm bừa sẽ làm hỏng cả bảng xếp hạng cầu thủ: một người vào sân 2 phút
   * ghi 1 bàn sẽ có điểm cao hơn người đá trọn 90 phút xuất sắc.
   */
  if (stats.minutes_played < min_minutes) {
    return {
      rating: null,
      breakdown: [],
      skip_reason: `Chỉ thi đấu ${stats.minutes_played} phút (tối thiểu ${min_minutes} phút)`,
    };
  }

  const breakdown: RatingBreakdownItem[] = [];

  /**
   * Thêm một dòng vào bảng giải thích.
   *
   * Bỏ qua khi count = 0 hoặc hệ số = 0 — bảng giải thích chỉ nên hiện những
   * dòng THẬT SỰ ảnh hưởng tới điểm. Hiện cả "0 bàn thắng: +0.0" chỉ làm
   * người đọc phải lọc bằng mắt.
   */
  const add = (code: string, count: number) => {
    if (count <= 0) return;
    const unit = coefficient(ruleset, code, position);
    if (unit === 0) return;

    breakdown.push({
      code,
      label: EVENT_LABELS[code] ?? code,
      count,
      unit,
      points: round1(count * unit),
    });
  };

  // -------------------------------------------------------------------------
  // ĐIỂM KHỞI ĐẦU
  // -------------------------------------------------------------------------
  breakdown.push({
    code: 'base',
    label: EVENT_LABELS.base!,
    count: 1,
    unit: base,
    points: base,
  });

  // -------------------------------------------------------------------------
  // ĐIỂM CỘNG TỪ ĐÓNG GÓP TẤN CÔNG
  // -------------------------------------------------------------------------
  add('goal', stats.goals);
  add('assist', stats.assists);
  add('key_pass', stats.key_passes ?? 0);
  add('shot_on_target', stats.shots_on_target ?? 0);

  /**
   * Tắc bóng và cắt bóng gộp làm MỘT dòng.
   *
   * Về mặt bóng đá đây là hai hành động khác nhau, nhưng cùng một ý nghĩa:
   * "phá vỡ đợt tấn công của đối phương". Gộp lại cho bảng giải thích gọn và
   * dễ đọc hơn — bảng 15 dòng thì chẳng ai đọc hết.
   */
  add('tackle_interception', (stats.tackles ?? 0) + (stats.interceptions ?? 0));

  // -------------------------------------------------------------------------
  // ĐIỂM RIÊNG CỦA THỦ MÔN
  // -------------------------------------------------------------------------
  add('save', stats.saves ?? 0);
  add('penalty_saved', stats.penalties_saved ?? 0);

  // -------------------------------------------------------------------------
  // GIỮ SẠCH LƯỚI
  // -------------------------------------------------------------------------
  /**
   * Điều kiện KÉP: đội không thủng lưới VÀ cầu thủ đá ít nhất 60 phút.
   *
   * Vì sao phải có điều kiện 60 phút? Vì vào sân phút 85 khi đội đang dẫn 3-0
   * thì không đóng góp gì vào việc giữ sạch lưới. Không có điều kiện này,
   * mọi cầu thủ dự bị vào sân cuối trận đều được cộng không công.
   *
   * Chỉ tính khi trận ĐÃ KẾT THÚC — trận đang đá mà cộng "giữ sạch lưới" thì
   * phút sau thủng lưới lại phải trừ đi, điểm nhảy loạn.
   */
  const cleanSheet = context.is_finished && context.opponent_goals === 0;
  if (cleanSheet && stats.minutes_played >= 60) {
    add('clean_sheet_60min', 1);
  }

  // -------------------------------------------------------------------------
  // ĐIỂM TRỪ
  // -------------------------------------------------------------------------
  add('goal_conceded', stats.goals_conceded ?? 0);
  add('yellow_card', stats.yellow_cards ?? 0);
  add('own_goal', stats.own_goals ?? 0);
  add('missed_penalty', stats.missed_penalties ?? 0);

  /**
   * ⚠️ THẺ ĐỎ CHỈ TRỪ MỘT LẦN, DÙ DO HAI THẺ VÀNG.
   *
   * Nhà cung cấp dữ liệu thường ghi thẻ đỏ gián tiếp thành: 2 thẻ vàng + 1 thẻ đỏ.
   * Cộng máy móc thì thành −0.5 × 2 − 1.5 = −2.5, trong khi đặc tả nói tổng
   * trừ tối đa là −1.5.
   *
   * Dùng Math.min(1, ...) để dù dữ liệu ghi mấy thẻ đỏ cũng chỉ trừ một lần.
   */
  add('red_card', Math.min(1, stats.red_cards ?? 0));

  // -------------------------------------------------------------------------
  // THẮNG / THUA
  // -------------------------------------------------------------------------
  /**
   * Chỉ cộng khi trận đã kết thúc. Đang đá mà cộng "đội thắng" thì bàn gỡ của
   * đối phương ở phút 90 sẽ làm điểm của cả đội tụt đột ngột — người dùng
   * đang xem sẽ thấy con số nhảy lung tung mà không hiểu vì sao.
   *
   * Hoà thì không cộng cũng không trừ: bảng hệ số chỉ có team_win và team_lose.
   */
  if (context.is_finished) {
    if (context.team_goals > context.opponent_goals) add('team_win', 1);
    else if (context.team_goals < context.opponent_goals) add('team_lose', 1);
  }

  // -------------------------------------------------------------------------
  // CỘNG TỔNG & KẸP VÀO KHOẢNG CHO PHÉP
  // -------------------------------------------------------------------------
  const total = breakdown.reduce((sum, item) => sum + item.points, 0);

  /**
   * Kẹp vào [3.0, 10.0].
   *
   * 📐 VÌ SAO SÀN LÀ 3.0 CHỨ KHÔNG PHẢI 0?
   * Vì một cầu thủ ra sân đá 90 phút, dù tệ tới đâu, cũng đã đóng góp nhiều
   * hơn "0". Điểm 0 chỉ hợp lý nếu người đó không thi đấu. Sàn 3.0 giữ thang
   * điểm có ý nghĩa và tránh những con số gây phản cảm.
   *
   * Trần 10.0 vì đó là thang chuẩn mà người hâm mộ bóng đá đã quen.
   */
  const [min, max] = clamp;
  const rating = round1(Math.max(min, Math.min(max, total)));

  return { rating, breakdown };
}

/**
 * ⭐ CHỌN CẦU THỦ XUẤT SẮC NHẤT TRẬN (MOTM).
 *
 * Quy tắc phá hoà, theo đúng ARCHITECTURE.md mục 12.2:
 *   1. Điểm cao nhất
 *   2. Bằng điểm -> ưu tiên cầu thủ ĐỘI THẮNG
 *   3. Vẫn bằng -> ưu tiên người đá NHIỀU PHÚT hơn
 *
 * ⚠️ Vì sao phải có quy tắc phá hoà rõ ràng? Vì `sort()` của JavaScript KHÔNG
 * bảo đảm thứ tự giữa hai phần tử "bằng nhau" giống nhau qua các lần chạy.
 * Không có quy tắc, MOTM có thể đổi người mỗi lần chấm lại — dù dữ liệu y hệt.
 *
 * @returns player_id của MOTM, hoặc null nếu không ai đủ điều kiện chấm
 */
export function pickManOfTheMatch(
  candidates: Array<{
    player_id: number;
    rating: number | null;
    minutes_played: number;
    /** Cầu thủ này thuộc đội thắng? */
    is_winner: boolean;
  }>
): number | null {
  const rated = candidates.filter(
    (c): c is typeof c & { rating: number } => c.rating !== null
  );
  if (rated.length === 0) return null;

  rated.sort((a, b) => {
    if (b.rating !== a.rating) return b.rating - a.rating;
    if (a.is_winner !== b.is_winner) return a.is_winner ? -1 : 1;
    return b.minutes_played - a.minutes_played;
  });

  return rated[0]!.player_id;
}
