/**
 * ============================================================================
 * ROUTES/INDEX.TS — BẢNG PHÂN LUỒNG TRUNG TÂM
 * ============================================================================
 *
 * Router giống một "tổng đài": nhận đường dẫn rồi chuyển tới đúng module.
 *
 *   /api/v1/auth/login      -> module auth
 *   /api/v1/matches/latest  -> module matches
 *
 * Mỗi module tự quản route của mình. File này chỉ gắn tiền tố.
 * Thêm module mới = thêm đúng 2 dòng ở đây.
 */

import { Router } from 'express';
import { authRouter } from '@/modules/auth/auth.route';
import { matchesRouter } from '@/modules/matches/matches.route';
import { squadRouter } from '@/modules/squad/squad.route';
import { coachRouter, playersRouter } from '@/modules/players/players.route';
import { rankingRouter } from '@/modules/ranking/ranking.route';
import { aiRouter } from '@/modules/ai/ai.route';
import { devicesRouter } from '@/modules/devices/devices.route';

export const apiRouter = Router();

/** Endpoint thử nghiệm — gọi để biết API đã chạy chưa */
apiRouter.get('/ping', (_req, res) => {
  res.json({ success: true, data: { message: 'pong', time: new Date().toISOString() } });
});

// ---------------------------------------------------------------------------
// CÁC MODULE
// ---------------------------------------------------------------------------
apiRouter.use('/auth', authRouter);       // đăng ký, đăng nhập, refresh, logout
apiRouter.use('/matches', matchesRouter); // lịch thi đấu, chi tiết, live, H2H
apiRouter.use('/squad', squadRouter);     // đội hình + tổng giá trị
apiRouter.use('/players', playersRouter); // danh sách + chi tiết cầu thủ
apiRouter.use('/coach', coachRouter);     // huấn luyện viên trưởng
apiRouter.use('/ranking', rankingRouter); // bảng xếp hạng FIFA

apiRouter.use('/ai', aiRouter);           // dự đoán Thắng/Hoà/Thua bằng AI
apiRouter.use('/devices', devicesRouter); // đăng ký thiết bị nhận thông báo (cần đăng nhập)
