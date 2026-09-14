/**
 * ============================================================================
 * SERVICES/SOCKET.SERVICE.TS — GIAO TIẾP THỜI GIAN THỰC (Socket.IO)
 * ============================================================================
 *
 * REST vs WEBSOCKET — khác nhau chỗ nào?
 *
 *   REST      : App HỎI, server TRẢ LỜI. Muốn biết tỷ số mới phải hỏi lại.
 *               Giống gọi điện hỏi "có bàn thắng chưa?" mỗi 15 giây.
 *
 *   WEBSOCKET : Mở MỘT đường dây và GIỮ NGUYÊN. Server chủ động ĐẨY tin xuống
 *               ngay khi có. Giống nghe radio tường thuật trực tiếp.
 *
 * Lợi ích: nhanh hơn (không phải chờ tới lượt hỏi), tốn ít pin và data hơn
 * (không phải mở kết nối mới liên tục).
 *
 * ----------------------------------------------------------------------------
 * KHÁI NIỆM "ROOM" (phòng)
 *
 * 10.000 người đang xem app. Chỉ 300 người quan tâm trận #12.
 * Nếu phát tin cho tất cả -> 9.700 người nhận rác.
 *
 * Room giải quyết việc này: ai quan tâm trận #12 thì "vào phòng match:12".
 * Server phát tin vào phòng đó, chỉ người trong phòng nhận được.
 *
 *   client: socket.emit('match:subscribe', { matchId: 12 })
 *   server: io.to('match:12').emit('score:update', {...})
 *
 * ----------------------------------------------------------------------------
 * BỐN SỰ KIỆN CỦA DỰ ÁN (đúng mục 4.3 ARCHITECTURE.md)
 *
 *   match:subscribe    client -> server   { matchId }
 *   score:update       server -> client   { matchId, home, away, minute }
 *   match:event        server -> client   { type, player, minute }
 *   match:finished     server -> client   { matchId, finalScore }
 */

import type { Server as HttpServer } from 'node:http';
import { Server as SocketIOServer, type Socket } from 'socket.io';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

let io: SocketIOServer | null = null;

/** Tên phòng cho một trận đấu — gom vào hàm để không gõ sai chuỗi ở nhiều nơi */
const matchRoom = (matchId: number) => `match:${matchId}`;

/**
 * Khởi tạo Socket.IO, gắn vào CÙNG HTTP server với Express.
 * Không cần mở thêm cổng — Socket.IO dùng chung cổng 5000.
 */
export function initSocket(httpServer: HttpServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    path: env.SOCKET_PATH,
    cors: {
      origin: env.SOCKET_CORS_ORIGIN === '*' ? '*' : env.SOCKET_CORS_ORIGIN.split(','),
      methods: ['GET', 'POST'],
    },
    // Ping mỗi 25s để phát hiện client đã ngắt kết nối (mất sóng, tắt app).
    // Không có cơ chế này, server giữ mãi kết nối chết -> rò rỉ bộ nhớ.
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  io.on('connection', (socket: Socket) => {
    logger.debug('Socket kết nối: ' + socket.id);

    /** Client xin theo dõi một trận */
    socket.on('match:subscribe', (payload: { matchId?: number }) => {
      const matchId = Number(payload?.matchId);

      // ⚠️ VẪN PHẢI KIỂM TRA DỮ LIỆU: socket cũng là đầu vào từ người dùng,
      // không khác gì HTTP. Kẻ xấu có thể gửi matchId = "'; DROP TABLE..."
      if (!Number.isInteger(matchId) || matchId <= 0) {
        socket.emit('error', { message: 'matchId không hợp lệ' });
        return;
      }

      void socket.join(matchRoom(matchId));
      socket.emit('match:subscribed', { matchId });
      logger.debug(`Socket ${socket.id} vào phòng ${matchRoom(matchId)}`);
    });

    /** Client thôi theo dõi (vd: rời màn hình chi tiết trận) */
    socket.on('match:unsubscribe', (payload: { matchId?: number }) => {
      const matchId = Number(payload?.matchId);
      if (Number.isInteger(matchId)) void socket.leave(matchRoom(matchId));
    });

    socket.on('disconnect', (reason) => {
      logger.debug(`Socket ${socket.id} ngắt kết nối: ${reason}`);
      // Socket.IO tự động cho client rời mọi phòng -> không cần dọn thủ công
    });
  });

  logger.info('Socket.IO sẵn sàng tại ' + env.SOCKET_PATH);
  return io;
}

// ---------------------------------------------------------------------------
// CÁC HÀM PHÁT SỰ KIỆN — job polling và service khác sẽ gọi
// ---------------------------------------------------------------------------

/** Phát tỷ số mới cho những ai đang theo dõi trận này */
export function emitScoreUpdate(data: {
  matchId: number;
  home: number;
  away: number;
  minute: number | null;
  status: string;
}) {
  if (!io) return; // Socket bị tắt trong .env thì bỏ qua, không lỗi
  io.to(matchRoom(data.matchId)).emit('score:update', data);
  logger.debug(`Phát score:update tới ${matchRoom(data.matchId)}`, data);
}

/** Phát một diễn biến mới (bàn thắng, thẻ, thay người) */
export function emitMatchEvent(
  matchId: number,
  event: { type: string; player: string | null; minute: number; detail?: string | null }
) {
  if (!io) return;
  io.to(matchRoom(matchId)).emit('match:event', { matchId, ...event });
}

/** Phát thông báo trận đã kết thúc */
export function emitMatchFinished(matchId: number, finalScore: { home: number; away: number }) {
  if (!io) return;
  io.to(matchRoom(matchId)).emit('match:finished', { matchId, finalScore });
  logger.info('Trận kết thúc, đã thông báo', { matchId, finalScore });
}

/**
 * Báo MỌI client rằng theme đang áp dụng vừa đổi (vd bật "Đi bão" sau trận).
 *
 * io.emit() -> gửi tới TẤT CẢ kết nối, không riêng phòng trận nào: người đang
 * ở màn hình Cầu thủ cũng phải thấy pháo hoa, không chỉ người đang xem trận.
 * Payload chỉ là tín hiệu "hãy tải lại" — app tự gọi /themes/active, vì mỗi
 * người có thể đang chọn chế độ khác nhau (tự động / cố định / tắt).
 */
export function emitThemeChanged() {
  if (!io) return;
  io.emit('theme:changed', { at: new Date().toISOString() });
}

/** Số client đang theo dõi một trận — hữu ích để tắt polling khi không ai xem */
export async function countSubscribers(matchId: number): Promise<number> {
  if (!io) return 0;
  const sockets = await io.in(matchRoom(matchId)).fetchSockets();
  return sockets.length;
}

/** Đóng toàn bộ kết nối khi tắt server */
export async function closeSocket(): Promise<void> {
  if (io) {
    await io.close();
    io = null;
    logger.info('Đã đóng Socket.IO');
  }
}
