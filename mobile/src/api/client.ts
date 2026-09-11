/**
 * ============================================================================
 * API/CLIENT.TS — CẦU NỐI GIỮA APP VÀ BACKEND
 * ============================================================================
 *
 * File này giải quyết BỐN vấn đề, mỗi vấn đề nếu tự xử ở từng màn hình thì
 * phải lặp lại code hàng chục lần:
 *
 *   1. Địa chỉ backend       -> khai báo một lần từ biến môi trường
 *   2. Gắn token vào request -> interceptor request tự làm
 *   3. Token hết hạn         -> interceptor response TỰ ĐỘNG làm mới rồi
 *                               GỬI LẠI request cũ. Người dùng không hề hay biết.
 *   4. Lỗi mạng              -> dịch sang thông báo tiếng Việt dễ hiểu
 *
 * ----------------------------------------------------------------------------
 * INTERCEPTOR LÀ GÌ?
 * Là "trạm kiểm soát" mà MỌI request/response đều phải đi qua:
 *
 *   Component -> [interceptor request] -> mạng -> Backend
 *   Component <- [interceptor response] <- mạng <- Backend
 *
 * Nhờ nó, component chỉ cần viết `api.get('/matches/latest')` — mọi thứ về
 * token, lỗi, thử lại đều đã được lo ở đây.
 */

import axios, { AxiosError, type AxiosInstance, type InternalAxiosRequestConfig } from 'axios';
import { clearAuth, getAccessToken, getRefreshToken, saveTokens } from '@/services/secureStore';
import type { ApiError, AuthTokens } from '@/types';

/**
 * ⚠️ ĐỊA CHỈ BACKEND — LỖI SỐ 1 CỦA NGƯỜI MỚI HỌC REACT NATIVE
 *
 * KHÔNG dùng localhost! Vì sao?
 *   • Máy ảo Android : "localhost" là chính máy ảo đó, KHÔNG phải máy tính bạn
 *   • Điện thoại thật: "localhost" là chính cái điện thoại
 *
 * PHẢI dùng địa chỉ IP của máy tính trong mạng LAN, ví dụ 192.168.1.10.
 * Cách tìm IP:  Windows -> mở CMD gõ `ipconfig`, xem dòng IPv4 Address
 *               macOS   -> `ipconfig getifaddr en0`
 *
 * Sau đó sửa EXPO_PUBLIC_API_URL trong file mobile/.env.
 *
 * Vì sao tên biến phải bắt đầu bằng EXPO_PUBLIC_?
 * Vì Expo chỉ nhúng những biến có tiền tố đó vào bundle. Đồng thời đây là
 * lời nhắc: nội dung này AI CŨNG ĐỌC ĐƯỢC -> đừng bao giờ để secret ở đây.
 */
export const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
export const SOCKET_URL = process.env.EXPO_PUBLIC_SOCKET_URL ?? 'http://localhost:5000';
const TIMEOUT = Number(process.env.EXPO_PUBLIC_API_TIMEOUT ?? 15000);

export const api: AxiosInstance = axios.create({
  baseURL: API_URL,
  timeout: TIMEOUT, // sau ngần này mili giây không phản hồi thì bỏ cuộc
  headers: { 'Content-Type': 'application/json' },
});

