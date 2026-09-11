/**
 * ============================================================================
 * API/ENDPOINTS.TS — TOÀN BỘ LỜI GỌI API CỦA APP
 * ============================================================================
 *
 * Gom hết vào một file để:
 *   • Nhìn một lần là biết app dùng những API nào
 *   • Backend đổi đường dẫn -> sửa đúng một chỗ
 *   • Component KHÔNG bao giờ viết chuỗi URL trực tiếp
 *
 * Mỗi hàm chỉ làm một việc: gọi đúng endpoint và trả về dữ liệu ĐÃ CÓ KIỂU.
 */

import { fetchData, fetchWithMeta, api } from './client';
import type {
  AiPrediction, AuthResponse, Coach, FifaRankingResponse, H2HSummary,
  LiveScore, Match, MatchEvent, Player, PlayerClub, PlayerPosition,
  Squad, SquadValue, User,
} from '@/types';

// ---------------------------------------------------------------------------
// XÁC THỰC
// ---------------------------------------------------------------------------
export const authApi = {
  register: (body: { email: string; password: string; full_name: string }) =>
    api.post<{ data: AuthResponse }>('/auth/register', body).then((r) => r.data.data),

  login: (body: { email: string; password: string }) =>
    api.post<{ data: AuthResponse }>('/auth/login', body).then((r) => r.data.data),

  logout: (refreshToken: string) =>
    api.post('/auth/logout', { refreshToken }).then((r) => r.data),

  me: () => fetchData<{ user: User }>('/auth/me'),
};

// ---------------------------------------------------------------------------
// TRẬN ĐẤU
// ---------------------------------------------------------------------------
export const matchesApi = {
  /** Trận đang đá, hoặc sắp đá gần nhất */
  latest: () => fetchData<{ match: Match | null }>('/matches/latest'),

  upcoming: (page = 1, limit = 10) =>
    fetchWithMeta<{ matches: Match[] }>('/matches/upcoming', { page, limit }),

  results: (page = 1, limit = 10) =>
    fetchWithMeta<{ matches: Match[] }>('/matches/results', { page, limit }),

  detail: (id: number) => fetchData<{ match: Match; events: MatchEvent[] }>(`/matches/${id}`),

  /** Dùng khi WebSocket mất kết nối — app tự chuyển sang hỏi mỗi 15 giây */
  live: (id: number) => fetchData<LiveScore>(`/matches/${id}/live`),

  h2h: (id: number) => fetchData<H2HSummary>(`/matches/${id}/h2h`),
};

// ---------------------------------------------------------------------------
// ĐỘI HÌNH
// ---------------------------------------------------------------------------
export const squadApi = {
  current: () => fetchData<Squad>('/squad/current'),
  value: () => fetchData<SquadValue>('/squad/value'),
};

// ---------------------------------------------------------------------------
// CẦU THỦ & HLV
// ---------------------------------------------------------------------------
export const playersApi = {
  list: (params?: { position?: PlayerPosition; search?: string; page?: number; limit?: number }) =>
    fetchWithMeta<{ players: Player[] }>('/players', params),

  detail: (id: number) => fetchData<{ player: Player; clubs: PlayerClub[] }>(`/players/${id}`),

  coach: () => fetchData<{ coach: Coach }>('/coach'),
};

// ---------------------------------------------------------------------------
// AI & BẢNG XẾP HẠNG
// ---------------------------------------------------------------------------
export const aiApi = {
  predict: (matchId: number, refresh = false) =>
    fetchData<{ prediction: AiPrediction }>(`/ai/predict/${matchId}`, refresh ? { refresh: 'true' } : undefined),

  status: () => fetchData<{ gemini_enabled: boolean; model: string; fallback: string }>('/ai/status'),
};

export const rankingApi = {
  fifa: (limit = 30) => fetchData<FifaRankingResponse>('/ranking/fifa', { limit }),
};
