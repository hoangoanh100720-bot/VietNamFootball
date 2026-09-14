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
import { searchRouter } from '@/modules/search/search.route';
import { teamRouter } from '@/modules/team/team.route';
import { ratingsRouter } from '@/modules/ratings/ratings.route';
import { chatRouter } from '@/modules/chat/chat.route';
import { statsRouter } from '@/modules/stats/stats.route';
import { competitionsRouter } from '@/modules/competitions/competitions.route';
import { squadsRouter } from '@/modules/squads/squads.route';
import { themesRouter } from '@/modules/themes/themes.route';

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
apiRouter.use('/team', teamRouter);       // hồ sơ đội tuyển + tủ danh hiệu (Tab Giới thiệu)
apiRouter.use('/ratings', ratingsRouter); // điểm cầu thủ + bảng giải thích 'Vì sao 8.3?'
apiRouter.use('/stats', statsRouter);     // Tab 5: trận vừa đá, BXH cầu thủ, các trận đã đá
apiRouter.use('/competitions', competitionsRouter); // giải đấu + BXH bảng đấu
apiRouter.use('/squads', squadsRouter);   // danh sách TRIỆU TẬP (khác /squad = đội hình ra sân)
apiRouter.use('/themes', themesRouter);   // giao diện theo sự kiện: Tết, 2/9, Đi bão…
apiRouter.use('/chat', chatRouter);       // ⭐ trợ lý AI 'Hỏi đáp Đội tuyển' (cần đăng nhập)
apiRouter.use('/search', searchRouter);   // tìm kiếm lai: vector + từ khoá trên kho tri thức
apiRouter.use('/devices', devicesRouter); // đăng ký thiết bị nhận thông báo (cần đăng nhập)
