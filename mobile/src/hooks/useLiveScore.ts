/**
 * ============================================================================
 * HOOKS/USELIVESCORE.TS — TỶ SỐ TRỰC TIẾP (WebSocket + polling dự phòng)
 * ============================================================================
 *
 * Hook này hiện thực đúng đoạn cuối mục 8.2 của ARCHITECTURE.md:
 * "App ưu tiên WebSocket; nếu socket mất kết nối quá 20s sẽ tự chuyển sang
 *  polling REST /matches/:id/live mỗi 15s".
 *
 * VÌ SAO CẦN CẢ HAI CƠ CHẾ?
 *   WebSocket nhanh và tiết kiệm pin, nhưng có thể bị chặn bởi:
 *     • Wi-Fi công cộng / mạng công ty chặn cổng WebSocket
 *     • Một số nhà mạng di động
 *     • Proxy cũ
 *   Polling REST thì ở đâu cũng chạy được, chỉ tốn hơn chút.
 *
 * SƠ ĐỒ TRẠNG THÁI:
 *
 *   [Mở màn hình]
 *        │
 *        ├──> Kết nối socket, vào phòng match:{id}
 *        │         │
 *        │    Nhận score:update -> cập nhật giao diện tức thì ⚡
 *        │         │
 *        │    Mất kết nối > 20 giây?
 *        │         └──> BẬT polling mỗi 15 giây 🔄
 *        │                   │
 *        │              Socket nối lại được?
 *        │                   └──> TẮT polling, quay lại chế độ ⚡
 *        │
 *   [Rời màn hình] -> rời phòng, xoá mọi bộ đếm (RẤT QUAN TRỌNG)
 *
 * ----------------------------------------------------------------------------
 * BÀI HỌC LỚN NHẤT: PHẢI DỌN DẸP TRONG useEffect
 *
 * Hàm `return` bên trong useEffect chạy khi component bị gỡ khỏi màn hình.
 * Nếu không huỷ bộ đếm và gỡ trình lắng nghe ở đó:
 *   • Bộ đếm vẫn chạy sau khi màn hình đã đóng -> rò rỉ bộ nhớ
 *   • Trình lắng nghe chồng chất mỗi lần vào lại màn hình
 *   • React cảnh báo "cập nhật state của component đã bị gỡ"
 */

import { useEffect, useRef, useState } from 'react';
import { AppState, type AppStateStatus } from 'react-native';
import { matchesApi } from '@/api/endpoints';
import { getSocket, subscribeToMatch, unsubscribeFromMatch } from '@/services/socket';
import { showLocalNotification } from '@/services/notifications';
import type { MatchEvent, MatchEventPayload, MatchFinishedPayload, ScoreUpdatePayload } from '@/types';

const POLLING_INTERVAL = Number(process.env.EXPO_PUBLIC_LIVE_POLLING_INTERVAL ?? 15_000);
const SOCKET_TIMEOUT = Number(process.env.EXPO_PUBLIC_SOCKET_RECONNECT_TIMEOUT ?? 20_000);

export interface LiveState {
  homeScore: number;
  awayScore: number;
  minute: number | null;
  status: string;
  events: MatchEvent[];
  /** 'socket' = realtime tức thì | 'polling' = hỏi định kỳ | 'offline' = mất mạng */
  connectionMode: 'socket' | 'polling' | 'offline';
  /** Bật lên trong ~2 giây khi vừa có bàn thắng -> để làm hiệu ứng ăn mừng */
  justScored: boolean;
}

