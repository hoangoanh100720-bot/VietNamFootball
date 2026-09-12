/**
 * ============================================================================
 * DB/SEEDS/FEATUREDATA.TS — DỮ LIỆU MẪU CHO CÁC TÍNH NĂNG v2/v3
 * ============================================================================
 *
 * Bổ sung cho data.ts (đội tuyển, cầu thủ, trận đấu). File này phủ các bảng
 * do migration 002 và 003 tạo ra, để mọi màn hình trong app đều có dữ liệu thật
 * mà hiển thị khi chạy `npm run db:reset`:
 *
 *   Tab Giới thiệu  -> TEAM_PROFILE, ACHIEVEMENTS
 *   Splash          -> ONBOARDING_SLIDES
 *   Cài đặt/Theme   -> THEMES, THEME_SCHEDULES
 *   Tab Trận đấu    -> COMPETITIONS, SEASONS, STANDINGS (BXH bảng đấu)
 *   Tab Đội hình    -> SQUADS (đợt triệu tập)
 *   Tab Thống kê    -> RATED_MATCH (thông số 2 đội + ĐIỂM từng cầu thủ)
 *   Hồ sơ cầu thủ   -> VALUE_HISTORY (biểu đồ giá trị)
 *
 * ⚠️ Đây là DỮ LIỆU MẪU để phát triển và kiểm thử giao diện, không phải nguồn
 * số liệu chính thức. Dữ liệu thật sẽ do luồng ingest (mục 11) ghi vào.
 * Tham chiếu thiết kế: ARCHITECTURE.md mục 9.2, 9.3, 9.4, 12.2.
 */

// ---------------------------------------------------------------------------
// 1. GIỚI THIỆU ĐỘI TUYỂN (Tab 1)
// ---------------------------------------------------------------------------
export const TEAM_PROFILE = {
  nickname: 'Những chiến binh Sao Vàng',
  federation: 'Liên đoàn Bóng đá Việt Nam (VFF)',
  confederations: ['AFC', 'AFF'],
  home_stadium: 'Sân vận động Quốc gia Mỹ Đình',
  intro_text:
    'Đội tuyển bóng đá quốc gia Việt Nam là đại diện của bóng đá Việt Nam trên đấu trường ' +
    'quốc tế, do Liên đoàn Bóng đá Việt Nam (VFF) quản lý. Với biệt danh "Những chiến binh ' +
    'Sao Vàng", đội tuyển là niềm tự hào của hàng chục triệu người hâm mộ, từng ba lần vô địch ' +
    'Đông Nam Á và hai lần vào tứ kết Asian Cup. Sân nhà truyền thống là Sân vận động Quốc gia ' +
    'Mỹ Đình ở Hà Nội.',
  best_fifa_rank: 94,
  best_fifa_rank_date: '2022-12-22',
};

/** result: champion | runner_up | third_place | semi_final | quarter_final | group_stage | qualified */
export const ACHIEVEMENTS = [
  { competition: 'ASEAN Cup', edition_year: 2024, result: 'champion' as const, title: 'Vô địch ASEAN Cup 2024', host: 'Đông Nam Á', is_highlight: true, description: 'Thắng Thái Lan với tổng tỷ số 5-3 sau hai lượt chung kết.' },
  { competition: 'AFF Cup', edition_year: 2018, result: 'champion' as const, title: 'Vô địch AFF Cup 2018', host: 'Đông Nam Á', is_highlight: true, description: 'Vô địch sau 10 năm chờ đợi, thắng Malaysia ở chung kết.' },
  { competition: 'AFF Cup', edition_year: 2008, result: 'champion' as const, title: 'Vô địch AFF Cup 2008', host: 'Đông Nam Á', is_highlight: true, description: 'Chức vô địch Đông Nam Á đầu tiên trong lịch sử.' },
  { competition: 'Asian Cup', edition_year: 2019, result: 'quarter_final' as const, title: 'Tứ kết Asian Cup 2019', host: 'UAE', is_highlight: true, description: 'Vào tứ kết sau loạt luân lưu với Jordan.' },
  { competition: 'Asian Cup', edition_year: 2007, result: 'quarter_final' as const, title: 'Tứ kết Asian Cup 2007', host: 'Đông Nam Á', is_highlight: true, description: 'Lần đầu vào tứ kết giải châu lục, trên sân nhà.' },
  { competition: 'AFF Cup', edition_year: 2022, result: 'runner_up' as const, title: 'Á quân AFF Cup 2022', host: 'Đông Nam Á', is_highlight: false, description: 'Thua Thái Lan ở hai lượt chung kết.' },
];

