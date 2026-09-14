/**
 * ============================================================================
 * TYPES/INDEX.TS — KIỂU DỮ LIỆU DÙNG CHUNG (khớp với backend)
 * ============================================================================
 *
 * Đây là "bản hợp đồng" giữa app và server. Backend trả về gì thì khai báo
 * đúng như vậy ở đây.
 *
 * LỢI ÍCH THẤY NGAY: gõ `match.` là editor liệt kê mọi trường có thật.
 * Gõ nhầm `match.homeScore` (backend trả `home_score`) là báo đỏ NGAY khi gõ,
 * thay vì tới lúc chạy app mới thấy "undefined".
 *
 * ============================================================================
 * 📖 BỐN QUY ƯỚC PHẢI NHỚ KHI ĐỌC/SỬA FILE NÀY
 * ============================================================================
 *
 * 1️⃣  TÊN TRƯỜNG VIẾT snake_case, KHÔNG PHẢI camelCase
 *
 *     home_score  ✅   homeScore  ❌
 *
 *     Vì đó là tên CỘT trong database, và backend trả thẳng ra không đổi tên.
 *     Chuyển đổi qua lại giữa hai kiểu viết chỉ đẻ thêm một tầng dễ sai mà
 *     chẳng được gì. Riêng `accessToken`/`refreshToken` là ngoại lệ — chúng
 *     không phải cột database mà do tầng xác thực tự sinh ra.
 *
 * 2️⃣  `| null` KHÁC HẲN `?` (dấu hỏi)
 *
 *     logo_url: string | null    → trường LUÔN CÓ MẶT, nhưng có thể rỗng
 *     logo_url?: string          → trường CÓ THỂ KHÔNG TỒN TẠI
 *
 *     Database trả NULL cho ô trống, nên gần như mọi chỗ ở đây dùng `| null`.
 *     Nhờ vậy TypeScript BẮT BUỘC bạn xử lý trường hợp rỗng:
 *
 *         <Image source={{ uri: team.logo_url }} />           ❌ báo đỏ
 *         {team.logo_url && <Image source={{ uri: ... }} />}  ✅
 *
 *     Đây chính là thứ chặn lỗi "hiện ô ảnh vỡ" trước khi nó lên tới người dùng.
 *
 * 3️⃣  NGÀY GIỜ LUÔN LÀ `string`, KHÔNG PHẢI `Date`
 *
 *     JSON không có kiểu ngày tháng. Server gửi chuỗi ISO 8601:
 *     "2026-09-12T19:30:00.000Z". Muốn định dạng thì dùng các hàm trong
 *     utils/format.ts — ĐỪNG tự gọi new Date() rải rác khắp nơi, vì múi giờ
 *     là chỗ sai lầm kinh điển nhất khi làm app thể thao.
 *
 * 4️⃣  SỬA Ở ĐÂY THÌ PHẢI SỬA CẢ BACKEND
 *
 *     File này và `backend/src/types/index.ts` là HAI BẢN SAO của cùng một
 *     hợp đồng. TypeScript KHÔNG tự kiểm tra chúng có khớp nhau không, vì
 *     đây là hai dự án riêng biệt.
 *
 *     👉 Đổi tên một trường ở backend mà quên sửa ở đây: app vẫn biên dịch
 *        được, nhưng lúc chạy sẽ nhận `undefined`. Đây là loại lỗi tốn nhiều
 *        thời gian nhất để tìm ra — nên hãy sửa cả hai file cùng lúc.
 */

// ---------------------------------------------------------------------------
// KHUÔN DẠNG PHẢN HỒI CHUNG (do apiResponse.ts của backend quy định)
// ---------------------------------------------------------------------------
export interface ApiSuccess<T> {
  success: true;
  data: T;
  meta?: PaginationMeta;
}

export interface ApiError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: Array<{ field: string; message: string }>;
  };
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

