/**
 * ============================================================================
 * TYPES/INDEX.TS — CÁC KIỂU DỮ LIỆU DÙNG CHUNG
 * ============================================================================
 *
 * Mỗi interface ở đây tương ứng MỘT bảng trong database.
 * Tên thuộc tính viết snake_case cho khớp đúng tên cột -> hàm query() trả về
 * là dùng ngay được, không phải chuyển đổi qua lại.
 *
 * Lợi ích: gõ `player.` là editor gợi ý đủ mọi trường, gõ sai tên là báo đỏ ngay.
 */

// ---------------------------------------------------------------------------
// NGƯỜI DÙNG
// ---------------------------------------------------------------------------
export interface User {
  id: number;
  email: string;
  password_hash: string; // ⚠️ KHÔNG BAO GIỜ trả trường này về client
  full_name: string;
  avatar_url: string | null;
  role: 'user' | 'admin';
  created_at: Date;
  updated_at: Date;
}

/** Bản "an toàn" của User — đã bỏ password_hash, dùng để trả về API */
export type PublicUser = Omit<User, 'password_hash'>;

/** Nội dung được nhúng bên trong JWT (gọi là payload) */
export interface JwtPayload {
  sub: number; // subject = id người dùng (tên chuẩn theo RFC 7519)
  email: string;
  role: 'user' | 'admin';
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // số giây access token còn sống, để app biết khi nào cần làm mới
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

export type PlayerPosition = 'GK' | 'DF' | 'MF' | 'FW';

export interface Player {
  id: number;
  team_id: number;
  full_name: string;
  short_name: string | null;
  birth_date: string | null;
  hometown: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  position: PlayerPosition;
  detailed_position: string | null;
  shirt_number: number | null;
  preferred_foot: 'left' | 'right' | 'both' | null;
  market_value_eur: string | number; // Postgres trả BIGINT dạng chuỗi -> xử lý ở service
  current_club: string | null;
  photo_url: string | null;
  caps: number;
  goals: number;
  is_active: boolean;
}

export interface Coach {
  id: number;
  team_id: number;
  full_name: string;
  nationality: string | null;
  birth_date: string | null;
  photo_url: string | null;
  start_date: string | null;
  contract_end: string | null;
  biography: string | null;
  achievements: string[];
  is_current: boolean;
}

export type MatchStatus = 'scheduled' | 'live' | 'finished' | 'postponed' | 'cancelled';

export interface Match {
  id: number;
  competition: string;
  round: string | null;
  home_team_id: number;
  away_team_id: number;
  kickoff_at: Date | string;
  venue: string | null;
  city: string | null;
  status: MatchStatus;
  home_score: number;
  away_score: number;
  minute: number | null;
  attendance: number | null;
}

/** Trận đấu kèm thông tin đội (kết quả của câu JOIN) — đây là thứ API trả về */
export interface MatchWithTeams extends Match {
  home_team: Team;
  away_team: Team;
}

export type MatchEventType =
  | 'goal' | 'own_goal' | 'penalty' | 'missed_penalty'
  | 'yellow_card' | 'red_card' | 'substitution' | 'var';

export interface MatchEvent {
  id: number;
  match_id: number;
  team_id: number | null;
  player_id: number | null;
  player_name?: string | null;
  minute: number;
  extra_minute: number | null;
  type: MatchEventType;
  detail: string | null;
}

export interface LineupPlayer {
  id: number;
  player_id: number;
  is_starting: boolean;
  position_x: number | null;
  position_y: number | null;
  shirt_number: number | null;
  is_captain: boolean;
  // Thông tin cầu thủ lấy kèm qua JOIN
  full_name: string;
  short_name: string | null;
  position: PlayerPosition;
  photo_url: string | null;
  market_value_eur: string | number;
}

export interface Lineup {
  id: number;
  formation: string;
  starting: LineupPlayer[];
  bench: LineupPlayer[];
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
  generated_at: Date | string;
  expires_at: Date | string;
}

export interface FifaRanking {
  id: number;
  team_id: number;
  rank: number;
  points: string | number;
  previous_rank: number | null;
  confederation: string | null;
  snapshot_date: string;
  team_name?: string;
  team_logo?: string | null;
  fifa_code?: string | null;
}

/** Thống kê đối đầu giữa hai đội */
export interface H2HSummary {
  total: number;
  wins: number;   // theo góc nhìn đội chủ nhà của trận đang xét
  draws: number;
  losses: number;
  goals_for: number;
  goals_against: number;
  recent: MatchWithTeams[];
}
