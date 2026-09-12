/**
 * ============================================================================
 * SCRIPTS/RATING-TEST.MJS — KIỂM THỬ ENGINE CHẤM ĐIỂM CẦU THỦ
 * ============================================================================
 *
 * Chạy:  cd backend && npm run test:rating
 *
 * ⚡ KHÔNG CẦN SERVER, KHÔNG CẦN DATABASE.
 * Engine là HÀM THUẦN (xem services/rating/engine.ts) — đưa object vào, nhận
 * kết quả ra. Đó chính là lý do viết nó thành hàm thuần ngay từ đầu: test chạy
 * trong một phần nghìn giây thay vì phải dựng cả hệ thống.
 *
 * ----------------------------------------------------------------------------
 * 📋 KIỂU TEST Ở ĐÂY GỌI LÀ "TEST DẠNG BẢNG" (table-driven test)
 *
 * Thay vì viết 20 hàm test na ná nhau, ta khai một MẢNG các trường hợp rồi
 * chạy vòng lặp. Thêm trường hợp mới = thêm một dòng.
 *
 * Đặc tả (ARCHITECTURE.md mục 12.2) yêu cầu MỖI DÒNG trong bảng quy tắc phải
 * có test riêng — và đó đúng là thứ file này làm.
 * ============================================================================
 */

import { rate, pickManOfTheMatch } from '../dist/services/rating/engine.js';

// ---------------------------------------------------------------------------
// BỘ QUY TẮC DÙNG CHO TEST — khớp với RATING_RULESET trong db/seeds/featureData.ts
// ---------------------------------------------------------------------------
const RULESET = {
  version: '2026.1-test',
  rules: {
    base: 6.0,
    clamp: [3.0, 10.0],
    min_minutes: 10,
    positions: ['GK', 'DF', 'MF', 'FW'],
    per_event: {
      goal: [1.5, 1.3, 1.1, 1.0],
      assist: [0.8, 0.8, 0.8, 0.8],
      key_pass: [0.2, 0.2, 0.2, 0.2],
      shot_on_target: [0, 0.1, 0.1, 0.1],
      tackle_interception: [0, 0.15, 0.1, 0.05],
      save: [0.3, 0, 0, 0],
      penalty_saved: [1.5, 0, 0, 0],
      clean_sheet_60min: [1.0, 0.8, 0.3, 0],
      goal_conceded: [-0.3, -0.2, 0, 0],
      yellow_card: [-0.5, -0.5, -0.5, -0.5],
      red_card: [-1.5, -1.5, -1.5, -1.5],
      own_goal: [-1.0, -1.0, -1.0, -1.0],
      missed_penalty: [-1.0, -1.0, -1.0, -1.0],
      team_win: [0.3, 0.3, 0.3, 0.3],
      team_lose: [-0.2, -0.2, -0.2, -0.2],
    },
  },
};

/** Số liệu mặc định: đá 90 phút, không làm gì cả -> đúng 6.0 điểm */
const BLANK = { minutes_played: 90, goals: 0, assists: 0 };

/**
 * Bối cảnh mặc định: HOÀ 1-1, trận đã xong.
 *
 * ⚠️ VÌ SAO 1-1 CHỨ KHÔNG PHẢI 0-0? Đây là lỗi tôi đã mắc khi viết file này
 * lần đầu, và 18/44 trường hợp test sai vì nó.
 *
 * Với 0-0 thì `opponent_goals === 0` -> engine cộng "giữ sạch lưới" cho MỌI
 * cầu thủ (+1.0 GK / +0.8 DF / +0.3 MF). Thế là mọi phép thử đều lệch, và
 * nhìn vào chỉ thấy "engine sai" trong khi engine hoàn toàn đúng.
 *
 * 1-1 cho ra mốc chuẩn SẠCH: không giữ sạch lưới, không thắng, không thua
 * -> cầu thủ không làm gì đúng bằng 6.0 điểm.
 *
 * 👉 Bài học chung khi viết test: giá trị mặc định phải TRUNG TÍNH tuyệt đối.
 *    Một mặc định vô tình kích hoạt luật nào đó sẽ làm hỏng cả bộ test, và
 *    tệ hơn là khiến ta đi sửa code vốn đang đúng.
 */
const DRAW = { team_goals: 1, opponent_goals: 1, is_finished: true };

/** Bối cảnh 0-0: dùng riêng cho nhóm test "giữ sạch lưới" */
const CLEAN_SHEET = { team_goals: 0, opponent_goals: 0, is_finished: true };

let passed = 0;
let failed = 0;