// ---------------------------------------------------------------------------
// NGƯỜI DÙNG
// ---------------------------------------------------------------------------
export interface User {
  id: number;
  email: string;
  full_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface AuthResponse {
  user: User;
  tokens: AuthTokens;
}

// ---------------------------------------------------------------------------
// BÓNG ĐÁ
// ---------------------------------------------------------------------------
export interface Team {
  id: number;
  name: string;
  country: string;
  logo_url: string | null;
  fifa_code: string | null;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface Match {
  id: number;
  competition: string;
  round: string | null;
  home_team_id: number;
  away_team_id: number;
  home_team: Team;
  away_team: Team;
  kickoff_at: string;   // chuỗi ISO theo giờ UTC
  venue: string | null;
  city: string | null;
  status: MatchStatus;
  home_score: number;
  away_score: number;
  minute: number | null;
  attendance: number | null;
  /** Kênh phát sóng, vd ['VTV5', 'FPT Play']. Mảng rỗng = chưa có thông tin */
  tv_channels?: string[];
}

export type MatchEventType =
  | 'goal' | 'own_goal' | 'penalty' | 'missed_penalty'
  | 'yellow_card' | 'red_card' | 'substitution' | 'var';

export interface MatchEvent {
  id: number;
  match_id: number;
  team_id: number | null;
  player_id: number | null;
  player_name: string | null;
  minute: number;
  extra_minute: number | null;
  type: MatchEventType;
  detail: string | null;
}

export interface LiveScore {
  id: number;
  status: MatchStatus;
  home_score: number;
  away_score: number;
  minute: number | null;
  updated_at: string;
  events: MatchEvent[];
}

export interface H2HSummary {
  total: number;
  wins: number;
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  recent: Match[];
}

export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export interface Player {
  id: number;
  team_id: number;
  full_name: string;
  short_name: string | null;
  birth_date: string | null;
  age: number | null;
  hometown: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  position: PlayerPosition;
  detailed_position: string | null;
  shirt_number: number | null;
  preferred_foot: 'left' | 'right' | 'both' | null;
  market_value_eur: number;
  current_club: string | null;
  photo_url: string | null;
  /** Ghi công ảnh (bắt buộc với giấy phép CC BY): "tác giả · giấy phép · Wikimedia Commons" */
  photo_credit?: string | null;
  /** Trang gốc của ảnh trên Wikimedia Commons */
  photo_source_url?: string | null;
  caps: number;
  goals: number;
}

export interface PlayerClub {
  id: number;
  club_name: string;
  club_logo: string | null;
  from_date: string | null;
  to_date: string | null;
  apps: number;
  goals: number;
  is_loan: boolean;
}

export interface Coach {
  id: number;
  full_name: string;
  nationality: string | null;
  birth_date: string | null;
  age: number | null;
  photo_url: string | null;
  photo_credit?: string | null;
  photo_source_url?: string | null;
  start_date: string | null;
  contract_end: string | null;
  biography: string | null;
  achievements: string[];
  tenure_days: number | null;
  tenure_text: string | null;
}

/** Một cầu thủ trong đội hình, kèm toạ độ để vẽ lên sơ đồ sân */
export interface LineupPlayer {
  id: number;
  player_id: number;
  is_starting: boolean;
  position_x: number | null; // 0-100 (%) theo chiều ngang sân
  position_y: number | null; // 0-100 (%) theo chiều dọc sân
  shirt_number: number | null;
  is_captain: boolean;
  full_name: string;
  short_name: string | null;
  position: PlayerPosition;
  photo_url: string | null;
  market_value_eur: number | string;
  current_club: string | null;
  caps: number;
  goals: number;

  /**
   * ==========================================================================
   * ⭐ DỮ LIỆU MỘT TRẬN CỤ THỂ — CHỈ CÓ Ở `GET /squad/last-match`
   * ==========================================================================
   *
   * Tất cả đều `?` (không bắt buộc) vì cùng một kiểu này phục vụ HAI API:
   *
   *   GET /squad/current     -> đội hình dự kiến, KHÔNG có mấy trường này
   *   GET /squad/last-match  -> trận vừa đá, CÓ đầy đủ
   *
   * 💡 Vì sao không tách làm hai interface riêng?
   * Vì component <FormationPitch> vẽ cho cả hai phân đoạn. Tách kiểu thì phải
   * viết hai component gần như giống hệt nhau, hoặc thêm một tầng union type
   * rườm rà. Dùng trường không bắt buộc là đánh đổi đúng ở đây.
   *
   * ⚠️ Đổi lại, component PHẢI kiểm tra sự tồn tại trước khi dùng — xem cách
   * `hasMatchData` được tính trong FormationPitch.tsx.
   */