// ---------------------------------------------------------------------------
// 2. SLIDE GIỚI THIỆU SAU SPLASH (mục 4.1)
// ---------------------------------------------------------------------------
export const ONBOARDING_SLIDES = [
  { sort_order: 1, title: 'Những chiến binh Sao Vàng', body: 'Đội tuyển quốc gia Việt Nam do VFF quản lý, thi đấu tại AFC và AFF, sân nhà là Mỹ Đình.' },
  { sort_order: 2, title: 'Hành trình vinh quang', body: 'Ba lần vô địch Đông Nam Á (2008, 2018, 2024) và hai lần vào tứ kết Asian Cup (2007, 2019).' },
  { sort_order: 3, title: 'Ban huấn luyện & đội hình', body: 'Theo dõi huấn luyện viên trưởng, danh sách triệu tập và đội hình ra sân từng trận.' },
  { sort_order: 4, title: 'Sẵn sàng cổ vũ!', body: 'Bật thông báo để không bỏ lỡ bàn thắng. Cần chữ to dễ đọc? Bật "Giao diện người lớn tuổi" trong Cài đặt.' },
];

// ---------------------------------------------------------------------------
// 3. THEME THEO SỰ KIỆN (mục 6)
// ---------------------------------------------------------------------------
/**
 * palette_* chỉ chứa các token nằm trong DANH SÁCH TRẮNG (mục 6.1):
 * accent, accentText, gold... KHÔNG chứa màu chữ hay màu thắng/hoà/thua,
 * nhờ vậy theme nào thì chữ cũng vẫn đọc được.
 */
export interface SeedTheme {
  code: string;
  name: string;
  kind: 'default' | 'event' | 'result_win' | 'result_lose';
  palette_light: Record<string, string>;
  palette_dark: Record<string, string>;
  assets: Record<string, string | null>;
  is_selectable: boolean;
}