/**
 * So kết quả engine với điểm mong đợi.
 *
 * In luôn phép tính khi SAI, để biết ngay dòng nào lệch mà không phải mở
 * debugger — với 20 trường hợp thì điều đó tiết kiệm rất nhiều thời gian.
 */
function expectRating(label, stats, position, context, expected) {
  const result = rate({ ...BLANK, ...stats }, position, { ...DRAW, ...context }, RULESET);

  if (result.rating === expected) {
    console.log(`  ✓ ${label}  = ${expected}`);
    passed++;
  } else {
    console.log(`  ✗ ${label}  nhận ${result.rating}, mong đợi ${expected}`);
    console.log(
      '      phép tính: ' +
        result.breakdown.map((b) => `${b.label} ${b.points > 0 ? '+' : ''}${b.points}`).join('  ')
    );
    failed++;
  }
}

console.log('\n═══ KIỂM THỬ ENGINE CHẤM ĐIỂM CẦU THỦ ═══\n');

// ---------------------------------------------------------------------------
console.log('■ ĐIỂM KHỞI ĐẦU & NGƯỠNG SỐ PHÚT');

expectRating('Đá 90 phút, không làm gì', {}, 'MF', {}, 6.0);

// Đá dưới 10 phút -> KHÔNG chấm (app hiện "–")
{
  const r = rate({ ...BLANK, minutes_played: 5 }, 'FW', DRAW, RULESET);
  if (r.rating === null && r.skip_reason) {
    console.log(`  ✓ Đá 5 phút -> không chấm (${r.skip_reason})`);
    passed++;
  } else {
    console.log(`  ✗ Đá 5 phút -> lẽ ra phải là null, nhận ${r.rating}`);
    failed++;
  }
}

// Đúng ngưỡng 10 phút -> VẪN chấm (biên phải bao gồm)
expectRating('Đá đúng 10 phút -> có chấm', { minutes_played: 10 }, 'MF', {}, 6.0);

// ---------------------------------------------------------------------------
console.log('\n■ BÀN THẮNG — hệ số khác nhau theo vị trí');

expectRating('Thủ môn ghi 1 bàn  (+1.5)', { goals: 1 }, 'GK', {}, 7.5);
expectRating('Hậu vệ ghi 1 bàn   (+1.3)', { goals: 1 }, 'DF', {}, 7.3);
expectRating('Tiền vệ ghi 1 bàn  (+1.1)', { goals: 1 }, 'MF', {}, 7.1);
expectRating('Tiền đạo ghi 1 bàn (+1.0)', { goals: 1 }, 'FW', {}, 7.0);
expectRating('Tiền đạo ghi 2 bàn (+2.0)', { goals: 2 }, 'FW', {}, 8.0);

// ---------------------------------------------------------------------------
console.log('\n■ KIẾN TẠO & ĐÓNG GÓP TẤN CÔNG');

expectRating('1 kiến tạo (+0.8)', { assists: 1 }, 'MF', {}, 6.8);
expectRating('2 đường chuyền quyết định (+0.4)', { key_passes: 2 }, 'MF', {}, 6.4);
expectRating('3 cú sút trúng đích (+0.3)', { shots_on_target: 3 }, 'FW', {}, 6.3);
expectRating('Thủ môn sút trúng đích -> hệ số 0', { shots_on_target: 3 }, 'GK', {}, 6.0);

// ---------------------------------------------------------------------------
console.log('\n■ TẮC BÓNG / CẮT BÓNG — gộp hai chỉ số làm một');

expectRating('Hậu vệ: 2 tắc + 2 cắt = 4 × 0.15', { tackles: 2, interceptions: 2 }, 'DF', {}, 6.6);
expectRating('Tiền vệ: 4 pha × 0.1', { tackles: 4 }, 'MF', {}, 6.4);
expectRating('Tiền đạo: 4 pha × 0.05', { interceptions: 4 }, 'FW', {}, 6.2);

// ---------------------------------------------------------------------------
console.log('\n■ THỦ MÔN');

expectRating('5 pha cứu thua (+1.5)', { saves: 5 }, 'GK', {}, 7.5);
expectRating('Cản 1 phạt đền (+1.5)', { penalties_saved: 1 }, 'GK', {}, 7.5);
expectRating('Hậu vệ "cứu thua" -> hệ số 0', { saves: 5 }, 'DF', {}, 6.0);

// ---------------------------------------------------------------------------
console.log('\n■ GIỮ SẠCH LƯỚI — cần ĐỦ HAI điều kiện');

