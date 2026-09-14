/**
 * ============================================================================
 * SCRIPTS/FEATURE-TEST.TS — KIỂM THỬ LOGIC THUẦN CỦA CÁC TÍNH NĂNG MỚI
 * ============================================================================
 *
 * Chạy:  cd backend && npm run test:features
 *
 * ⚡ KHÔNG CẦN SERVER, KHÔNG CẦN DATABASE — chỉ test HÀM THUẦN:
 *
 *   themes        — độ tương phản WCAG, lọc token, lịch "Đi bão/Tiếp lửa"
 *   stats         — kết quả nhìn từ phía Việt Nam, cursor phân trang
 *   competitions  — câu tóm tắt Senior mode
 *
 * Mỗi hàm được tách thành hàm thuần CHÍNH LÀ để test được như thế này.
 * Logic chạm database (truy vấn SQL) được kiểm bằng smoke-test.mjs qua API thật.
 *
 * Kiểu "test dạng bảng" giống rating-test.mjs: thêm trường hợp = thêm một dòng.
 * ============================================================================
 */

import {
  contrastRatio,
  pickThemable,
  planResultTheme,
  validatePalette,
} from '@/modules/themes/themes.service';
import { decodeCursor, encodeCursor, resultForVietnam } from '@/modules/stats/stats.service';
import { describeVietnamPosition, type StandingRow } from '@/modules/competitions/competitions.service';
import { THEMES } from '@/db/seeds/featureData';
import { EVAL_CASES } from '@/eval/questions';
import { isRefusal, normalize } from '@/eval/grading';
import { isBettingQuestion } from '@/services/chat/chat.service';

let passed = 0;
let failed = 0;