export const THEMES: SeedTheme[] = [
  {
    code: 'default', name: 'Đỏ cờ', kind: 'default', is_selectable: true,
    palette_light: { accent: '#DA251D', accentText: '#B80F17', gold: '#B88700' },
    palette_dark: { accent: '#E3241B', accentText: '#FF5A4F', gold: '#FFCD00' },
    assets: { effect: null, greeting: null },
  },
  {
    code: 'tet', name: 'Tết Nguyên Đán', kind: 'event', is_selectable: true,
    palette_light: { accent: '#C8102E', accentText: '#A50D25', gold: '#B8860B' },
    palette_dark: { accent: '#E01B34', accentText: '#FF6B78', gold: '#FFD24A' },
    assets: { effect: 'blossoms', greeting: 'Chúc mừng năm mới!' },
  },
  {
    code: 'reunification', name: 'Thống nhất 30/4', kind: 'event', is_selectable: true,
    palette_light: { accent: '#DA251D', accentText: '#B80F17', gold: '#B88700' },
    palette_dark: { accent: '#E3241B', accentText: '#FF5A4F', gold: '#FFCD00' },
    assets: { effect: null, greeting: 'Mừng ngày Thống nhất 30/4' },
  },
  {
    code: 'national-day', name: 'Quốc khánh 2/9', kind: 'event', is_selectable: true,
    palette_light: { accent: '#D0121B', accentText: '#A80E16', gold: '#C79200' },
    palette_dark: { accent: '#E8291F', accentText: '#FF6A5E', gold: '#FFD633' },
    assets: { effect: 'fireworks', greeting: 'Chúc mừng Quốc khánh 2/9' },
  },
  {
    code: 'asean-cup', name: 'Mùa ASEAN Cup', kind: 'event', is_selectable: true,
    // Chỉ dùng MÀU của giải, không dùng logo giải (vấn đề bản quyền)
    palette_light: { accent: '#C8102E', accentText: '#12355B', gold: '#B88700' },
    palette_dark: { accent: '#E01B34', accentText: '#8AB4F8', gold: '#FFCD00' },
    assets: { effect: null, greeting: 'Cùng đội tuyển chinh phục Đông Nam Á' },
  },
  {
    code: 'sea-games', name: 'Mùa SEA Games', kind: 'event', is_selectable: true,
    palette_light: { accent: '#CE1126', accentText: '#A50D1E', gold: '#C08A00' },
    palette_dark: { accent: '#E4253A', accentText: '#FF7A6B', gold: '#FFD24A' },
    assets: { effect: null, greeting: 'Hướng tới SEA Games' },
  },
  {
    // Theme PHẢN ỨNG: lịch áp dụng do job tự tạo sau trận, người dùng không chọn được
    code: 'victory', name: 'Đi bão', kind: 'result_win', is_selectable: false,
    palette_light: { accent: '#D0121B', accentText: '#B80F17', gold: '#B88700' },
    palette_dark: { accent: '#E3241B', accentText: '#FF5A4F', gold: '#FFCD00' },
    assets: { effect: 'fireworks', greeting: 'VIỆT NAM CHIẾN THẮNG!' },
  },
  {
    code: 'keep-fire', name: 'Tiếp lửa', kind: 'result_lose', is_selectable: false,
    palette_light: { accent: '#1F3A63', accentText: '#16305A', gold: '#8A7A3F' },
    palette_dark: { accent: '#2E5691', accentText: '#9CC0F5', gold: '#C9B46A' },
    assets: { effect: null, greeting: 'Luôn bên nhau, Việt Nam ơi!' },
  },
];

/**
 * Lịch áp dụng theme. priority: sự kiện 50 · kết quả trận 80 · vô địch 100.
 * Ở đây chỉ có lịch 'manual' — lịch "Đi bão/Tiếp lửa" do job tự tạo sau trận.
 */
export const THEME_SCHEDULES = [
  { code: 'asean-cup', start_at: '2026-12-01T00:00:00+07:00', end_at: '2027-01-10T23:59:59+07:00', priority: 50 },
  { code: 'tet', start_at: '2027-02-10T00:00:00+07:00', end_at: '2027-02-24T23:59:59+07:00', priority: 50 },
  { code: 'reunification', start_at: '2027-04-28T00:00:00+07:00', end_at: '2027-05-01T23:59:59+07:00', priority: 50 },
  { code: 'national-day', start_at: '2027-08-31T00:00:00+07:00', end_at: '2027-09-03T23:59:59+07:00', priority: 50 },
  { code: 'sea-games', start_at: '2027-12-01T00:00:00+07:00', end_at: '2027-12-20T23:59:59+07:00', priority: 50 },
];

// ---------------------------------------------------------------------------
// 4. GIẢI ĐẤU & BẢNG XẾP HẠNG BẢNG ĐẤU (mục 5.8)
// ---------------------------------------------------------------------------
export const COMPETITIONS = [
  { code: 'asian-cup-q', name: 'Vòng loại Asian Cup 2027', type: 'continental' as const, confederation: 'AFC' },
  { code: 'asean-cup', name: 'ASEAN Cup', type: 'regional' as const, confederation: 'AFF' },
  { code: 'wcq-afc', name: 'Vòng loại World Cup (khu vực châu Á)', type: 'world' as const, confederation: 'FIFA' },
  { code: 'friendly', name: 'Giao hữu quốc tế', type: 'friendly' as const, confederation: null },
];

