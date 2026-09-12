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
  Achievement, LastMatchSquad, SearchHit, SearchStats, Squad, SquadValue, TeamOverview, User,
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

  /**
   * ⭐ Đội hình TRẬN VỪA ĐÁ, kèm điểm cầu thủ + thẻ phạt.
   * Dùng cho phân đoạn 'Trận vừa đá' ở Tab Đội hình (ARCHITECTURE.md mục 5.3).
   */
  lastMatch: () => fetchData<LastMatchSquad>('/squad/last-match'),
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

// ---------------------------------------------------------------------------
// TÌM KIẾM AI TRONG KHO TRI THỨC
// ---------------------------------------------------------------------------
/**
 * ⚠️ ĐỪNG NHẦM VỚI playersApi.list({ search }) — HAI THỨ KHÁC HẲN NHAU:
 *
 *   playersApi.list({ search: 'quang' })
 *     -> tra bảng players, khớp TÊN cầu thủ. Nhanh, chính xác, không tốn tiền.
 *
 *   searchApi.query('doi tuyen vo dich AFF may lan')
 *     -> tìm trong KHO TRI THỨC (bài viết đã cào về, tài liệu đã OCR) bằng
 *        vector ý nghĩa + từ khoá. Trả lời được câu hỏi bằng ngôn ngữ tự nhiên,
 *        nhưng mỗi lần gọi đều tốn một lượt quota Gemini để nhúng câu hỏi.
 *
 * 👉 Tìm cầu thủ thì dùng cái đầu. Hỏi kiến thức thì dùng cái sau.
 */
export const searchApi = {
  /**
   * @param q     Câu hỏi tiếng Việt, CÓ DẤU HAY KHÔNG ĐỀU ĐƯỢC.
   *              Backend tự bỏ dấu để so khớp ("tien linh" ra "Tiến Linh").
   * @param limit Số kết quả, tối đa 30.
   */
  query: (q: string, limit = 8) => fetchData<{ query: string; hits: SearchHit[] }>('/search', { q, limit }),

  /** Sức khoẻ kho tri thức — dùng để hiện thông báo khi kho còn trống */
  stats: () => fetchData<SearchStats>('/search/stats'),
};

// ---------------------------------------------------------------------------
// HỒ SƠ ĐỘI TUYỂN (Tab 1 — Giới thiệu & Thành tích)
// ---------------------------------------------------------------------------
export const teamApi = {
  /**
   * Một lời gọi trả đủ ba khối: hồ sơ + tủ danh hiệu + dòng thời gian.
   * Xem giải thích "một request, không phải ba" ở backend/src/modules/team/team.service.ts.
   */
  overview: () => fetchData<TeamOverview>('/team/overview'),

  /** Danh sách thành tích đầy đủ — dùng cho màn hình "Xem tất cả" */
  achievements: (limit = 50) =>
    fetchData<{ achievements: Achievement[] }>('/team/achievements', { limit }),
};