expectRating('GK sạch lưới, đá 90 phút (+1.0)', {}, 'GK', CLEAN_SHEET, 7.0);
expectRating('DF sạch lưới, đá 90 phút (+0.8)', {}, 'DF', CLEAN_SHEET, 6.8);
expectRating('MF sạch lưới, đá 90 phút (+0.3)', {}, 'MF', CLEAN_SHEET, 6.3);
expectRating('FW sạch lưới -> hệ số 0', {}, 'FW', CLEAN_SHEET, 6.0);

// Vào sân phút 85 -> KHÔNG được cộng giữ sạch lưới
expectRating(
  'GK chỉ đá 30 phút -> KHÔNG cộng sạch lưới',
  { minutes_played: 30 },
  'GK',
  CLEAN_SHEET,
  6.0
);

// Trận CHƯA kết thúc -> chưa cộng, vì phút sau có thể thủng lưới
expectRating(
  'Trận đang đá -> chưa cộng sạch lưới',
  {},
  'GK',
  { team_goals: 0, opponent_goals: 0, is_finished: false },
  6.0
);

// ---------------------------------------------------------------------------
console.log('\n■ ĐIỂM TRỪ');

expectRating('GK thủng 2 bàn (−0.6)', { goals_conceded: 2 }, 'GK', {}, 5.4);
expectRating('DF thủng 2 bàn (−0.4)', { goals_conceded: 2 }, 'DF', {}, 5.6);
expectRating('MF thủng 2 bàn -> hệ số 0', { goals_conceded: 2 }, 'MF', {}, 6.0);
expectRating('1 thẻ vàng (−0.5)', { yellow_cards: 1 }, 'MF', {}, 5.5);
expectRating('Phản lưới nhà (−1.0)', { own_goals: 1 }, 'DF', {}, 5.0);
expectRating('Đá hỏng phạt đền (−1.0)', { missed_penalties: 1 }, 'FW', {}, 5.0);

/**
 * ⚠️ TRƯỜNG HỢP QUAN TRỌNG NHẤT TRONG CẢ FILE NÀY.
 *
 * Nhà cung cấp dữ liệu ghi thẻ đỏ gián tiếp thành: 2 thẻ vàng + 1 thẻ đỏ.
 * Cộng máy móc sẽ ra −0.5×2 − 1.5 = −2.5, trong khi đặc tả nói TỔNG TRỪ TỐI ĐA
 * là −1.5 cho phần thẻ đỏ.
 *
 * Engine dùng Math.min(1, red_cards) nên thẻ đỏ chỉ trừ MỘT lần.
 * Kết quả đúng: 6.0 − 0.5×2 − 1.5 = 3.5
 */
expectRating(
  '2 thẻ vàng + 1 thẻ đỏ -> thẻ đỏ chỉ trừ 1 lần',
  { yellow_cards: 2, red_cards: 1 },
  'MF',
  {},
  3.5
);

// ---------------------------------------------------------------------------
console.log('\n■ THẮNG / THUA');

expectRating('Đội thắng (+0.3)', {}, 'MF', { team_goals: 2, opponent_goals: 1 }, 6.3);
expectRating('Đội thua (−0.2)', {}, 'MF', { team_goals: 0, opponent_goals: 1 }, 5.8);
expectRating('Hoà -> không cộng không trừ', {}, 'MF', { team_goals: 1, opponent_goals: 1 }, 6.0);
expectRating(
  'Trận chưa xong -> chưa tính thắng/thua',
  {},
  'MF',
  { team_goals: 2, opponent_goals: 1, is_finished: false },
  6.0
);

// ---------------------------------------------------------------------------
console.log('\n■ KẸP ĐIỂM VÀO KHOẢNG [3.0 ; 10.0]');

// 6.0 + 5 bàn × 1.0 = 11.0 -> phải bị kẹp xuống 10.0
expectRating('Ghi 5 bàn -> trần 10.0', { goals: 5 }, 'FW', {}, 10.0);
// 6.0 − 3 phản lưới − 1 thẻ đỏ = 1.5 -> phải bị kẹp lên 3.0
expectRating('3 phản lưới + thẻ đỏ -> sàn 3.0', { own_goals: 3, red_cards: 1 }, 'DF', {}, 3.0);

// ---------------------------------------------------------------------------
console.log('\n■ VÍ DỤ TRONG ĐẶC TẢ (ARCHITECTURE.md mục 12.2)');

/**
 * Tiến Linh — Tiền đạo, đá 67 phút, Việt Nam thắng 2–1:
 *   6.0 khởi đầu
 *   + 2 bàn × 1.0        = +2.0
 *   + 1 chuyền quyết định= +0.2
 *   + 3 sút trúng × 0.1  = +0.3
 *   + đội thắng          = +0.3
 *   − thẻ vàng           = −0.5
 *   ────────────────────────────
 *                          8.3
 */
