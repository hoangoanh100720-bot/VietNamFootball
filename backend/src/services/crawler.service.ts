/**
 * ============================================================================
 * SERVICES/CRAWLER.SERVICE.TS — ĐỒNG BỘ DỮ LIỆU TỪ NGUỒN NGOÀI
 * ============================================================================
 *
 * BỐN JOB, MỘT KHUÔN MẪU CHUNG:
 *   1. Gọi API/trang web nguồn
 *   2. Ánh xạ dữ liệu về đúng cấu trúc bảng của ta
 *   3. UPSERT (có thì cập nhật, chưa có thì thêm) — KHÔNG xoá rồi thêm lại
 *   4. Trả về số bản ghi đã xử lý để cron ghi log
 *
 * VÌ SAO UPSERT MÀ KHÔNG "XOÁ HẾT RỒI THÊM LẠI"?
 * Vì id sẽ thay đổi. Mà id đang được tham chiếu bởi match_events, lineup_players,
 * ai_predictions... Xoá đi là hỏng toàn bộ liên kết. UPSERT giữ nguyên id.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ VỀ CHUYỆN CÀO DỮ LIỆU (WEB SCRAPING)
 *
 * Trước khi cào bất kỳ trang nào, hãy:
 *   1. Đọc file /robots.txt của trang đó xem có cho phép không
 *   2. Đọc Điều khoản sử dụng — nhiều trang CẤM cào dữ liệu
 *   3. Đặt độ trễ giữa các request, không dội bom máy chủ người ta
 *   4. Khai báo User-Agent trung thực, có thông tin liên hệ
 *
 * Cách an toàn và bền vững nhất là dùng API CHÍNH THỨC có giấy phép
 * (api-football, football-data.org...). Dự án này thiết kế theo hướng đó.
 */

import axios from 'axios';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { query } from '@/config/database';
import { cacheDel } from '@/utils/cache';

/**
 * Client HTTP dùng chung, đã cấu hình sẵn timeout và header.
 * Luôn đặt timeout: không có nó, một request treo sẽ giữ job chạy mãi mãi.
 */
const http = axios.create({
  baseURL: env.FOOTBALL_API_BASE_URL,
  timeout: env.CRAWLER_TIMEOUT_MS,
  headers: {
    'User-Agent': env.CRAWLER_USER_AGENT,
    ...(env.FOOTBALL_API_KEY ? { 'x-apisports-key': env.FOOTBALL_API_KEY } : {}),
  },
});

/** Chưa có API key thì các job chỉ ghi log rồi thoát, không làm gì cả */
function assertConfigured(jobName: string): boolean {
  if (!env.FOOTBALL_API_KEY) {
    logger.warn(
      `[${jobName}] Bỏ qua: chưa cấu hình FOOTBALL_API_KEY. ` +
        'Dữ liệu hiện tại đến từ npm run seed.'
    );
    return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// JOB 01:00 — ĐỘI HÌNH
// ---------------------------------------------------------------------------
export async function syncSquad(): Promise<number> {
  if (!assertConfigured('syncSquad')) return 0;

  // Ví dụ gọi thật:
  //   const { data } = await http.get('/players/squads', { params: { team: env.VIETNAM_TEAM_ID } });
  //   -> duyệt data.response[0].players, UPSERT vào bảng players
  //   -> tạo/cập nhật bản ghi lineups + lineup_players

  logger.info('[syncSquad] Khung đã sẵn sàng — điền phần gọi API khi có key');
  await cacheDel('squad:*');
  return 0;
}

// ---------------------------------------------------------------------------
// JOB 01:10 — CẦU THỦ & GIÁ TRỊ CHUYỂN NHƯỢNG
// ---------------------------------------------------------------------------
export async function syncPlayers(): Promise<number> {
  if (!assertConfigured('syncPlayers')) return 0;

  /**
   * Mẫu câu UPSERT chuẩn cho bảng players.
   * Điều kiện xung đột là external_id (id bên nhà cung cấp) — cần thêm
   * UNIQUE constraint cho cột này ở migration tiếp theo khi bắt đầu dùng thật.
   *
   *   INSERT INTO players (team_id, full_name, ..., external_id)
   *   VALUES ($1, $2, ..., $n)
   *   ON CONFLICT (external_id) DO UPDATE SET
   *     market_value_eur = EXCLUDED.market_value_eur,
   *     current_club     = EXCLUDED.current_club,
   *     caps             = EXCLUDED.caps,
   *     goals            = EXCLUDED.goals,
   *     updated_at       = NOW()
   */

  logger.info('[syncPlayers] Khung đã sẵn sàng');
  await cacheDel('squad:*');
  return 0;
}

// ---------------------------------------------------------------------------
// JOB 01:20 — LỊCH THI ĐẤU & KẾT QUẢ
// ---------------------------------------------------------------------------
export async function syncFixtures(): Promise<number> {
  if (!assertConfigured('syncFixtures')) return 0;

  // const { data } = await http.get('/fixtures', {
  //   params: { team: env.VIETNAM_TEAM_ID, season: new Date().getFullYear() },
  // });

  logger.info('[syncFixtures] Khung đã sẵn sàng');
  await cacheDel('matches:*');
  await cacheDel('match:latest');
  return 0;
}

// ---------------------------------------------------------------------------
// JOB 01:30 — BẢNG XẾP HẠNG FIFA
// ---------------------------------------------------------------------------
export async function syncRanking(): Promise<number> {
  if (!assertConfigured('syncRanking')) return 0;

  /**
   * Điểm đáng chú ý: bảng fifa_rankings có ràng buộc
   * UNIQUE (team_id, snapshot_date). Nhờ đó chạy job hai lần trong cùng ngày
   * cũng không tạo bản ghi trùng — ON CONFLICT sẽ cập nhật đè.
   */
  logger.info('[syncRanking] Khung đã sẵn sàng');
  await cacheDel('ranking:*');
  return 0;
}

/**
 * Kiểm tra sức khoẻ nguồn dữ liệu — gọi thủ công khi cần chẩn đoán.
 */
export async function checkProviderHealth(): Promise<boolean> {
  if (!env.FOOTBALL_API_KEY) return false;
  try {
    const res = await http.get('/status');
    return res.status === 200;
  } catch {
    return false;
  }
}
