/**
 * ============================================================================
 * CONFIG/GEMINI.TS — CỬA NGÕ DUY NHẤT ĐỂ GỌI GOOGLE GEMINI
 * ============================================================================
 *
 * 🔐 QUY TẮC BẢO MẬT SỐ 1 CỦA DỰ ÁN:
 * Key Gemini chỉ tồn tại Ở BACKEND. KHÔNG BAO GIỜ gửi xuống app mobile.
 *
 * Vì sao? Mọi thứ nhúng vào app mobile đều đọc được: chỉ cần giải nén file APK
 * là thấy hết chuỗi ký tự bên trong. Key bị lộ nghĩa là người khác gọi Gemini
 * bằng TÀI KHOẢN CỦA BẠN — và bạn trả tiền.
 *
 *   App  --(không có key)-->  Backend của bạn  --(có key)-->  Gemini
 *
 * ----------------------------------------------------------------------------
 * ⭐ THAY ĐỔI QUAN TRỌNG: TỪ "MỘT KEY" SANG "HỒ NHIỀU KEY"
 *
 * Trước đây file này giữ đúng một client Gemini duy nhất. Nhưng khi chạy
 * crawl + OCR hàng loạt, một key hết quota là cả hệ thống đứng.
 *
 * Bây giờ toàn bộ việc quản lý key nằm ở `geminiKeyPool.ts`:
 *   • xoay vòng nhiều key (round-robin)
 *   • key nào dính 429 thì cho "nghỉ" rồi tự chuyển key khác
 *   • hết key khả dụng thì trả null để nơi gọi dùng phương án dự phòng
 *
 * File này giờ chỉ còn hai nhiệm vụ:
 *   1. Xuất lại (re-export) các hàm của pool, để code cũ import từ
 *      '@/config/gemini' vẫn chạy y nguyên — không phải sửa hàng loạt file.
 *   2. Khai báo các KHUÔN DẠNG JSON (responseSchema) mà model phải tuân theo.
 *
 * ----------------------------------------------------------------------------
 * responseSchema — TÍNH NĂNG QUAN TRỌNG NHẤT KHI DÙNG AI TRONG APP THẬT
 *
 * Nếu chỉ bảo AI "trả về JSON", nó có thể trả kèm lời dẫn ("Đây là kết quả:"),
 * bọc trong ```json, hoặc thiếu trường -> code parse sẽ vỡ.
 *
 * responseSchema BẮT BUỘC model trả đúng cấu trúc đã khai báo. Đây gọi là
 * "structured output" — biến AI từ thứ khó đoán thành một API tin cậy được.
 */

import { Type } from '@google/genai';

/**
 * Xuất lại toàn bộ API của hồ key.
 * Nhờ dòng này, `import { isGeminiEnabled } from '@/config/gemini'` ở các file
 * cũ vẫn hoạt động, dù logic thật đã chuyển sang geminiKeyPool.ts.
 */
export {
  runWithKeyRotation,
  isGeminiEnabled,
  getKeyCount,
  getPoolStats,
} from '@/config/geminiKeyPool';

/**
 * KHUÔN DẠNG KẾT QUẢ DỰ ĐOÁN TRẬN ĐẤU.
 * Khớp chính xác với mục 6.2 trong ARCHITECTURE.md.
 */
export const PREDICTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    win_pct: {
      type: Type.INTEGER,
      description: 'Xác suất đội Việt Nam THẮNG, số nguyên 0-100',
    },
    draw_pct: {
      type: Type.INTEGER,
      description: 'Xác suất HOÀ, số nguyên 0-100',
    },
    lose_pct: {
      type: Type.INTEGER,
      description: 'Xác suất đội Việt Nam THUA, số nguyên 0-100',
    },
    analysis_text: {
      type: Type.STRING,
      description: 'Bài nhận định chuyên sâu bằng tiếng Việt, 150-250 từ',
    },
    key_factors: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-5 yếu tố then chốt quyết định trận đấu, mỗi yếu tố 1 câu ngắn',
    },
    predicted_score: {
      type: Type.STRING,
      description: 'Tỷ số dự đoán dạng "2-1" (đội nhà trước)',
    },
    confidence: {
      type: Type.STRING,
      enum: ['low', 'medium', 'high'],
      description: 'Mức độ tự tin của dự đoán',
    },
  },
  // required buộc model không được bỏ sót trường nào
  required: [
    'win_pct',
    'draw_pct',
    'lose_pct',
    'analysis_text',
    'key_factors',
    'predicted_score',
    'confidence',
  ],
} as const;

/**
 * ⭐ KHUÔN DẠNG KẾT QUẢ OCR / BÓC TÁCH TRANG WEB.
 *
 * Dùng cho cả hai luồng:
 *   • OCR ảnh/PDF  (ocr.service.ts)
 *   • Làm sạch & tóm tắt một trang web đã cào  (crawl/extract.ts)
 *
 * Vì sao bắt AI trả về đúng cấu trúc này thay vì một cục văn bản?
 * Vì bước sau (lưu vào kb_documents + cắt đoạn để nhúng vector) cần biết rõ
 * đâu là TIÊU ĐỀ, đâu là NỘI DUNG, đâu là NGÀY. Có cấu trúc thì tìm kiếm
 * mới chính xác; không có thì chỉ còn cách đoán mò.
 */
export const EXTRACTION_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    title: {
      type: Type.STRING,
      description: 'Tiêu đề chính của tài liệu/trang, tiếng Việt, tối đa 200 ký tự',
    },
    summary: {
      type: Type.STRING,
      description: 'Tóm tắt 2-3 câu bằng tiếng Việt, nêu đúng thông tin cốt lõi',
    },
    content: {
      type: Type.STRING,
      description:
        'Toàn bộ nội dung chữ đã làm sạch, giữ nguyên số liệu, tên riêng và dấu tiếng Việt. ' +
        'Bỏ hết menu, quảng cáo, chân trang, nút chia sẻ, bình luận.',
    },
    published_at: {
      type: Type.STRING,
      description:
        'Ngày đăng dạng YYYY-MM-DD nếu tài liệu có ghi rõ. Không tìm thấy thì trả chuỗi rỗng. ' +
        'TUYỆT ĐỐI không tự bịa ngày.',
    },
    tags: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: '3-8 từ khoá tiếng Việt mô tả chủ đề (ví dụ: "AFF Cup", "Tiến Linh", "đội hình")',
    },
    is_relevant: {
      type: Type.BOOLEAN,
      description:
        'true nếu tài liệu thực sự nói về bóng đá Việt Nam / đội tuyển quốc gia. ' +
        'false nếu là trang lạc đề (tin showbiz, quảng cáo, trang lỗi 404...).',
    },
  },
  required: ['title', 'summary', 'content', 'published_at', 'tags', 'is_relevant'],
} as const;
