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
  Achievement, ChatAnswer, ChatConversation, LastMatchSquad, SearchHit, SearchStats, Squad, SquadValue, TeamOverview, User,
  ActiveThemeResponse, CallUpDetail, CallUpSummary, EventTheme, Leaderboard, LeaderboardMetric, PeriodType,
  StandingsResponse, StatsMatch, StatsOverview, ThemeMode,
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

// ---------------------------------------------------------------------------
// TRỢ LÝ AI "HỎI ĐÁP ĐỘI TUYỂN" (đặc tả mục 5.7 + 10)
// ---------------------------------------------------------------------------
/**
 * ⚠️ MỌI ENDPOINT Ở ĐÂY ĐỀU BẮT BUỘC ĐĂNG NHẬP.
 *
 * Token được interceptor trong client.ts tự gắn vào, nên ở đây không thấy dòng
 * nào nói về token cả. Nhưng nếu người dùng CHƯA đăng nhập, backend trả 401 và
 * client.ts sẽ thử làm mới token rồi mới bỏ cuộc.
 *
 * 👉 Giao diện PHẢI tự kiểm tra `isAuthenticated` TRƯỚC khi cho gõ câu hỏi
 *    (xem components/ai/AiAssistant.tsx). Để người dùng gõ xong cả câu rồi mới
 *    báo "cần đăng nhập" là một trải nghiệm tệ — mất công gõ mà mất luôn câu.
 */
/** Thời gian app chờ trợ lý AI — phải LỚN HƠN ngân sách 35 giây của backend */
const CHAT_TIMEOUT_MS = 60_000;

export const chatApi = {
  /**
   * Gửi một câu hỏi và nhận câu trả lời.
   *
   * @param message        Câu hỏi tiếng Việt, 2–1000 ký tự (backend kiểm lại).
   * @param conversationId Bỏ trống ở lượt ĐẦU -> backend tạo cuộc hội thoại mới.
   *                       Từ lượt SAU phải truyền id nhận được, nếu không trợ lý
   *                       sẽ quên hết ngữ cảnh trước đó.
   *
   * ⏱️ Chậm hơn mọi API khác trong file này rất nhiều (2–6 giây), vì mỗi câu
   * hỏi có thể phải gọi model 2–3 lượt và tra cơ sở dữ liệu ở giữa. Giao diện
   * bắt buộc phải có trạng thái "đang suy nghĩ", không được để màn hình đứng im.
   */
  ask: (message: string, conversationId?: string) =>
    api
      .post<{ data: ChatAnswer }>('/chat', conversationId ? { message, conversationId } : { message }, {
        /**
         * ⚠️ THỜI GIAN CHỜ RIÊNG — KHÔNG DÙNG MỨC 15 GIÂY CHUNG CỦA APP.
         *
         * 🐛 LỖI ĐÃ GẶP THẬT trên máy ảo Android: Gemini hôm đó mất ~15 giây cho
         * hai vòng. Mức chờ chung 15 giây (hợp lý cho API đọc dữ liệu, vốn trả
         * về trong vài chục mili-giây) cắt ngang đúng lúc backend vừa trả lời
         * xong — người dùng thấy lỗi dù trợ lý đã làm đúng việc.
         *
         * 60 giây > ngân sách 35 giây của backend (CHAT_TIME_BUDGET_MS trong
         * chat.service.ts), nên app LUÔN đợi được tới lúc backend tự trả lời
         * hoặc tự báo "đang chậm" — không bao giờ app bỏ cuộc trước.
         */
        timeout: CHAT_TIMEOUT_MS,
      })
      .then((r) => r.data.data),

  /** Đọc lại một cuộc hội thoại cũ (chỉ lấy được cuộc của CHÍNH mình) */
  conversation: (id: string) => fetchData<ChatConversation>(`/chat/${id}`),

  /** Xoá lịch sử một cuộc hội thoại — quyền riêng tư, đặc tả mục 10.6 */
  remove: (id: string) => api.delete(`/chat/${id}`).then((r) => r.data),
};

