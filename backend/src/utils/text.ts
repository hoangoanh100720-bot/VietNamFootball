/**
 * ============================================================================
 * UTILS/TEXT.TS — XỬ LÝ VĂN BẢN TIẾNG VIỆT CHO TÌM KIẾM & RAG
 * ============================================================================
 *
 * Bốn việc nhỏ nhưng quyết định chất lượng tìm kiếm:
 *   1. removeAccents() — bỏ dấu, để gõ "tien linh" vẫn ra "Tiến Linh"
 *   2. chunkText()     — cắt tài liệu dài thành đoạn vừa đủ để nhúng vector
 *   3. hashContent()   — băm nội dung, biết trang có thay đổi hay không
 *   4. cleanWhitespace() — dọn khoảng trắng rác sau khi bóc từ HTML
 * ============================================================================
 */

import crypto from 'crypto';

// ---------------------------------------------------------------------------
// 1. BỎ DẤU TIẾNG VIỆT
// ---------------------------------------------------------------------------

/**
 * Chuyển "Nguyễn Tiến Linh" -> "nguyen tien linh".
 *
 * 🔬 CƠ CHẾ HOẠT ĐỘNG (đáng hiểu, vì đây là mẹo kinh điển):
 *
 * Unicode lưu chữ "ế" theo hai cách:
 *   • NFC (dạng gộp)  : một ký tự duy nhất U+1EBF
 *   • NFD (dạng tách) : "e" + dấu mũ (U+0302) + dấu sắc (U+0301)
 *
 * normalize('NFD') ép về dạng TÁCH, sau đó ta xoá toàn bộ ký tự thuộc nhóm
 * "dấu thanh kết hợp" (̀-ͯ) là còn lại chữ cái trần.
 *
 * ⚠️ MỘT NGOẠI LỆ PHẢI XỬ LÝ TAY: chữ "đ" / "Đ".
 * Nó KHÔNG phải "d" + dấu, mà là một chữ cái riêng trong bảng mã Unicode —
 * NFD không tách nó ra được. Quên dòng replace(/đ/g, 'd') là "Đức" biến thành
 * "đuc" và mọi tìm kiếm liên quan sẽ trượt. Đây là lỗi kinh điển khi làm
 * tìm kiếm tiếng Việt.
 */
export function removeAccents(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // xoá mọi dấu thanh/dấu mũ đã tách ra
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
}

/**
 * Dọn khoảng trắng: gộp nhiều dấu cách thành một, gộp quá 2 dòng trống
 * thành đúng 2, cắt khoảng trắng thừa ở đầu/cuối mỗi dòng.
 *
 * VÌ SAO CẦN? Văn bản bóc từ HTML luôn đầy tab, dấu cách và dòng trống do
 * thụt lề của mã nguồn. Với AI, mỗi khoảng trắng thừa vẫn tính là token —
 * tức là tiền. Dọn sạch trước khi gửi đi tiết kiệm được đáng kể.
 */
export function cleanWhitespace(input: string): string {
  return input
    .replace(/\r\n/g, '\n')
    .replace(/[ \t ]+/g, ' ')     //   = dấu cách cứng &nbsp; của HTML
    .replace(/\n{3,}/g, '\n\n')
    .split('\n')
    .map((line) => line.trim())
    .join('\n')
    .trim();
}

// ---------------------------------------------------------------------------
// 2. CẮT TÀI LIỆU THÀNH ĐOẠN (CHUNKING)
// ---------------------------------------------------------------------------

/**
 * Cắt văn bản dài thành các đoạn có GỐI ĐẦU (overlap).
 *
 * 📏 VÌ SAO PHẢI GỐI ĐẦU?
 * Giả sử cắt đúng giữa câu: "…Tiến Linh ghi bàn ở phút | 87 sau đường chuyền
 * của Quang Hải…". Đoạn 1 mất mất "phút 87", đoạn 2 mất chủ ngữ. Câu hỏi
 * "Tiến Linh ghi bàn phút bao nhiêu?" sẽ không đoạn nào trả lời được.
 *
 * Cho hai đoạn chồng lên nhau RAG_CHUNK_OVERLAP ký tự thì ý nghĩa ở vùng
 * giáp ranh xuất hiện đủ trong cả hai đoạn -> không mất thông tin.
 *
 * 📐 CHIẾN LƯỢC CẮT — ưu tiên theo thứ tự tự nhiên của văn bản:
 *   1. Cắt ở ranh giới ĐOẠN VĂN (\n\n)  — đẹp nhất, giữ trọn ý
 *   2. Không được thì cắt ở cuối CÂU (. ! ?)
 *   3. Cuối cùng mới cắt ở khoảng trắng gần nhất
 * Không bao giờ cắt giữa một từ.
 *
 * @param text     Văn bản đã làm sạch
 * @param size     Độ dài tối đa mỗi đoạn, tính bằng ký tự
 * @param overlap  Số ký tự gối đầu giữa hai đoạn liền kề
 */