export function useLiveScore(
  matchId: number | null,
  initial: { home: number; away: number; minute: number | null; status: string },
  enabled: boolean
): LiveState {
  const [state, setState] = useState<LiveState>({
    homeScore: initial.home,
    awayScore: initial.away,
    minute: initial.minute,
    status: initial.status,
    events: [],
    connectionMode: 'offline',
    justScored: false,
  });

  /**
   * useRef giữ giá trị qua các lần render mà KHÔNG kích hoạt render lại.
   * Đúng thứ cần cho id của bộ đếm — thay đổi nó không nên vẽ lại giao diện.
   */
  const pollingTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const disconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scoreFlashTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    // Không phải trận đang đá -> không làm gì cả
    if (!matchId || !enabled) return;

    const socket = getSocket();
    let isMounted = true; // cờ chống cập nhật state sau khi đã rời màn hình

    // -----------------------------------------------------------------
    // CHẾ ĐỘ DỰ PHÒNG: POLLING
    // -----------------------------------------------------------------
    const fetchLive = async () => {
      try {
        const data = await matchesApi.live(matchId);
        if (!isMounted) return;

        setState((prev) => ({
          ...prev,
          homeScore: data.home_score,
          awayScore: data.away_score,
          minute: data.minute,
          status: data.status,
          events: data.events,
        }));
      } catch {
        // Lỗi mạng lúc polling thì bỏ qua, 15 giây nữa thử lại
      }
    };

    const startPolling = () => {
      if (pollingTimer.current) return; // đang chạy rồi

      setState((p) => ({ ...p, connectionMode: 'polling' }));
      void fetchLive();                                   // gọi ngay lần đầu
      pollingTimer.current = setInterval(fetchLive, POLLING_INTERVAL);
    };

    const stopPolling = () => {
      if (pollingTimer.current) {
        clearInterval(pollingTimer.current);
        pollingTimer.current = null;
      }
    };

    // -----------------------------------------------------------------
    // CÁC TRÌNH LẮNG NGHE SOCKET
    // -----------------------------------------------------------------
    const onConnect = () => {
      if (!isMounted) return;

      subscribeToMatch(matchId);
      setState((p) => ({ ...p, connectionMode: 'socket' }));

      // Socket đã sống lại -> tắt polling và huỷ đồng hồ đếm ngược
      stopPolling();
      if (disconnectTimer.current) {
        clearTimeout(disconnectTimer.current);
        disconnectTimer.current = null;
      }
    };

    const onDisconnect = () => {
      if (!isMounted) return;

      setState((p) => ({ ...p, connectionMode: 'offline' }));

      // Chờ 20 giây rồi mới chuyển sang polling.
      // Vì sao chờ? Đa số lần đứt kết nối tự nối lại trong 1-2 giây.
      // Chuyển ngay lập tức là lãng phí.
      disconnectTimer.current = setTimeout(startPolling, SOCKET_TIMEOUT);
    };

    const onScoreUpdate = (payload: ScoreUpdatePayload) => {
      if (!isMounted || payload.matchId !== matchId) return;

      setState((prev) => {
        const isGoal = payload.home > prev.homeScore || payload.away > prev.awayScore;

        /**
         * THÔNG BÁO CỤC BỘ KHI APP KHÔNG Ở TIỀN CẢNH.
         *
         * Vì sao kiểm tra AppState? Nếu người dùng đang NHÌN thẳng vào thẻ tỷ số,
         * bắn thêm một thông báo che lên là thừa và khó chịu — họ đã thấy rồi.
         * Chỉ báo khi họ đang làm việc khác.
         *
         * ⚠️ Cách này hoạt động trong khoảng thời gian ngắn sau khi chuyển nền
         * (Android rộng rãi hơn, iOS treo JavaScript khá nhanh). Muốn nhận
         * thông báo khi app đã ĐÓNG HẲN thì bắt buộc phải có FCM + bản build
         * development — xem services/notifications.ts.
         */
        if (isGoal && AppState.currentState !== 'active') {
          void showLocalNotification({
            title: `⚽ ${payload.home} - ${payload.away}`,
            body: `Có bàn thắng ở phút ${payload.minute ?? '?'}`,
            data: { type: 'goal', matchId: String(matchId) },
          });
        }

        // Có bàn thắng -> bật cờ để giao diện làm hiệu ứng, 2 giây sau tắt
        if (isGoal) {
          if (scoreFlashTimer.current) clearTimeout(scoreFlashTimer.current);
          scoreFlashTimer.current = setTimeout(() => {
            if (isMounted) setState((p) => ({ ...p, justScored: false }));
          }, 2000);
        }

        return {
          ...prev,
          homeScore: payload.home,
          awayScore: payload.away,
          minute: payload.minute,
          status: payload.status,
          justScored: isGoal,
        };
      });
    };

    const onMatchEvent = (payload: MatchEventPayload) => {
      if (!isMounted || payload.matchId !== matchId) return;

      // Thêm sự kiện mới vào danh sách. Dùng id âm tạm thời vì server
      // chỉ gửi nội dung sự kiện, không gửi id bản ghi.
      setState((prev) => ({
        ...prev,
        events: [
          ...prev.events,
          {
            id: -Date.now(),
            match_id: matchId,
            team_id: null,
            player_id: null,
            player_name: payload.player,
            minute: payload.minute,
            extra_minute: null,
            type: payload.type as MatchEvent['type'],
            detail: payload.detail ?? null,
          },
        ],
      }));
    };

    const onMatchFinished = (payload: MatchFinishedPayload) => {
      if (!isMounted || payload.matchId !== matchId) return;

      setState((prev) => ({
        ...prev,
        homeScore: payload.finalScore.home,
        awayScore: payload.finalScore.away,
        status: 'finished',
      }));
      stopPolling(); // trận xong rồi thì thôi theo dõi
    };

    // -----------------------------------------------------------------
    // TIẾT KIỆM PIN: DỪNG KHI APP CHẠY NỀN
    // -----------------------------------------------------------------
    /**
     * Người dùng chuyển sang app khác -> không cần cập nhật gì cả.
     * Quay lại -> gọi API một lần để bắt kịp những gì đã bỏ lỡ.
     */
    const onAppStateChange = (nextState: AppStateStatus) => {
      if (nextState === 'active') {
        void fetchLive();
        if (!socket.connected) socket.connect();
      } else {
        stopPolling();
      }
    };

    // -----------------------------------------------------------------
    // GẮN TRÌNH LẮNG NGHE
    // -----------------------------------------------------------------
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('score:update', onScoreUpdate);
    socket.on('match:event', onMatchEvent);
    socket.on('match:finished', onMatchFinished);

    const appStateSub = AppState.addEventListener('change', onAppStateChange);

    // Nếu socket đã kết nối sẵn từ trước thì gọi onConnect thủ công,
    // vì sự kiện 'connect' đã bắn ra trước khi ta kịp lắng nghe.
    if (socket.connected) onConnect();
    else socket.connect();

    // Luôn lấy dữ liệu một lần lúc mở màn hình, không chờ socket
    void fetchLive();

    // -----------------------------------------------------------------
    // ⭐ DỌN DẸP — chạy khi rời màn hình
    // -----------------------------------------------------------------
    return () => {
      isMounted = false;

      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('score:update', onScoreUpdate);
      socket.off('match:event', onMatchEvent);
      socket.off('match:finished', onMatchFinished);

      appStateSub.remove();
      unsubscribeFromMatch(matchId);

      stopPolling();
      if (disconnectTimer.current) clearTimeout(disconnectTimer.current);
      if (scoreFlashTimer.current) clearTimeout(scoreFlashTimer.current);
    };
    // Mảng phụ thuộc: chỉ chạy lại toàn bộ khi đổi trận hoặc bật/tắt
  }, [matchId, enabled]);

  return state;
}
