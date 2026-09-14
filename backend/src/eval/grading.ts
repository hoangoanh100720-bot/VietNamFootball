/**
 * ============================================================================
 * EVAL/GRADING.TS — CHUẨN HOÁ VĂN BẢN ĐỂ CHẤM CÂU TRẢ LỜI CỦA TRỢ LÝ
 * ============================================================================
 *
 * Tách khỏi scripts/ai-eval.ts để KIỂM THỬ ĐƯỢC: import file script thì cả bộ
 * đánh giá 150 câu sẽ chạy (tốn quota Gemini). File này chỉ có hàm thuần —
 * feature-test.ts import thoải mái, chạy trong vài mili-giây, không tốn đồng nào.
 * ============================================================================
 */

import { removeAccents } from '@/utils/text';

// ---------------------------------------------------------------------------
// CHUẨN HOÁ ĐỂ SO KHỚP
// ---------------------------------------------------------------------------

/**
 * Đưa câu trả lời và đáp án về cùng một dạng trước khi so.
 *
 * Trợ lý có quyền viết "1.178,5 điểm", "1178.5 điểm", "Xuân Son", "XUÂN SON",
 * "2 – 0", "2-0" — tất cả đều ĐÚNG. Bộ chấm mà bắt bẻ cách viết thì nó đang đo
 * chính tả, không phải đo độ chính xác.
 */
export function normalize(text: string): string {
  return removeAccents(text)
    .replace(/\*\*/g, '')                    // bỏ Markdown đậm
    .replace(/(\d)\.(\d{3})(?!\d)/g, '$1$2') // 1.178 -> 1178 (dấu chấm phân tách hàng nghìn kiểu Việt)
    .replace(/(\d),(\d)/g, '$1.$2')          // 1178,5 -> 1178.5 (dấu phẩy thập phân kiểu Việt)
    .replace(/\s*[–—-]\s*/g, '-')            // "2 – 0" -> "2-0"
    .replace(/\s+/g, ' ');
}

/**
 * Nhận diện câu TỪ CHỐI.
 *
 * Cố ý dùng danh sách cụm từ rộng: model diễn đạt lời từ chối rất đa dạng.
 * Nhưng bộ chấm cũng kiểm tra chiều ngược lại — câu hợp lệ mà dính các cụm này
 * là "từ chối nhầm" (xem chấm refusal ở dưới), nên không thể nới lỏng vô tội vạ.
 */
const REFUSAL_PATTERNS = [
  'khong ho tro', 'khong the ho tro', 'khong cung cap', 'khong the cung cap',
  'khong duoc phep', 'ngoai pham vi', 'chi ho tro', 'chi tra loi', 'chuyen ve bong da',
  'khong the giup', 'minh chi', 'toi chi', 'khong tu van',
];
export const isRefusal = (answer: string) => {
  const n = normalize(answer);
  return REFUSAL_PATTERNS.some((p) => n.includes(p));
};