/** Mùa giải đang diễn ra: vòng loại Asian Cup 2027, bảng F */
export const SEASONS = [
  { competition_code: 'asian-cup-q', name: '2027 vòng loại', start_date: '2025-03-01', end_date: '2026-12-31', is_current: true, match_competition: 'Vòng loại Asian Cup 2027' },
  { competition_code: 'asean-cup', name: '2024', start_date: '2024-12-01', end_date: '2025-01-10', is_current: false, match_competition: 'ASEAN Cup 2024' },
];

/**
 * BXH bảng F. Số liệu của Việt Nam khớp với 3 trận trong data.ts:
 * thắng Lào 5-0, thắng Malaysia 2-1, thắng Nepal 4-0 -> 3 thắng, 11-1, 9 điểm.
 */
export const STANDINGS = [
  { season_name: '2027 vòng loại', group_name: 'Bảng F', fifa_code: 'VIE', position: 1, played: 3, won: 3, drawn: 0, lost: 0, goals_for: 11, goals_against: 1, points: 9 },
  { season_name: '2027 vòng loại', group_name: 'Bảng F', fifa_code: 'MAS', position: 2, played: 3, won: 2, drawn: 0, lost: 1, goals_for: 4, goals_against: 2, points: 6 },
  { season_name: '2027 vòng loại', group_name: 'Bảng F', fifa_code: 'NEP', position: 3, played: 3, won: 1, drawn: 0, lost: 2, goals_for: 2, goals_against: 7, points: 3 },
  { season_name: '2027 vòng loại', group_name: 'Bảng F', fifa_code: 'LAO', position: 4, played: 3, won: 0, drawn: 0, lost: 3, goals_for: 1, goals_against: 8, points: 0 },
];

// ---------------------------------------------------------------------------
// 5. ĐỢT TRIỆU TẬP (mục 5.8)
// ---------------------------------------------------------------------------
/**
 * Hai đợt để thử nhãn "Mới": cầu thủ có trong đợt tháng 10 mà KHÔNG có trong
 * đợt tháng 6 (số áo 24, 25) sẽ được app gắn nhãn "Mới".
 */
export const SQUADS = [
  {
    title: 'Đợt tập trung tháng 6/2026',
    gather_from: '2026-06-01',
    gather_to: '2026-06-10',
    announced_at: '2026-05-25T03:00:00Z',
    season_name: '2027 vòng loại',
    members: [
      ...[1, 23, 26, 2, 3, 4, 5, 6, 12, 17, 20, 21].map((shirt) => ({ shirt, status: 'called' as const, note: null })),
      ...[7, 8, 10, 11, 14, 15, 16, 19].map((shirt) => ({ shirt, status: 'called' as const, note: null })),
      ...[9, 13, 18, 22].map((shirt) => ({ shirt, status: 'called' as const, note: null })),
    ],
  },
  {
    title: 'Đợt tập trung tháng 10/2026',
    gather_from: '2026-10-05',
    gather_to: '2026-10-10',
    announced_at: '2026-10-01T03:00:00Z',
    season_name: '2027 vòng loại',
    members: [
      ...[1, 23, 26, 2, 3, 4, 5, 6, 12, 17, 20].map((shirt) => ({ shirt, status: 'called' as const, note: null })),
      ...[7, 8, 10, 11, 14, 15, 16, 19].map((shirt) => ({ shirt, status: 'called' as const, note: null })),
      ...[9, 13, 18, 22].map((shirt) => ({ shirt, status: 'called' as const, note: null })),
      // Hai cầu thủ lần đầu được gọi -> app hiện nhãn "Mới"
      { shirt: 24, status: 'called' as const, note: null },
      { shirt: 25, status: 'added' as const, note: 'Bổ sung sau khi có cầu thủ rút lui' },
      // Rút lui vì chấn thương -> hiện ở mục "Rút lui"
      { shirt: 21, status: 'withdrawn' as const, note: 'Chấn thương cơ đùi' },
    ],
  },
];

// ---------------------------------------------------------------------------
// 6. BỘ QUY TẮC CHẤM ĐIỂM CẦU THỦ (mục 12.2)
// ---------------------------------------------------------------------------
/**
 * Lưu dạng JSON có phiên bản: sửa hệ số không cần deploy lại code, và luôn
 * biết điểm cũ được tính bằng bộ quy tắc nào.
 * Thứ tự vị trí trong mảng: [GK, DF, MF, FW].
 */