// ===========================================================================
// INTERCEPTOR 1: GẮN TOKEN VÀO MỌI REQUEST ĐI RA
// ===========================================================================
api.interceptors.request.use(
  async (config) => {
    const token = await getAccessToken();

    if (token) {
      // Chuẩn "Bearer": server đọc header này để biết bạn là ai
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: unknown) => Promise.reject(error instanceof Error ? error : new Error(String(error)))
);

// ===========================================================================
// INTERCEPTOR 2: TỰ ĐỘNG LÀM MỚI TOKEN KHI HẾT HẠN
// ===========================================================================
/**
 * TÌNH HUỐNG: người dùng mở app sau 20 phút. Access token (15 phút) đã hết hạn.
 *
 * KHÔNG CÓ CƠ CHẾ NÀY: app văng ra màn hình đăng nhập -> trải nghiệm tệ.
 * CÓ CƠ CHẾ NÀY:
 *   1. Request trả về 401
 *   2. App âm thầm gọi /auth/refresh
 *   3. Lưu token mới
 *   4. GỬI LẠI request ban đầu
 *   5. Người dùng chỉ thấy dữ liệu hiện ra bình thường, chậm hơn ~200ms
 *
 * ----------------------------------------------------------------------------
 * BÀI TOÁN KHÓ: NHIỀU REQUEST CÙNG HẾT HẠN MỘT LÚC
 *
 * Màn hình chính gọi 4 API song song. Cả 4 cùng nhận 401.
 * Nếu mỗi cái tự gọi refresh -> 4 lần refresh cùng lúc!
 * Mà backend có cơ chế "xoay vòng" (rotation): lần refresh thứ 2 sẽ bị coi là
 * tái sử dụng token đã dùng -> THU HỒI TOÀN BỘ PHIÊN -> người dùng bị đá ra.
 *
 * GIẢI PHÁP (mẫu thiết kế "hàng đợi"):
 *   • Request đầu tiên gọi refresh, bật cờ isRefreshing
 *   • 3 request còn lại thấy cờ bật -> XẾP HÀNG chờ, không tự gọi
 *   • Refresh xong -> đánh thức cả hàng đợi bằng token mới
 */
let isRefreshing = false;
let waitingQueue: Array<{
  resolve: (token: string) => void;
  reject: (err: unknown) => void;
}> = [];

/** Đánh thức toàn bộ request đang xếp hàng */
function flushQueue(error: unknown, token: string | null) {
  waitingQueue.forEach((p) => {
    if (token) p.resolve(token);
    else p.reject(error);
  });
  waitingQueue = [];
}

/** Hàm do màn hình đăng nhập gắn vào — để interceptor báo "phải đăng nhập lại" */
let onSessionExpired: (() => void) | null = null;
export function setSessionExpiredHandler(handler: () => void) {
  onSessionExpired = handler;
}

api.interceptors.response.use(
  // Thành công thì đi thẳng, không làm gì
  (response) => response,

  async (error: AxiosError<ApiError>) => {
    const original = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    // ---- Không phải lỗi 401 -> chuyển thành thông báo tiếng Việt ----
    if (error.response?.status !== 401 || !original) {
      return Promise.reject(toFriendlyError(error));
    }

    // ---- Chính request refresh bị 401 -> refresh token cũng hỏng, hết cách ----
    if (original.url?.includes('/auth/refresh')) {
      await clearAuth();
      onSessionExpired?.();
      return Promise.reject(toFriendlyError(error));
    }

    // ---- Đã thử lại một lần rồi mà vẫn 401 -> dừng, tránh lặp vô hạn ----
    if (original._retry) {
      await clearAuth();
      onSessionExpired?.();
      return Promise.reject(toFriendlyError(error));
    }

    // ---- Đang có người khác refresh -> xếp hàng chờ ----
    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        waitingQueue.push({
          resolve: (token: string) => {
            original.headers.Authorization = `Bearer ${token}`;
            resolve(api(original)); // gửi lại request cũ với token mới
          },
          reject,
        });
      });
    }

    // ---- Ta là người đầu tiên: đi refresh ----
    original._retry = true;
    isRefreshing = true;

    try {
      const refreshToken = await getRefreshToken();
      if (!refreshToken) throw new Error('Chưa đăng nhập');

      /**
       * Dùng axios GỐC chứ KHÔNG dùng `api`.
       * Nếu dùng `api`, request này lại đi qua interceptor -> đệ quy vô tận.
       */
      const { data } = await axios.post<{ data: { tokens: AuthTokens } }>(
        `${API_URL}/auth/refresh`,
        { refreshToken },
        { timeout: TIMEOUT }
      );

      const tokens = data.data.tokens;
      await saveTokens(tokens.accessToken, tokens.refreshToken);

      flushQueue(null, tokens.accessToken);            // đánh thức hàng đợi
      original.headers.Authorization = `Bearer ${tokens.accessToken}`;
      return api(original);                            // gửi lại request của chính ta
    } catch (refreshError) {
      flushQueue(refreshError, null);
      await clearAuth();
      onSessionExpired?.();
      return Promise.reject(toFriendlyError(error));
    } finally {
      // finally LUÔN chạy dù thành công hay lỗi -> cờ không bao giờ bị kẹt
      isRefreshing = false;
    }
  }
);

// ===========================================================================
// DỊCH LỖI SANG TIẾNG VIỆT
// ===========================================================================
export class ApiRequestError extends Error {
  code: string;
  status?: number;
  details?: Array<{ field: string; message: string }>;

  constructor(message: string, code: string, status?: number, details?: ApiRequestError['details']) {
    super(message);
    this.name = 'ApiRequestError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

/**
 * Biến lỗi axios thô thành thông báo mà người dùng ĐỌC HIỂU.
 *
 * So sánh:
 *   Thô  : "Request failed with status code 500"
 *   Thân thiện: "Máy chủ đang gặp sự cố. Vui lòng thử lại sau ít phút."
 */
function toFriendlyError(error: AxiosError<ApiError>): ApiRequestError {
  // Backend đã trả sẵn thông báo tiếng Việt -> dùng luôn
  if (error.response?.data?.error) {
    const e = error.response.data.error;
    return new ApiRequestError(e.message, e.code, error.response.status, e.details);
  }

  // Quá thời gian chờ
  if (error.code === 'ECONNABORTED') {
    return new ApiRequestError(
      'Máy chủ phản hồi quá chậm. Vui lòng thử lại.',
      'TIMEOUT'
    );
  }

  // Không có phản hồi = không nối được tới server
  if (!error.response) {
    return new ApiRequestError(
      'Không kết nối được máy chủ.\nKiểm tra: (1) backend đã chạy chưa, ' +
        '(2) địa chỉ IP trong file .env có đúng không, (3) điện thoại và máy tính ' +
        'có chung mạng Wi-Fi không.',
      'NETWORK_ERROR'
    );
  }

  // Lỗi phía server
  if (error.response.status >= 500) {
    return new ApiRequestError('Máy chủ đang gặp sự cố. Vui lòng thử lại sau.', 'SERVER_ERROR', error.response.status);
  }

  return new ApiRequestError('Đã có lỗi xảy ra. Vui lòng thử lại.', 'UNKNOWN', error.response.status);
}

/**
 * Hàm rút gọn: gọi GET và bóc luôn phần `data` bên trong.
 *
 * Backend trả về { success: true, data: {...} }
 * Ta chỉ quan tâm phần {...} nên bóc sẵn ở đây, khỏi phải viết
 * res.data.data ở khắp nơi (dễ nhầm).
 */
export async function fetchData<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  const res = await api.get<{ data: T }>(url, { params });
  return res.data.data;
}

/** Tương tự cho GET nhưng lấy cả phần meta phân trang */
export async function fetchWithMeta<T>(url: string, params?: Record<string, unknown>) {
  const res = await api.get<{ data: T; meta?: { total: number; totalPages: number; page: number } }>(
    url,
    { params }
  );
  return { data: res.data.data, meta: res.data.meta };
}
