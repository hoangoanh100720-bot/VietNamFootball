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