expectRating(
  'Tiến Linh: 2 bàn, 1 chuyền QĐ, 3 sút, thẻ vàng, thắng',
  { minutes_played: 67, goals: 2, key_passes: 1, shots_on_target: 3, yellow_cards: 1 },
  'FW',
  { team_goals: 2, opponent_goals: 1 },
  8.3
);

// ---------------------------------------------------------------------------
console.log('\n■ BẢNG GIẢI THÍCH ĐIỂM ("Vì sao 8.3?")');

{
  const r = rate(
    { ...BLANK, minutes_played: 67, goals: 2, key_passes: 1, shots_on_target: 3, yellow_cards: 1 },
    'FW',
    { team_goals: 2, opponent_goals: 1, is_finished: true },
    RULESET
  );

  // Tổng các dòng PHẢI đúng bằng điểm cuối — nếu không, người dùng cộng tay
  // lại sẽ ra số khác và mất niềm tin vào cả bảng.
  const sum = Math.round(r.breakdown.reduce((s, b) => s + b.points, 0) * 10) / 10;

  if (sum === r.rating) {
    console.log(`  ✓ Tổng ${r.breakdown.length} dòng = ${sum} = điểm cuối cùng`);
    passed++;
  } else {
    console.log(`  ✗ Tổng các dòng = ${sum} nhưng điểm cuối = ${r.rating}`);
    failed++;
  }

  // Không được hiện dòng có 0 điểm (ví dụ "0 kiến tạo")
  const zeroRows = r.breakdown.filter((b) => b.points === 0);
  if (zeroRows.length === 0) {
    console.log('  ✓ Không có dòng thừa nào bằng 0 điểm');
    passed++;
  } else {
    console.log(`  ✗ Có ${zeroRows.length} dòng bằng 0: ${zeroRows.map((b) => b.label).join(', ')}`);
    failed++;
  }

  console.log('\n    Bảng giải thích cho 8.3:');
  for (const b of r.breakdown) {
    const dau = b.points > 0 ? '+' : '';
    const soLan = b.count > 1 ? ` ×${b.count}` : '';
    console.log(`      ${b.label}${soLan}`.padEnd(38) + `${dau}${b.points}`);
  }
}

// ---------------------------------------------------------------------------
console.log('\n■ CẦU THỦ XUẤT SẮC NHẤT TRẬN (MOTM)');

{
  const motm = pickManOfTheMatch([
    { player_id: 1, rating: 7.5, minutes_played: 90, is_winner: true },
    { player_id: 2, rating: 8.3, minutes_played: 67, is_winner: true },
    { player_id: 3, rating: 8.0, minutes_played: 90, is_winner: false },
  ]);
  check(motm === 2, `Điểm cao nhất thắng (chọn #2, 8.3 điểm)`, `chọn nhầm #${motm}`);
}

{
  // Bằng điểm -> ưu tiên cầu thủ ĐỘI THẮNG
  const motm = pickManOfTheMatch([
    { player_id: 1, rating: 8.0, minutes_played: 90, is_winner: false },
    { player_id: 2, rating: 8.0, minutes_played: 90, is_winner: true },
  ]);
  check(motm === 2, 'Bằng điểm -> ưu tiên đội thắng (chọn #2)', `chọn nhầm #${motm}`);
}

{
  // Bằng điểm, cùng đội thắng -> ưu tiên người đá NHIỀU PHÚT hơn
  const motm = pickManOfTheMatch([
    { player_id: 1, rating: 8.0, minutes_played: 45, is_winner: true },
    { player_id: 2, rating: 8.0, minutes_played: 90, is_winner: true },
  ]);
  check(motm === 2, 'Bằng điểm + cùng đội -> ưu tiên nhiều phút hơn (chọn #2)', `chọn nhầm #${motm}`);
}

{
  // Không ai đủ điều kiện chấm -> không có MOTM
  const motm = pickManOfTheMatch([
    { player_id: 1, rating: null, minutes_played: 5, is_winner: true },
  ]);
  check(motm === null, 'Không ai đủ điều kiện -> không có MOTM', `trả về #${motm}`);
}

function check(condition, okLabel, failLabel) {
  if (condition) {
    console.log(`  ✓ ${okLabel}`);
    passed++;
  } else {
    console.log(`  ✗ ${okLabel} — ${failLabel}`);
    failed++;
  }
}

// ---------------------------------------------------------------------------
console.log(`\n═══ KẾT QUẢ: ${passed} đạt, ${failed} lỗi ═══\n`);
process.exit(failed > 0 ? 1 : 0);