  /** Số phút thi đấu. Có mặt trường này = đây là dữ liệu một trận đã đá */
  minutes_played?: number;
  /** Điểm 0–10 do engine chấm. null = đá dưới 10 phút, app hiện "–" */
  rating?: number | null;
  /** 'computed' (engine tính) · 'provider' (nhà cung cấp) · 'manual' (admin sửa) */
  rating_source?: string | null;
  /** Cầu thủ xuất sắc nhất trận */
  is_motm?: boolean;
  /** Bảng giải thích "Vì sao 8.8?" — xem RatingBreakdownItem */
  rating_breakdown?: RatingBreakdownItem[];
  /** Số bàn ghi TRONG TRẬN NÀY (khác `goals` là tổng bàn cả sự nghiệp) */
  match_goals?: number;
  match_assists?: number;
  yellow_cards?: number;
  red_cards?: number;
  /** Phút bị thay ra. null = đá hết trận */
  subbed_out_at?: number | null;
}

/**
 * Một dòng trong bảng giải thích điểm.
 *
 * ⭐ ĐÂY LÀ THỨ FOTMOB VÀ SOFASCORE KHÔNG CÓ: họ cho một con số và người dùng
 * phải tin. App này giải thích được từng điểm cộng/trừ.
 *
 * Khớp với RatingBreakdownItem trong backend/src/services/rating/engine.ts.
 */
export interface RatingBreakdownItem {
  /** Mã sự kiện, ví dụ 'goal' — dùng để dịch sang ngôn ngữ khác nếu cần */
  code: string;
  /** Nhãn tiếng Việt, ví dụ "Bàn thắng" */
  label: string;
  /** Số lần xảy ra. 1 với các mục không đếm được (điểm khởi đầu, thắng/thua) */
  count: number;
  /** Hệ số cho MỘT lần */
  unit: number;
  /** count × unit — tổng các dòng LUÔN bằng đúng điểm cuối cùng */
  points: number;
}

export interface Squad {
  formation: string;        // "3-4-3"
  updated_at: string;
  starting: LineupPlayer[];
  bench: LineupPlayer[];
}

export interface SquadValue {
  total_eur: number;
  total_players: number;
  average_eur: number;
  by_position: Array<{
    position: PlayerPosition;
    label: string;
    count: number;
    total_eur: number;
    avg_eur: number;
  }>;
  most_valuable: Array<{
    id: number;
    full_name: string;
    short_name: string;
    position: PlayerPosition;
    market_value_eur: number;
    current_club: string;
    photo_url: string | null;
  }>;
}

export interface AiPrediction {
  id: number;
  match_id: number;
  win_pct: number;
  draw_pct: number;
  lose_pct: number;
  analysis_text: string;
  key_factors: string[];
  predicted_score: string | null;
  confidence: 'low' | 'medium' | 'high' | null;
  model_version: string;
  generated_at: string;
  expires_at: string;
  /** Nguồn dữ liệu: gọi AI mới, lấy cache, hay mô hình thống kê dự phòng */
  source?: 'cache' | 'database' | 'gemini' | 'statistical' | 'stale';
}

export interface FifaRankingItem {
  id: number;
  team_id: number;
  rank: number;
  points: number;
  previous_rank: number | null;
  change: number;          // dương = tăng hạng
  confederation: string | null;
  snapshot_date: string;
  team_name: string;
  team_logo: string | null;
  fifa_code: string | null;
}

export interface FifaRankingResponse {
  rankings: FifaRankingItem[];
  vietnam: FifaRankingItem | null;
  snapshot_date: string | null;
}

// ---------------------------------------------------------------------------
// SỰ KIỆN WEBSOCKET (khớp mục 4.3 ARCHITECTURE.md)
// ---------------------------------------------------------------------------
export interface ScoreUpdatePayload {
  matchId: number;
  home: number;
  away: number;
  minute: number | null;
  status: string;
}

export interface MatchEventPayload {
  matchId: number;
  type: string;
  player: string | null;
  minute: number;
  detail?: string | null;
}

export interface MatchFinishedPayload {
  matchId: number;
  finalScore: { home: number; away: number };
}

// ---------------------------------------------------------------------------
// TÌM KIẾM AI (kho tri thức)
// ---------------------------------------------------------------------------

/**
 * Một kết quả tìm kiếm trong kho tri thức.
 *
 * Khớp với kiểu SearchHit ở backend/src/modules/search/search.service.ts.
 * ⚠️ Sửa một bên thì phải sửa bên kia — TypeScript không tự kiểm tra được
 * sự khớp nhau giữa hai dự án riêng biệt.
 */
export interface SearchHit {
  chunk_id: number;
  document_id: number;
  /** Tiêu đề tài liệu chứa đoạn này */
  title: string;
  /** Đoạn văn bản khớp với câu hỏi */
  content: string;
  /** 'crawl' | 'ocr' | 'history' | 'faq' ... */
  source: string;
  /** URL gốc — null với tài liệu nhập tay */
  source_url: string | null;
  /** Điểm cuối cùng sau khi trộn vector + từ khoá, thang 0-1 */
  score: number;
  /**
   * Điểm riêng của từng cách tìm.
   * Chỉ có giá trị thật khi gọi API với debug=true; bình thường backend
   * trả về 0 để payload gửi xuống app gọn hơn.
   */
  vector_score: number;
  keyword_score: number;
}

/** Sức khoẻ kho tri thức — dùng để báo cho người dùng biết khi kho còn trống */
export interface SearchStats {
  documents: number;
  chunks: number;
  embedded: number;
  /** Số đoạn chưa nhúng vector. > 0 nghĩa là cần chạy `npm run index` */
  pending: number;
  driver: string;
  /** 'pgvector' (nhanh) hoặc 'javascript' (dev) */
  vector_engine: string;
  embedding_model: string;
  embedding_dim: number;
}

// ---------------------------------------------------------------------------
// HỒ SƠ ĐỘI TUYỂN & THÀNH TÍCH (Tab 1 — Giới thiệu)
// ---------------------------------------------------------------------------

/**
 * Mức thành tích tại một giải đấu.
 *
 * ⚠️ Danh sách này phải khớp CHÍNH XÁC ràng buộc CHECK của cột
 * `achievements.result` (migration 002). Thêm giá trị mới ở đây mà quên sửa
 * migration thì database sẽ từ chối dòng dữ liệu đó — và ngược lại, thêm ở
 * database mà quên ở đây thì TypeScript sẽ báo đỏ nhầm chỗ.
 */
export type AchievementResult =
  | 'champion'
  | 'runner_up'
  | 'third_place'
  | 'semi_final'
  | 'quarter_final'
  | 'round_of_16'
  | 'group_stage'
  | 'qualified';

export interface Achievement {
  id: number;
  competition: string;
  /** Năm diễn ra giải, ví dụ 2024 */
  edition_year: number;
  result: AchievementResult;
  /** Tiêu đề hiển thị sẵn, ví dụ "Vô địch AFF Cup 2018" */
  title: string;
  description: string | null;
  /** Nước/khu vực đăng cai */
  host: string | null;
  image_url: string | null;
  /** true = được chọn hiện ở "Tủ danh hiệu" nổi bật đầu tab */
  is_highlight: boolean;
}

export interface TeamProfile {
  team_id: number;
  name: string;
  fifa_code: string | null;
  logo_url: string | null;
  /** "Những chiến binh Sao Vàng" */
  nickname: string | null;
  federation: string | null;
  /** ['AFC', 'AFF'] */
  confederations: string[];
  home_stadium: string | null;
  intro_text: string;
  cover_image_url: string | null;
  /** Thứ hạng FIFA CAO NHẤT từng đạt — số càng NHỎ càng giỏi */
  best_fifa_rank: number | null;
  best_fifa_rank_date: string | null;
}

/** Bảng đếm danh hiệu — mỗi trường là một con số to trên giao diện */
export interface TrophyCabinet {
  champion: number;
  runner_up: number;
  third_place: number;
  /** Số lần lọt sâu ở đấu trường châu lục (Asian Cup, World Cup) */
  continental_best: number;
  total: number;
}

/** Phản hồi của GET /team/overview — gộp cả ba khối cho Tab Giới thiệu */
export interface TeamOverview {
  profile: TeamProfile;
  trophies: TrophyCabinet;
  achievements: Achievement[];
}

/** Phản hồi của GET /squad/last-match — đội hình một trận đã đá, kèm điểm */
export interface LastMatchSquad {
  match: {
    id: number;
    kickoff_at: string;
    home_name: string;
    away_name: string;
    home_code: string | null;
    away_code: string | null;
    home_score: number;
    away_score: number;
    /** Việt Nam đá sân nhà trong trận này? */
    is_home: boolean;
  };
  starting: LineupPlayer[];
  bench: LineupPlayer[];
}

// ===========================================================================
// TRỢ LÝ AI "HỎI ĐÁP ĐỘI TUYỂN" (đặc tả mục 5.7 + 10)
// ===========================================================================

/**
 * Phản hồi của POST /chat — một lượt hỏi đáp.
 *
 * ⚠️ ĐỪNG NHẦM VỚI SearchHit (API /search). Hai thứ khác hẳn nhau:
 *
 *   searchApi.query()  -> trả về CÁC ĐOẠN VĂN BẢN thô lấy từ kho tri thức.
 *                         Người dùng phải tự đọc và tự rút ra kết luận.
 *
 *   chatApi.ask()      -> trả về MỘT CÂU TRẢ LỜI đã được viết sẵn. Trợ lý tự
 *                         quyết định cần tra bảng nào (trận đấu, điểm cầu thủ,
 *                         BXH FIFA…), tự gọi công cụ, rồi tổng hợp thành câu.
 *
 * 👉 Cần dẫn chứng kèm nguồn thì dùng /search. Cần câu trả lời thẳng thì /chat.
 */
export interface ChatAnswer {
  /**
   * Id cuộc hội thoại.
   *
   * Lần hỏi ĐẦU TIÊN ta không gửi id; backend tự tạo cuộc mới và trả id về
   * đây. Từ lượt thứ hai trở đi PHẢI gửi kèm id này, nếu không trợ lý sẽ mất
   * trí nhớ — hỏi "còn cậu ấy ghi mấy bàn?" sẽ không biết "cậu ấy" là ai.
   */
  conversationId: string;
  /** Câu trả lời đã viết sẵn bằng tiếng Việt, có thể chứa Markdown nhẹ (**đậm**) */
  answer: string;
  /**
   * Tên các công cụ trợ lý đã dùng, ví dụ ['get_player_ratings'].
   *
   * Mảng RỖNG nghĩa là trợ lý trả lời mà không tra dữ liệu nào — hoặc vì câu
   * hỏi bị lớp lọc chặn (cá cược), hoặc vì nó trả lời bằng kiến thức chung.
   * Giao diện dùng mảng này để hiện dòng "đã tra: bảng điểm cầu thủ" —
   * minh bạch về NGUỒN, đúng tinh thần mục 10.6.
   */
  toolsUsed: string[];
  /** Số lượt gọi model đã tiêu (1 + số vòng gọi công cụ). Dùng để gỡ lỗi chi phí. */
  rounds: number;
}

/** Một tin nhắn đã lưu trong lịch sử hội thoại */
export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

/** Phản hồi của GET /chat/:id — đọc lại một cuộc hội thoại cũ */
export interface ChatConversation {
  conversation: { id: string; title: string | null; created_at: string };
  messages: ChatMessage[];
}

// ===========================================================================
// THỐNG KÊ SAU TRẬN & BXH CẦU THỦ (Tab 5 — đặc tả 5.6, 12.5)
// ===========================================================================

/** Thông số một đội trong một trận. Mọi trường có thể null khi nhà cung cấp thiếu */
export interface TeamMatchStats {
  possession_pct: number | null;
  shots: number | null;
  shots_on_target: number | null;
  expected_goals: number | null;
  corners: number | null;
  fouls: number | null;
  yellow_cards: number | null;
  red_cards: number | null;
  saves: number | null;
  passes: number | null;
  pass_accuracy_pct: number | null;
}

type TeamBrief = { id: number; name: string; fifa_code: string | null; logo_url: string | null };

export interface StatsMatch {
  id: number;
  kickoff_at: string;
  competition: string;
  home_team: TeamBrief;
  away_team: TeamBrief;
  home_score: number;
  away_score: number;
  vietnam_is_home: boolean;
  /** Nhìn TỪ PHÍA VIỆT NAM — đã tính sẵn ở server, app không tự so tỷ số */
  result: 'win' | 'draw' | 'lose';
  home_stats: TeamMatchStats | null;
  away_stats: TeamMatchStats | null;
}

export interface ManOfTheMatch {
  player_id: number;
  full_name: string;
  short_name: string | null;
  position: PlayerPosition;
  rating: number;
  goals: number;
  assists: number;
}

export type LeaderboardMetric = 'avg_rating' | 'goals' | 'assists' | 'motm' | 'cards';
export type PeriodType = 'week' | 'month' | 'year' | 'competition' | 'squad';

export interface LeaderboardRow {
  /** Bằng chỉ số thì ĐỒNG HẠNG — có thể có hai dòng cùng rank */
  rank: number;
  player_id: number;
  full_name: string;
  short_name: string | null;
  position: PlayerPosition;
  photo_url: string | null;
  matches: number;
  minutes: number;
  value: number;
  avg_rating: number | null;
  goals: number;
  assists: number;
  motm_count: number;
  yellow_cards: number;
  red_cards: number;
}

export interface Leaderboard {
  period_type: PeriodType;
  period_key: string;
  metric: LeaderboardMetric;
  min_minutes: number;
  rows: LeaderboardRow[];
  /** Chỉ có ở /stats/players/leaderboard — các kỳ đang có dữ liệu cho ô chọn */
  periods?: Array<{ period_type: PeriodType; period_key: string; players: number }>;
}

export interface StatsOverview {
  lastMatch: StatsMatch | null;
  manOfTheMatch: ManOfTheMatch | null;
  leaderboard: Leaderboard | null;
}

// ===========================================================================
// BXH BẢNG ĐẤU (đặc tả 5.8)
// ===========================================================================

export interface StandingRow {
  position: number;
  team_id: number;
  team_name: string;
  fifa_code: string | null;
  logo_url: string | null;
  played: number;
  won: number;
  drawn: number;
  lost: number;
  goals_for: number;
  goals_against: number;
  goal_diff: number;
  points: number;
  is_vietnam: boolean;
}

export interface StandingGroup {
  group_name: string;
  /** Vẽ vạch "đi tiếp" sau dòng thứ advance_count */
  advance_count: number;
  rows: StandingRow[];
}

export interface StandingsResponse {
  season: { id: number; name: string; competition_name: string; advance_note: string } | null;
  groups: StandingGroup[];
  /** "Việt Nam đang đứng thứ 1 bảng F với 9 điểm sau 3 trận." — dùng cho Senior mode */
  vietnam_summary: string | null;
}

// ===========================================================================
// DANH SÁCH TRIỆU TẬP (đặc tả 5.8) — KHÁC Squad (đội hình ra sân)
// ===========================================================================

export interface CallUpMember {
  player_id: number;
  full_name: string;
  short_name: string | null;
  position: PlayerPosition;
  shirt_number: number | null;
  current_club: string | null;
  photo_url: string | null;
  status: 'called' | 'added' | 'withdrawn';
  note: string | null;
  /** Lần đầu được gọi lên đội tuyển -> nhãn "Mới" */
  is_new: boolean;
}

export interface CallUpSummary {
  id: number;
  title: string;
  gather_from: string | null;
  gather_to: string | null;
  announced_at: string;
  player_count: number;
}

export interface CallUpDetail {
  squad: CallUpSummary;
  groups: Array<{ position: PlayerPosition; members: CallUpMember[] }>;
  added: CallUpMember[];
  withdrawn: CallUpMember[];
  new_count: number;
}

// ===========================================================================
// THEME THEO SỰ KIỆN (đặc tả mục 6)
// ===========================================================================

export type ThemeMode = 'auto' | 'fixed' | 'off';

export interface EventTheme {
  id: number;
  code: string;
  name: string;
  kind: 'default' | 'event' | 'result_win' | 'result_lose';
  /** Chỉ chứa token trong danh sách trắng (accent, accentText, gold…) */
  palette_light: Record<string, string>;
  palette_dark: Record<string, string>;
  assets: { effect?: 'fireworks' | 'blossoms' | null; greeting?: string | null };
  preview_url: string | null;
  is_selectable: boolean;
}

export interface ActiveThemeResponse {
  theme: EventTheme;
  reason: 'user_fixed' | 'user_off' | 'schedule' | 'default';
  ends_at: string | null;
}
