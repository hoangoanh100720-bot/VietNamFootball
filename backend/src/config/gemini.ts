/**
 * ============================================================================
 * CONFIG/GEMINI.TS — KHỞI TẠO GOOGLE GEMINI
 * ============================================================================
 *
 * 🔐 QUY TẮC BẢO MẬT SỐ 1 CỦA DỰ ÁN:
 * GEMINI_API_KEY chỉ tồn tại Ở BACKEND. KHÔNG BAO GIỜ gửi xuống app mobile.
 *
 * Vì sao? Mọi thứ nhúng vào app mobile đều đọc được: chỉ cần giải nén file APK
 * là thấy hết chuỗi ký tự bên trong. Key bị lộ nghĩa là người khác gọi Gemini
 * bằng TÀI KHOẢN CỦA BẠN — và bạn trả tiền.
 *
 * Luồng đúng:
 *   App  --(không có key)-->  Backend của bạn  --(có key)-->  Gemini
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

import { GoogleGenAI, Type } from '@google/genai';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

let client: GoogleGenAI | null = null;

/**
 * Lấy client Gemini. Trả về null nếu chưa cấu hình API key
 * -> hệ thống sẽ tự chuyển sang thuật toán dự đoán dự phòng.
 */
export function getGeminiClient(): GoogleGenAI | null {
  if (!env.GEMINI_API_KEY) return null;

  // Chỉ khởi tạo một lần rồi dùng lại (mẫu thiết kế singleton)
  if (!client) {
    client = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    logger.info('Gemini đã khởi tạo với model ' + env.GEMINI_MODEL);
  }
  return client;
}

export function isGeminiEnabled(): boolean {
  return Boolean(env.GEMINI_API_KEY);
}

/**
 * KHUÔN DẠNG KẾT QUẢ mà Gemini BẮT BUỘC phải tuân theo.
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
  required: ['win_pct', 'draw_pct', 'lose_pct', 'analysis_text', 'key_factors', 'predicted_score', 'confidence'],
} as const;