export const RATING_RULESET = {
  version: '2026.1',
  description:
    'Bộ quy tắc khởi điểm. Hệ số sẽ được hiệu chỉnh sau khi so với điểm của nhà cung cấp ' +
    'trên các trận đã có (ARCHITECTURE.md mục 12.2).',
  is_active: true,
  rules: {
    base: 6.0,
    clamp: [3.0, 10.0],
    min_minutes: 10,
    positions: ['GK', 'DF', 'MF', 'FW'],
    per_event: {
      goal: [1.5, 1.3, 1.1, 1.0],
      assist: [0.8, 0.8, 0.8, 0.8],
      key_pass: [0.2, 0.2, 0.2, 0.2],
      shot_on_target: [0, 0.1, 0.1, 0.1],
      tackle_interception: [0, 0.15, 0.1, 0.05],
      save: [0.3, 0, 0, 0],
      penalty_saved: [1.5, 0, 0, 0],
      clean_sheet_60min: [1.0, 0.8, 0.3, 0],
      goal_conceded: [-0.3, -0.2, 0, 0],
      yellow_card: [-0.5, -0.5, -0.5, -0.5],
      red_card: [-1.5, -1.5, -1.5, -1.5],
      own_goal: [-1.0, -1.0, -1.0, -1.0],
      missed_penalty: [-1.0, -1.0, -1.0, -1.0],
      team_win: [0.3, 0.3, 0.3, 0.3],
      team_lose: [-0.2, -0.2, -0.2, -0.2],
    },
  },
};

// ---------------------------------------------------------------------------
// 7. TRẬN ĐÃ CHỐT ĐIỂM — Việt Nam 4-0 Nepal (09/06/2026)
// ---------------------------------------------------------------------------
// Dùng để thử: Tab Thống kê, sơ đồ đội hình có điểm + thẻ trên đầu cầu thủ,
// bottom sheet "Vì sao 8.8?", biểu đồ phong độ, BXH cầu thủ.

/** Khớp với trận trong data.ts: VIE vs NEP, status finished, 4-0 */
export const RATED_MATCH = { away_fifa_code: 'NEP', home_score: 4, away_score: 0 } as const;

/** Diễn biến trận. substitution: shirt = người VÀO, out_shirt = người RA. */
export const RATED_MATCH_EVENTS = [
  { minute: 23, type: 'goal' as const, shirt: 9, assist_shirt: 7, detail: 'Dứt điểm trong vòng cấm sau đường tạt của Văn Khang' },
  { minute: 41, type: 'goal' as const, shirt: 18, assist_shirt: 14, detail: 'Đệm lòng cận thành' },
  { minute: 57, type: 'goal' as const, shirt: 9, assist_shirt: null, detail: 'Solo từ giữa sân rồi sút chéo góc' },
  { minute: 66, type: 'yellow_card' as const, shirt: 2, assist_shirt: null, detail: 'Phạm lỗi ngăn pha phản công' },
  { minute: 70, type: 'substitution' as const, shirt: 22, out_shirt: 18, assist_shirt: null, detail: 'Vào sân thay Tuấn Hải' },
  { minute: 75, type: 'substitution' as const, shirt: 15, out_shirt: 8, assist_shirt: null, detail: 'Vào sân thay Hùng Dũng' },
  { minute: 78, type: 'goal' as const, shirt: 19, assist_shirt: null, detail: 'Sút xa ngoài vòng cấm' },
  { minute: 82, type: 'substitution' as const, shirt: 13, out_shirt: 19, assist_shirt: null, detail: 'Vào sân thay Quang Hải' },
];

