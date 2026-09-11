/**
 * ============================================================================
 * DB/SETLIVE.TS — BẬT LẠI MỘT TRẬN Ở TRẠNG THÁI "ĐANG ĐÁ"
 * ============================================================================
 *
 * Chạy:  npm run db:live            (mặc định về phút 60, tỷ số 0-0)
 *        npm run db:live -- 75      (bắt đầu từ phút 75)
 *
 * DÙNG KHI NÀO?
 * Bộ mô phỏng trong livePoll.job.ts cho trận chạy tới phút 90 rồi kết thúc.
 * Sau đó app không còn trận live nào để bạn xem giao diện realtime.
 * Lệnh này "tua ngược" một trận về giữa hiệp hai để demo lại.
 *
 * ⚠️ PHẢI TẮT SERVER TRƯỚC KHI CHẠY.
 * PGlite chỉ cho phép MỘT tiến trình mở database cùng lúc — đó là bản chất
 * của cơ sở dữ liệu nhúng. Server đang chạy thì script này không mở được.
 * (Đây chính là một lý do production phải dùng PostgreSQL thật: nó là một
 * dịch vụ riêng, phục vụ được nhiều tiến trình cùng lúc.)
 */

import { closeDatabase, connectDatabase, query } from '@/config/database';
import { logger } from '@/utils/logger';

async function setLive() {
  // process.argv[2] là tham số đầu tiên sau tên file
  const minute = Number(process.argv[2] ?? 60);

  if (!Number.isInteger(minute) || minute < 0 || minute > 89) {
    logger.error('Phút phải là số nguyên từ 0 đến 89');
    process.exit(1);
  }

  await connectDatabase();

  /**
   * Chọn trận gần nhất có Việt Nam tham gia và ĐÃ kết thúc.
   * ORDER BY kickoff_at DESC để lấy trận mới nhất — thường là trận
   * vừa bị mô phỏng cho chạy hết giờ.
   */
  const { rows } = await query<{ id: number; home: string; away: string }>(
    `SELECT m.id, ht.name AS home, at.name AS away
     FROM matches m
     JOIN teams ht ON ht.id = m.home_team_id
     JOIN teams at ON at.id = m.away_team_id
     WHERE m.status = 'finished'
       AND (ht.fifa_code = 'VIE' OR at.fifa_code = 'VIE')
     ORDER BY m.kickoff_at DESC
     LIMIT 1`
  );

  const match = rows[0];
  if (!match) {
    logger.error('Không tìm thấy trận nào để bật lại. Chạy: npm run seed');
    await closeDatabase();
    process.exit(1);
  }

  // Đưa trận về trạng thái đang đá, xoá tỷ số cũ
  await query(
    `UPDATE matches
     SET status = 'live', minute = $2, home_score = 0, away_score = 0, updated_at = NOW()
     WHERE id = $1`,
    [match.id, minute]
  );

  // Xoá luôn diễn biến cũ để dòng thời gian bắt đầu lại từ đầu
  const { rowCount } = await query('DELETE FROM match_events WHERE match_id = $1', [match.id]);

  logger.info(`Đã bật trận #${match.id}: ${match.home} vs ${match.away}`);
  logger.info(`   Trạng thái: ĐANG ĐÁ, phút ${minute}, tỷ số 0-0`);
  logger.info(`   Đã xoá ${rowCount} sự kiện cũ`);
  logger.info('Khởi động lại server (npm run dev) để bộ mô phỏng chạy tiếp.');

  await closeDatabase();
}

setLive()
  .then(() => process.exit(0))
  .catch((err: unknown) => {
    logger.error('Lỗi: ' + (err instanceof Error ? err.message : String(err)));
    process.exit(1);
  });