function check(name: string, ok: boolean, detail = '') {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}${detail ? '  ' + detail : ''}`);
  } else {
    failed++;
    console.log(`  ✗ ${name}${detail ? '  ' + detail : ''}`);
  }
}

const near = (a: number, b: number, eps = 0.05) => Math.abs(a - b) <= eps;

// ===========================================================================
console.log('\n■ ĐỘ TƯƠNG PHẢN WCAG');
// ===========================================================================
/**
 * Giá trị chuẩn lấy từ công cụ WebAIM Contrast Checker — nguồn đối chiếu độc
 * lập, không phải tự tính bằng chính hàm đang test (test như vậy là vô nghĩa).
 */
const CONTRAST_CASES: Array<[string, string, number]> = [
  ['#000000', '#FFFFFF', 21],    // cực đại
  ['#FFFFFF', '#FFFFFF', 1],     // cực tiểu
  ['#767676', '#FFFFFF', 4.54],  // xám "vừa đủ AA" nổi tiếng
  ['#FFFFFF', '#DA251D', 4.93],  // chữ trắng trên đỏ cờ
];
for (const [fg, bg, expected] of CONTRAST_CASES) {
  const ratio = contrastRatio(fg, bg);
  check(`${fg} trên ${bg} ≈ ${expected}`, near(ratio, expected), `(đo được ${ratio.toFixed(2)})`);
}
check('Đổi thứ tự hai màu cho cùng kết quả', contrastRatio('#DA251D', '#FFFFFF') === contrastRatio('#FFFFFF', '#DA251D'));

// ===========================================================================
console.log('\n■ DANH SÁCH TRẮNG TOKEN');
// ===========================================================================
const picked = pickThemable({
  accent: '#DA251D',
  bg: '#000000',          // ❌ không được ghi đè nền
  text: '#FF0000',        // ❌ không được ghi đè chữ
  win: '#123456',         // ❌ không được đổi màu "thắng"
  gold: 'red',            // ❌ không phải mã HEX
  accentText: '#B80F17',
});
check('Giữ accent + accentText', picked.accent === '#DA251D' && picked.accentText === '#B80F17');
check('Loại bỏ bg, text, win', !('bg' in picked) && !('text' in picked) && !('win' in picked));
check('Loại bỏ giá trị không phải HEX', !('gold' in picked));

// ===========================================================================
console.log('\n■ KIỂM TRA PALETTE KHI ADMIN TẠO THEME');
// ===========================================================================
check(
  'Palette tốt -> không lỗi',
  validatePalette(
    { accent: '#B80F17', accentText: '#B80F17' },
    { accent: '#B80F17', accentText: '#FF5A4F' }
  ).length === 0
);
const bad = validatePalette(
  { accent: '#FFCD00', accentText: '#FFCD00' },  // vàng trên nền giấy -> không đọc được
  { accent: '#DA251D', accentText: '#3A0000' }   // đỏ sẫm trên nền tối -> không đọc được
);
check('Vàng trên nền sáng bị từ chối', bad.some((i) => i.mode === 'light' && i.pair === 'accentText / bg'));
check('Chữ trắng trên nút vàng bị từ chối', bad.some((i) => i.mode === 'light' && i.pair === 'accentFg / accent'));
check('Đỏ sẫm trên nền tối bị từ chối', bad.some((i) => i.mode === 'dark' && i.pair === 'accentText / bg'));
check('Lỗi kèm tỷ lệ đo được', bad.every((i) => typeof i.ratio === 'number' && i.ratio < 4.5));

/**
 * ⭐ KIỂM TRA CHÍNH DỮ LIỆU SEED — chạy cùng luật với admin.
 *
 * Theme seed được nhập tay, không đi qua endpoint POST /themes, nên chưa từng
 * được kiểm tra tương phản. Test này bắt đúng loại lỗi đó.
 */
for (const theme of THEMES) {
  const issues = validatePalette(theme.palette_light, theme.palette_dark);
  check(
    `Theme seed "${theme.code}" đủ tương phản`,
    issues.length === 0,
    issues.map((i) => `${i.mode} ${i.pair}=${i.ratio}`).join('; ')
  );
}

// ===========================================================================
console.log('\n■ LỊCH THEME PHẢN ỨNG SAU TRẬN');
// ===========================================================================
const t0 = new Date('2026-09-20T14:30:00Z');
const hoursOf = (p: ReturnType<typeof planResultTheme>) =>
  p ? (p.endAt.getTime() - p.startAt.getTime()) / 3600000 : null;

const win = planResultTheme('win', false, t0);
check('Thắng -> Đi bão 24 giờ, ưu tiên 80', win?.code === 'victory' && hoursOf(win) === 24 && win.priority === 80);

const champ = planResultTheme('win', true, t0);
check('Vô địch -> Đi bão 72 giờ, ưu tiên 100', champ?.code === 'victory' && hoursOf(champ) === 72 && champ.priority === 100);

const lose = planResultTheme('lose', false, t0);
check('Thua -> Tiếp lửa 12 giờ', lose?.code === 'keep-fire' && hoursOf(lose) === 12);

const loseFinal = planResultTheme('lose', true, t0);
check('Thua chung kết vẫn ưu tiên 80 (không "vô địch")', loseFinal?.priority === 80);

check('Hoà -> không đổi theme', planResultTheme('draw', false, t0) === null);

// ===========================================================================
console.log('\n■ KẾT QUẢ NHÌN TỪ PHÍA VIỆT NAM');
// ===========================================================================
const RESULT_CASES: Array<[number, number, boolean, 'win' | 'draw' | 'lose', string]> = [
  [2, 1, true, 'win', 'Sân nhà thắng 2-1'],
  [1, 2, false, 'win', '⭐ Sân khách thắng 1-2 (dễ viết ngược)'],
  [2, 1, false, 'lose', 'Sân khách thua 2-1'],
  [0, 3, true, 'lose', 'Sân nhà thua 0-3'],
  [1, 1, true, 'draw', 'Hoà 1-1'],
];
for (const [h, a, home, expected, name] of RESULT_CASES) {
  check(name, resultForVietnam(h, a, home) === expected);
}

// ===========================================================================
console.log('\n■ CURSOR PHÂN TRANG');
// ===========================================================================
const cursor = encodeCursor('2026-09-09T12:30:00.000Z', 12);
const back = decodeCursor(cursor);
check('Mã hoá rồi giải mã ra đúng giá trị', back?.kickoffAt === '2026-09-09T12:30:00.000Z' && back.id === 12);
check('Cursor là chuỗi an toàn cho URL', /^[A-Za-z0-9_-]+$/.test(cursor));
check('Cursor rác -> null, không ném lỗi', decodeCursor('không-phải-cursor!!') === null);
check("Cursor thiếu id -> null", decodeCursor(Buffer.from('2026-01-01').toString('base64url')) === null);
check(
  'Cursor giả mạo chứa SQL -> null',
  decodeCursor(Buffer.from("x' OR 1=1 --|5").toString('base64url')) === null
);

// ===========================================================================
console.log('\n■ CÂU TÓM TẮT BXH (Senior mode)');
// ===========================================================================
const row = { position: 2, points: 6, played: 3 } as StandingRow;
check(
  'Có bảng',
  describeVietnamPosition('Bảng B', row) === 'Việt Nam đang đứng thứ 2 bảng B với 6 điểm sau 3 trận.'
);
check(
  'Giải không chia bảng',
  describeVietnamPosition('', row) === 'Việt Nam đang đứng thứ 2 với 6 điểm sau 3 trận.'
);
check('Việt Nam không có trong bảng -> null', describeVietnamPosition('Bảng B', undefined) === null);

// ===========================================================================
console.log('\n■ NGÂN HÀNG CÂU HỎI ĐÁNH GIÁ AI (mục 10.7) — kiểm tra miễn phí');
// ===========================================================================
check(`Đúng 150 câu`, EVAL_CASES.length === 150, `(có ${EVAL_CASES.length})`);
check('Không trùng id', new Set(EVAL_CASES.map((c) => c.id)).size === EVAL_CASES.length);

/**
 * ⭐ LỚP LỌC CÁ CƯỢC — hai chiều, không tốn lượt gọi model nào:
 *   • mọi câu gắn cờ blocked PHẢI bị isBettingQuestion() bắt
 *   • KHÔNG câu hợp lệ nào (câu có công cụ kỳ vọng) bị bắt nhầm
 * Chiều thứ hai quan trọng không kém: thêm từ khoá "bet" vào danh sách chặn
 * nghe vô hại, cho tới khi nó chặn luôn một câu hỏi bình thường có chứa "bet".
 */
const blockedCases = EVAL_CASES.filter((c) => c.expect.blocked);
const leaked = blockedCases.filter((c) => !isBettingQuestion(c.question));
check(`${blockedCases.length} câu bẫy có từ khoá đều bị lớp lọc chặn`, leaked.length === 0, leaked.map((c) => c.question).join(' | '));

const legit = EVAL_CASES.filter((c) => c.expect.tools);
const falseBlocked = legit.filter((c) => isBettingQuestion(c.question));
check(`${legit.length} câu hợp lệ không bị chặn nhầm`, falseBlocked.length === 0, falseBlocked.map((c) => c.question).join(' | '));

check('Chuẩn hoá số kiểu Việt: "1.178,5" = "1178.5"', normalize('1.178,5 điểm') === normalize('1178.5 điểm'));
check('Chuẩn hoá tỷ số: "2 – 0" = "2-0"', normalize('thắng 2 – 0') === 'thang 2-0');
check('Chuẩn hoá bỏ dấu + Markdown: "**Xuân Son**" chứa "xuan son"', normalize('**Xuân Son**').includes('xuan son'));
check('Nhận ra câu từ chối', isRefusal('Mình không hỗ trợ thông tin về cá cược nhé'));
check('Không coi câu trả lời bình thường là từ chối', !isRefusal('Việt Nam đang xếp hạng 109 FIFA'));

// ===========================================================================
console.log(`\n═══ KẾT QUẢ: ${passed} đạt, ${failed} lỗi ═══\n`);
process.exit(failed > 0 ? 1 : 0);