/** Thông số cấp đội (mỗi trận 2 dòng) — Tab Thống kê */
export const RATED_MATCH_TEAM_STATS = [
  { side: 'home' as const, possession_pct: 62, shots: 18, shots_on_target: 9, expected_goals: 2.8, corners: 7, offsides: 2, fouls: 9, yellow_cards: 1, red_cards: 0, saves: 2, passes: 521, pass_accuracy_pct: 86 },
  { side: 'away' as const, possession_pct: 38, shots: 6, shots_on_target: 2, expected_goals: 0.4, corners: 2, offsides: 1, fouls: 14, yellow_cards: 2, red_cards: 0, saves: 5, passes: 312, pass_accuracy_pct: 74 },
];

export interface SeedPlayerRating {
  shirt: number;
  minutes: number;
  /** null = đá dưới 10 phút, app hiện "–" */
  rating: number | null;
  is_motm?: boolean;
  /** Điểm của nhà cung cấp, giữ để đối chiếu với engine */
  provider_rating?: number | null;
  /** Bảng cộng/trừ điểm cho bottom sheet "Vì sao 8.8?" — tổng points = rating */
  breakdown: Array<{ rule: string; count: number; points: number }>;
  shots?: number;
  shots_on_target?: number;
  key_passes?: number;
  passes?: number;
  pass_accuracy_pct?: number;
  tackles?: number;
  interceptions?: number;
  saves?: number;
  goals_conceded?: number;
}

/**
 * Điểm từng cầu thủ, tính đúng theo RATING_RULESET ở trên.
 * Ví dụ Xuân Son (số 9): 6,0 + 2 bàn (2,0) + 3 sút trúng đích (0,3)
 *                        + 1 đường chuyền quyết định (0,2) + đội thắng (0,3) = 8,8
 */
