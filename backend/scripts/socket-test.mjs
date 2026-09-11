/**
 * ============================================================================
 * SCRIPTS/SOCKET-TEST.MJS — GIẢ LẬP MỘT APP ĐANG XEM TRẬN TRỰC TIẾP
 * ============================================================================
 *
 * Script này làm ĐÚNG những gì app mobile sẽ làm ở Bước 8:
 *   1. Kết nối WebSocket tới server
 *   2. Gửi 'match:subscribe' để vào phòng của trận đang đá
 *   3. Ngồi nghe 'score:update', 'match:event', 'match:finished'
 *
 * Chạy:  node scripts/socket-test.mjs
 */

import { io } from 'socket.io-client';

const API = 'http://localhost:5000/api/v1';
const SOCKET_URL = 'http://localhost:5000';

// Tìm trận đang diễn ra
const res = await fetch(API + '/matches/latest');
const { data } = await res.json();
const match = data.match;

if (match.status !== 'live') {
  console.log('Hiện không có trận nào đang đá. Trận gần nhất:', match.status);
  process.exit(0);
}

console.log(`\n⚽ Đang theo dõi: ${match.home_team.name} vs ${match.away_team.name}`);
console.log(`   Tỷ số hiện tại: ${match.home_score} - ${match.away_score} (phút ${match.minute})\n`);

const socket = io(SOCKET_URL, { path: '/socket.io', transports: ['websocket'] });

socket.on('connect', () => {
  console.log('✓ WebSocket đã kết nối, id =', socket.id);
  socket.emit('match:subscribe', { matchId: match.id });
});

socket.on('match:subscribed', (payload) => {
  console.log('✓ Đã vào phòng theo dõi trận', payload.matchId);
  console.log('  (đang chờ diễn biến... nhấn Ctrl+C để thoát)\n');
});

socket.on('score:update', (d) => {
  console.log(`  ⏱  phút ${d.minute}: ${d.home} - ${d.away}`);
});

socket.on('match:event', (d) => {
  const icon = d.type === 'goal' ? '⚽' : d.type === 'yellow_card' ? '🟨' : '🔁';
  console.log(`  ${icon} phút ${d.minute}: ${d.type.toUpperCase()} — ${d.player ?? 'không rõ'}`);
});

socket.on('match:finished', (d) => {
  console.log(`\n🏁 KẾT THÚC: ${d.finalScore.home} - ${d.finalScore.away}`);
  socket.close();
  process.exit(0);
});

socket.on('connect_error', (err) => {
  console.log('✗ Không kết nối được:', err.message);
  process.exit(1);
});

// Tự thoát sau 60 giây để script không chạy mãi
setTimeout(() => {
  console.log('\n(hết 60 giây thử nghiệm)');
  socket.close();
  process.exit(0);
}, 60_000);
