/**
 * ============================================================================
 * SERVICES/SOCKET.TS — KẾT NỐI THỜI GIAN THỰC (phía app)
 * ============================================================================
 *
 * Đây là "đầu bên kia" của services/socket.service.ts bên backend.
 *
 * NGUYÊN TẮC "MỘT KẾT NỐI DUY NHẤT":
 * Toàn app chỉ mở MỘT WebSocket. Nếu mỗi màn hình tự mở một cái:
 *   • Tốn pin nghiêm trọng (mỗi kết nối phải gửi tín hiệu duy trì)
 *   • Server phải gánh gấp N lần số kết nối
 *   • Cùng một sự kiện bị xử lý nhiều lần -> giao diện nhảy loạn
 *
 * Cách làm: giữ biến `socket` ở phạm vi module. Mọi nơi gọi getSocket()
 * đều nhận về CÙNG một kết nối.
 */

import { io, type Socket } from 'socket.io-client';
import { SOCKET_URL } from '@/api/client';

let socket: Socket | null = null;

/**
 * Lấy (hoặc tạo mới) kết nối WebSocket.
 */
export function getSocket(): Socket {
  if (socket?.connected || socket?.active) return socket;

  socket = io(SOCKET_URL, {
    path: process.env.EXPO_PUBLIC_SOCKET_PATH ?? '/socket.io',

    /**
     * transports: ['websocket'] — bỏ qua bước "thăm dò" bằng HTTP long-polling.
     * Trên điện thoại, WebSocket luôn dùng được nên bước thăm dò chỉ tốn thời gian.
     */
    transports: ['websocket'],

    /**
     * TỰ ĐỘNG KẾT NỐI LẠI — cực kỳ quan trọng với ứng dụng di động.
     * Người dùng đi thang máy, chuyển từ Wi-Fi sang 4G, khoá màn hình...
     * kết nối đứt liên tục là chuyện bình thường.
     *
     * Thời gian chờ TĂNG DẦN: 1s, 2s, 4s... tối đa 10s.
     * Thử lại dồn dập chỉ làm tốn pin và quá tải server.
     */
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 10_000,

    timeout: 10_000,
    autoConnect: true,
  });

  if (__DEV__) {
    // __DEV__ là biến có sẵn của React Native: true khi chạy dev, false khi build thật.
    // Nhờ đó log chỉ hiện lúc phát triển, bản phát hành sạch sẽ.
    socket.on('connect', () => console.log('[socket] đã kết nối', socket?.id));
    socket.on('disconnect', (reason) => console.log('[socket] ngắt:', reason));
    socket.on('connect_error', (err) => console.log('[socket] lỗi kết nối:', err.message));
  }

  return socket;
}

/** Xin theo dõi một trận (server sẽ cho vào "phòng" của trận đó) */
export function subscribeToMatch(matchId: number): void {
  getSocket().emit('match:subscribe', { matchId });
}

/** Thôi theo dõi — gọi khi rời màn hình để đỡ tốn băng thông */
export function unsubscribeFromMatch(matchId: number): void {
  socket?.emit('match:unsubscribe', { matchId });
}

/**
 * Đóng kết nối hoàn toàn. Chỉ gọi khi đăng xuất.
 * KHÔNG gọi khi chuyển màn hình — kết nối là tài sản dùng chung.
 */
export function closeSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

/** Kiểm tra còn kết nối không — dùng để quyết định có cần chuyển sang polling */
export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}