export const RATED_MATCH_PLAYERS: SeedPlayerRating[] = [
  // ----- Thủ môn -----
  { shirt: 1, minutes: 90, rating: 7.9, provider_rating: 7.6, saves: 2, goals_conceded: 0, passes: 28, pass_accuracy_pct: 79,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'clean_sheet_60min', count: 1, points: 1.0 }, { rule: 'save', count: 2, points: 0.6 }, { rule: 'team_win', count: 1, points: 0.3 }] },

  // ----- Hậu vệ -----
  { shirt: 5, minutes: 90, rating: 7.4, provider_rating: 7.2, tackles: 2, passes: 61, pass_accuracy_pct: 90,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'clean_sheet_60min', count: 1, points: 0.8 }, { rule: 'tackle_interception', count: 2, points: 0.3 }, { rule: 'team_win', count: 1, points: 0.3 }] },
  { shirt: 4, minutes: 90, rating: 7.7, provider_rating: 7.5, tackles: 3, interceptions: 1, passes: 66, pass_accuracy_pct: 91,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'clean_sheet_60min', count: 1, points: 0.8 }, { rule: 'tackle_interception', count: 4, points: 0.6 }, { rule: 'team_win', count: 1, points: 0.3 }] },
  { shirt: 2, minutes: 90, rating: 6.9, provider_rating: 6.8, tackles: 2, passes: 58, pass_accuracy_pct: 88,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'clean_sheet_60min', count: 1, points: 0.8 }, { rule: 'tackle_interception', count: 2, points: 0.3 }, { rule: 'team_win', count: 1, points: 0.3 }, { rule: 'yellow_card', count: 1, points: -0.5 }] },
  { shirt: 20, minutes: 90, rating: 7.5, provider_rating: 7.3, shots: 2, shots_on_target: 1, tackles: 2, passes: 49, pass_accuracy_pct: 84,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'clean_sheet_60min', count: 1, points: 0.8 }, { rule: 'tackle_interception', count: 2, points: 0.3 }, { rule: 'shot_on_target', count: 1, points: 0.1 }, { rule: 'team_win', count: 1, points: 0.3 }] },

  // ----- Tiền vệ -----
  { shirt: 7, minutes: 90, rating: 7.5, provider_rating: 7.4, key_passes: 1, tackles: 1, passes: 44, pass_accuracy_pct: 82,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'assist', count: 1, points: 0.8 }, { rule: 'clean_sheet_60min', count: 1, points: 0.3 }, { rule: 'tackle_interception', count: 1, points: 0.1 }, { rule: 'team_win', count: 1, points: 0.3 }] },
  { shirt: 14, minutes: 90, rating: 8.0, provider_rating: 7.9, key_passes: 1, tackles: 4, passes: 72, pass_accuracy_pct: 89,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'assist', count: 1, points: 0.8 }, { rule: 'key_pass', count: 1, points: 0.2 }, { rule: 'clean_sheet_60min', count: 1, points: 0.3 }, { rule: 'tackle_interception', count: 4, points: 0.4 }, { rule: 'team_win', count: 1, points: 0.3 }] },
  { shirt: 8, minutes: 75, rating: 6.9, provider_rating: 6.9, tackles: 3, passes: 53, pass_accuracy_pct: 87,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'clean_sheet_60min', count: 1, points: 0.3 }, { rule: 'tackle_interception', count: 3, points: 0.3 }, { rule: 'team_win', count: 1, points: 0.3 }] },
  { shirt: 19, minutes: 82, rating: 7.9, provider_rating: 7.7, shots: 3, shots_on_target: 2, passes: 47, pass_accuracy_pct: 83,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'goal', count: 1, points: 1.1 }, { rule: 'clean_sheet_60min', count: 1, points: 0.3 }, { rule: 'shot_on_target', count: 2, points: 0.2 }, { rule: 'team_win', count: 1, points: 0.3 }] },

  // ----- Tiền đạo -----
  { shirt: 18, minutes: 70, rating: 7.5, provider_rating: 7.4, shots: 3, shots_on_target: 2, passes: 26, pass_accuracy_pct: 80,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'goal', count: 1, points: 1.0 }, { rule: 'shot_on_target', count: 2, points: 0.2 }, { rule: 'team_win', count: 1, points: 0.3 }] },
  { shirt: 9, minutes: 90, rating: 8.8, is_motm: true, provider_rating: 8.5, shots: 5, shots_on_target: 3, key_passes: 1, passes: 31, pass_accuracy_pct: 77,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'goal', count: 2, points: 2.0 }, { rule: 'shot_on_target', count: 3, points: 0.3 }, { rule: 'key_pass', count: 1, points: 0.2 }, { rule: 'team_win', count: 1, points: 0.3 }] },

  // ----- Vào sân từ ghế dự bị -----
  { shirt: 22, minutes: 20, rating: 6.4, provider_rating: 6.5, shots: 1, shots_on_target: 1, passes: 9, pass_accuracy_pct: 78,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'shot_on_target', count: 1, points: 0.1 }, { rule: 'team_win', count: 1, points: 0.3 }] },
  { shirt: 15, minutes: 15, rating: 6.3, provider_rating: 6.4, tackles: 0, passes: 12, pass_accuracy_pct: 92,
    breakdown: [{ rule: 'base', count: 1, points: 6.0 }, { rule: 'team_win', count: 1, points: 0.3 }] },
  // Đá 8 phút (< 10) -> không chấm điểm, app hiện "–"
  { shirt: 13, minutes: 8, rating: null, provider_rating: null, passes: 5, pass_accuracy_pct: 80, breakdown: [] },
];

/** Một lần đính chính điểm mẫu, để thử thông báo "Điểm đã được cập nhật" (mục 12.4) */
export const RATED_MATCH_CORRECTION = {
  shirt: 19,
  old_rating: 6.8,
  new_rating: 7.9,
  reason: 'Nhà cung cấp xác nhận bàn thắng phút 78 thuộc về Quang Hải sau khi xem lại VAR',
};