// ---------------------------------------------------------------------------
// THỐNG KÊ SAU TRẬN & BXH CẦU THỦ (Tab 5 khung ①)
// ---------------------------------------------------------------------------
export const statsApi = {
  /** Trận vừa đá + cầu thủ xuất sắc nhất + top 5 — một lời gọi cho cả phần đầu khung ① */
  overview: () => fetchData<StatsOverview>('/stats/overview'),

  /**
   * Các trận đã đá — PHÂN TRANG BẰNG CURSOR, không phải số trang.
   *
   * Dùng với useInfiniteQuery: mỗi lần cuộn tới đáy, truyền `nextCursor` của
   * trang trước vào đây. `nextCursor === null` nghĩa là đã hết trận.
   * (Vì sao cursor chứ không phải ?page= — xem encodeCursor ở stats.service.ts backend.)
   */
  matches: async (cursor?: string, limit = 10) => {
    const res = await api.get<{ data: { matches: StatsMatch[] }; meta?: { nextCursor: string | null } }>(
      '/stats/matches',
      { params: cursor ? { cursor, limit } : { limit } }
    );
    return { matches: res.data.data.matches, nextCursor: res.data.meta?.nextCursor ?? null };
  },

  /** @param key Bỏ trống -> backend tự chọn kỳ mới nhất có dữ liệu */
  leaderboard: (params: { period?: PeriodType; key?: string; metric?: LeaderboardMetric; limit?: number }) =>
    fetchData<Leaderboard>('/stats/players/leaderboard', params),
};

// ---------------------------------------------------------------------------
// BXH BẢNG ĐẤU (Tab Trận đấu → "Bảng xếp hạng")
// ---------------------------------------------------------------------------
export const competitionsApi = {
  /** @param seasonId Bỏ trống -> mùa đang diễn ra có Việt Nam */
  standings: (seasonId?: number) =>
    fetchData<StandingsResponse>(seasonId ? `/competitions/${seasonId}/standings` : '/competitions/standings'),
};

// ---------------------------------------------------------------------------
// DANH SÁCH TRIỆU TẬP (Tab Đội hình → "Triệu tập")
// ---------------------------------------------------------------------------
/**
 * ⚠️ ĐỪNG NHẦM VỚI squadApi (ở trên):
 *   squadApi   = ĐỘI HÌNH RA SÂN của một trận (11 người + dự bị, vẽ lên sân)
 *   callUpApi  = DANH SÁCH TRIỆU TẬP của một đợt tập trung (23–30 người)
 * Đặt tên khác hẳn nhau (callUp) để không ai gọi nhầm chỉ vì tên na ná.
 */
export const callUpApi = {
  /** `null` = chưa có đợt nào được công bố (trạng thái hợp lệ, không phải lỗi) */
  current: () => fetchData<CallUpDetail | null>('/squads/current'),
  list: () => fetchData<{ squads: CallUpSummary[] }>('/squads'),
  detail: (id: number) => fetchData<CallUpDetail>(`/squads/${id}`),
};

// ---------------------------------------------------------------------------
// THEME THEO SỰ KIỆN
// ---------------------------------------------------------------------------
export const themesApi = {
  /**
   * Theme đang áp dụng. Khách gửi kèm lựa chọn lưu trên máy; người đã đăng nhập
   * thì server dùng cài đặt trong tài khoản (tham số gửi lên bị bỏ qua).
   */
  active: (mode: ThemeMode, code?: string) =>
    fetchData<ActiveThemeResponse>('/themes/active', code ? { mode, code } : { mode }),

  /** Các theme được phép chọn cố định — cho màn Cài đặt */
  list: () => fetchData<{ themes: EventTheme[] }>('/themes'),

  /** Lưu lựa chọn lên tài khoản (chỉ khi đã đăng nhập) */
  savePreference: (mode: ThemeMode, code?: string) =>
    api.put<{ data: ActiveThemeResponse }>('/themes/preference', code ? { mode, code } : { mode }).then((r) => r.data.data),
};