export function chunkText(text: string, size: number, overlap: number): string[] {
  const clean = cleanWhitespace(text);

  // Văn bản ngắn hơn một đoạn -> trả về nguyên vẹn, khỏi cắt
  if (clean.length <= size) return clean.length > 0 ? [clean] : [];

  const chunks: string[] = [];
  let start = 0;

  while (start < clean.length) {
    let end = Math.min(start + size, clean.length);

    // Chưa tới cuối văn bản -> tìm chỗ cắt "đẹp" lùi về phía trước
    if (end < clean.length) {
      /**
       * Chỉ tìm chỗ cắt trong 30% CUỐI của đoạn. Nếu tìm trên toàn đoạn,
       * một dấu chấm ở ngay đầu sẽ tạo ra đoạn dài 20 ký tự — vừa lãng phí
       * một lượt gọi API nhúng, vừa cho ra vector gần như vô nghĩa.
       */
      const searchFrom = start + Math.floor(size * 0.7);
      const tail = clean.slice(searchFrom, end);

      const paragraphBreak = tail.lastIndexOf('\n\n');
      const sentenceEnd = Math.max(
        tail.lastIndexOf('. '),
        tail.lastIndexOf('! '),
        tail.lastIndexOf('? '),
        tail.lastIndexOf('.\n')
      );
      const spaceBreak = tail.lastIndexOf(' ');

      if (paragraphBreak > 0) end = searchFrom + paragraphBreak;
      else if (sentenceEnd > 0) end = searchFrom + sentenceEnd + 1; // +1 để giữ lại dấu chấm
      else if (spaceBreak > 0) end = searchFrom + spaceBreak;
    }

    const piece = clean.slice(start, end).trim();
    if (piece.length > 0) chunks.push(piece);

    /**
     * ⭐ ĐIỀU KIỆN DỪNG — DÒNG QUAN TRỌNG NHẤT CỦA CẢ HÀM.
     *
     * Vừa cắt chạm cuối văn bản thì DỪNG HẲN.
     *
     * Thiếu dòng này sinh ra một lỗi rất khó thấy: ở đoạn cuối, `end` luôn
     * bằng clean.length, nên `end - overlap` nhỏ hơn `start`, khiến chốt an
     * toàn bên dưới chỉ đẩy start lên đúng 1 ký tự mỗi vòng — và ta nhận về
     * hàng trăm mẩu vụn gần như trùng nhau.
     *
     * 🐛 LỖI NÀY ĐÃ XẢY RA THẬT khi cào thử: một trang 5.612 ký tự sinh ra
     * 205 đoạn thay vì 5. Mỗi mẩu vụn là một lượt gọi API nhúng vector —
     * tức là đốt sạch quota mà chẳng thu được gì.
     */
    if (end >= clean.length) break;

    /**
     * Điểm bắt đầu đoạn kế tiếp = điểm kết thúc đoạn này LÙI LẠI `overlap`.
     *
     * Math.max(..., start + 1) là chốt an toàn chống lặp vô tận, phòng trường
     * hợp `end - overlap` rơi vào vị trí nhỏ hơn hoặc bằng `start`.
     */
    start = Math.max(end - overlap, start + 1);
  }

  return chunks;
}

/**
 * Ước lượng số token của một đoạn văn bản.
 *
 * ⚠️ CHỈ LÀ ƯỚC LƯỢNG, không phải con số chính xác. Muốn chính xác phải gọi
 * API đếm token — mà như thế lại tốn thêm một lượt gọi. Với tiếng Việt,
 * trung bình 1 token ≈ 3 ký tự (tiếng Anh ≈ 4). Đủ dùng để theo dõi chi phí
 * và để cảnh báo khi prompt sắp vượt giới hạn.
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 3);
}

// ---------------------------------------------------------------------------
// 3. BĂM NỘI DUNG
// ---------------------------------------------------------------------------

/**
 * Băm nội dung thành chuỗi 64 ký tự (SHA-256).
 *
 * DÙNG ĐỂ LÀM GÌ? So sánh "trang này có đổi gì không" mà không cần lưu và
 * đối chiếu toàn bộ nội dung cũ. Nội dung đổi dù chỉ một ký tự -> hash khác
 * hoàn toàn. Hash giống nhau -> bỏ qua, tiết kiệm trọn vẹn quota nhúng vector
 * của trang đó.
 *
 * Ta băm bản ĐÃ LÀM SẠCH khoảng trắng: nhiều trang web đổi cách thụt lề HTML
 * sau mỗi lần deploy, nội dung thật không đổi. Băm bản thô sẽ báo "có thay
 * đổi" sai, khiến ta nhúng lại vô ích.
 */
export function hashContent(content: string): string {
  return crypto.createHash('sha256').update(cleanWhitespace(content), 'utf8').digest('hex');
}

// ---------------------------------------------------------------------------
// 4. TIỆN ÍCH CHO TÌM KIẾM
// ---------------------------------------------------------------------------

/**
 * Tách câu truy vấn thành danh sách từ khoá đã bỏ dấu.
 *
 * Bỏ luôn các từ quá ngắn (<= 1 ký tự) và "từ dừng" (stop word) — những từ
 * xuất hiện ở mọi câu nên không giúp phân biệt tài liệu nào liên quan hơn.
 */
const VIETNAMESE_STOP_WORDS = new Set([
  'la', 'va', 'cua', 'co', 'cho', 'trong', 'voi', 'den', 'tu', 'mot', 'nhung',
  'nay', 'do', 'khi', 'duoc', 'cac', 'da', 'se', 'thi', 'ma', 'ra', 've',
  'ai', 'gi', 'nao', 'bao', 'nhieu', 'the', 'nhu', 'hay', 'hoac', 'tai',
]);

export function tokenizeQuery(query: string): string[] {
  return removeAccents(query)
    .replace(/[^a-z0-9\s]/g, ' ') // bỏ dấu câu, giữ chữ và số
    .split(/\s+/)
    .filter((w) => w.length > 1 && !VIETNAMESE_STOP_WORDS.has(w));
}