// ---------------------------------------------------------------------------
// 8. LỊCH SỬ GIÁ TRỊ CẦU THỦ (mục 11.5) — cho biểu đồ ở hồ sơ cầu thủ
// ---------------------------------------------------------------------------
/** estimated = giá trị ước tính theo phong độ; market = giá trị thị trường gốc */
export const VALUE_HISTORY: Record<number, Array<{ on: string; market: number; estimated: number; form: number }>> = {
  9: [
    { on: '2026-03-01', market: 700_000, estimated: 700_000, form: 7.1 },
    { on: '2026-04-01', market: 700_000, estimated: 735_000, form: 7.6 },
    { on: '2026-05-01', market: 700_000, estimated: 760_000, form: 7.9 },
    { on: '2026-06-10', market: 700_000, estimated: 822_000, form: 8.3 },
  ],
  14: [
    { on: '2026-03-01', market: 600_000, estimated: 600_000, form: 7.0 },
    { on: '2026-04-01', market: 600_000, estimated: 615_000, form: 7.3 },
    { on: '2026-05-01', market: 600_000, estimated: 628_000, form: 7.5 },
    { on: '2026-06-10', market: 600_000, estimated: 660_000, form: 7.8 },
  ],
  22: [
    { on: '2026-03-01', market: 450_000, estimated: 450_000, form: 6.8 },
    { on: '2026-04-01', market: 450_000, estimated: 441_000, form: 6.4 },
    { on: '2026-05-01', market: 450_000, estimated: 432_000, form: 6.3 },
    { on: '2026-06-10', market: 450_000, estimated: 428_000, form: 6.4 },
  ],
};

// ---------------------------------------------------------------------------
// 9. KÊNH PHÁT SÓNG (mục 5.2) — gán cho các trận chưa đá và trận đang đá
// ---------------------------------------------------------------------------
export const TV_CHANNELS = ['VTV5', 'FPT Play'];

// ---------------------------------------------------------------------------
// 10. TÀI LIỆU CHO TRỢ LÝ AI (mục 10.4) — phần văn bản để RAG tra cứu
// ---------------------------------------------------------------------------
export const KB_DOCUMENTS = [
  {
    source: 'rules' as const,
    title: 'Cách tính điểm cầu thủ trong app',
    body:
      'Điểm cầu thủ được tính từ các sự kiện thật của trận đấu, theo từng vị trí. Mỗi cầu thủ ' +
      'bắt đầu từ 6,0 điểm nếu đá ít nhất 10 phút. Bàn thắng được cộng từ 1,0 đến 1,5 điểm tuỳ ' +
      'vị trí (tiền đạo thấp nhất, thủ môn cao nhất), kiến tạo cộng 0,8. Giữ sạch lưới khi đá từ ' +
      '60 phút cộng 1,0 cho thủ môn, 0,8 cho hậu vệ, 0,3 cho tiền vệ. Thẻ vàng trừ 0,5, thẻ đỏ ' +
      'trừ 1,5, phản lưới nhà trừ 1,0. Đội thắng được cộng 0,3, đội thua trừ 0,2. Điểm luôn nằm ' +
      'trong khoảng 3,0 đến 10,0. Cầu thủ đá dưới 10 phút không được chấm điểm.',
  },
  {
    source: 'faq' as const,
    title: 'Vì sao điểm cầu thủ thay đổi sau trận?',
    body:
      'Sau khi trận kết thúc, điểm hiển thị là điểm tạm tính. Hệ thống lấy lại dữ liệu sau 15 phút ' +
      'và chốt điểm sau 60 phút, vì nhà cung cấp dữ liệu thường chỉnh lại số liệu trong khoảng thời ' +
      'gian này, ví dụ khi VAR huỷ một bàn thắng hoặc khi người kiến tạo được xác định lại. Khi điểm ' +
      'thay đổi, app hiện dòng chú thích nêu rõ lý do.',
  },
  {
    source: 'history' as const,
    title: 'Ba chức vô địch Đông Nam Á của đội tuyển Việt Nam',
    body:
      'Đội tuyển Việt Nam vô địch Đông Nam Á ba lần. Năm 2008 là chức vô địch đầu tiên trong lịch sử. ' +
      'Năm 2018, đội tuyển vô địch sau mười năm chờ đợi. Năm 2024, đội tuyển vô địch ASEAN Cup sau khi ' +
      'thắng Thái Lan ở hai lượt chung kết. Ngoài ra đội tuyển hai lần vào tứ kết Asian Cup, năm 2007 ' +
      'khi là một trong các nước chủ nhà và năm 2019 tại UAE.',
  },
];
