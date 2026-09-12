/**
 * ============================================================================
 * SERVICES/OCR.SERVICE.TS — ĐỌC CHỮ TRONG ẢNH & PDF BẰNG GEMINI
 * ============================================================================
 *
 * 🎯 OCR LÀ GÌ?
 * OCR = Optical Character Recognition = "nhận dạng ký tự quang học", tức là
 * nhìn vào một tấm ảnh và đọc ra chữ trong đó.
 *
 * 💡 VÌ SAO DÙNG GEMINI THAY VÌ TESSERACT?
 *
 *   | Tiêu chí               | Tesseract          | Gemini (cách này)        |
 *   |------------------------|--------------------|--------------------------|
 *   | Cài đặt                | phải cài binary    | không cài gì             |
 *   | Dấu tiếng Việt         | hay sai (ẫ -> â)   | chính xác cao            |
 *   | Ảnh chụp nghiêng, mờ   | kém                | tốt                      |
 *   | Hiểu BỐ CỤC (bảng)     | không              | có — trả đúng bảng       |
 *   | Tốn tiền               | miễn phí           | tính theo lượt gọi       |
 *
 * Gemini là model ĐA PHƯƠNG THỨC (multimodal): ta gửi thẳng byte ảnh/PDF vào
 * cùng câu lệnh, nó vừa đọc chữ vừa hiểu nội dung. Với bảng xếp hạng hay
 * lịch thi đấu dạng ảnh, nó trả về đúng cấu trúc bảng — thứ Tesseract
 * không làm được.
 *
 * ----------------------------------------------------------------------------
 * 🔁 MỌI LỜI GỌI ĐỀU ĐI QUA runWithKeyRotation()
 * OCR là tác vụ đốt quota nhanh nhất trong cả dự án (mỗi ảnh tốn khá nhiều
 * token đầu vào). Nhờ hồ key xoay vòng, key này hết lượt thì key khác gánh —
 * xem config/geminiKeyPool.ts.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ GIỚI HẠN PHẢI BIẾT
 *   • File > OCR_MAX_FILE_MB bị từ chối TRƯỚC khi gọi API (đỡ tốn tiền).
 *   • Ảnh chữ viết tay nguệch ngoạc vẫn có thể sai — luôn coi kết quả OCR là
 *     dữ liệu "cần người duyệt", đừng đẩy thẳng vào bảng chính thức.
 *   • Model có thể "bịa" khi ảnh quá mờ. Prompt dưới đây đã chặn bằng cách
 *     yêu cầu trả về [không đọc được] thay vì đoán.
 * ============================================================================
 */

import fs from 'fs/promises';
import path from 'path';
import axios from 'axios';
import { env } from '@/config/env';
import { runWithKeyRotation, isGeminiEnabled, EXTRACTION_SCHEMA } from '@/config/gemini';
import { logger } from '@/utils/logger';

// ---------------------------------------------------------------------------
// KIỂU DỮ LIỆU
// ---------------------------------------------------------------------------

/** Kết quả OCR "thô": chỉ có chữ, chưa phân tích gì thêm */
export interface OcrResult {
  /** Toàn bộ chữ đọc được, giữ nguyên xuống dòng và bố cục bảng dạng Markdown */
  text: string;
  /** Model đã dùng — lưu lại để sau này truy vết chất lượng */
  model: string;
  /** Số ký tự đọc được, tiện cho log và cho việc kiểm tra nhanh */
  charCount: number;
}

/** Kết quả OCR "có cấu trúc": đã được AI phân tích thành các trường rõ ràng */
export interface StructuredOcrResult {
  title: string;
  summary: string;
  content: string;
  /** Dạng YYYY-MM-DD, hoặc chuỗi rỗng nếu tài liệu không ghi ngày */
  published_at: string;
  tags: string[];
  /** false = tài liệu lạc đề, nên bỏ qua không lưu vào kho tri thức */
  is_relevant: boolean;
}

// ---------------------------------------------------------------------------
// TIỆN ÍCH
// ---------------------------------------------------------------------------

/**
 * Bảng tra đuôi file -> MIME type.
 *
 * VÌ SAO PHẢI KHAI BÁO TAY MÀ KHÔNG DÙNG THƯ VIỆN?
 * Gemini chỉ chấp nhận một danh sách MIME HỮU HẠN. Khai báo tay vừa là bảng
 * tra, vừa là DANH SÁCH TRẮNG: đuôi file lạ sẽ bị chặn ngay, không gửi lên
 * API để rồi nhận lỗi 400 và mất một lượt quota.
 */
const MIME_BY_EXTENSION: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.heic': 'image/heic',
  '.heif': 'image/heif',
  '.gif': 'image/gif',
  '.pdf': 'application/pdf',
};

/** Đoán MIME type từ đuôi file. Trả về null nếu định dạng không được hỗ trợ. */
function guessMimeType(filePath: string): string | null {
  const ext = path.extname(filePath).toLowerCase();
  return MIME_BY_EXTENSION[ext] ?? null;
}

/**
 * Câu lệnh (prompt) dùng cho OCR thô.
 *
 * BỐN RÀNG BUỘC TRONG PROMPT NÀY ĐỀU CÓ LÝ DO — đừng xoá bớt:
 *   1. "Chỉ trả về chữ"     -> chặn model thêm lời dẫn "Đây là nội dung ảnh:"
 *   2. "Giữ nguyên dấu"     -> tiếng Việt không dấu là dữ liệu hỏng
 *   3. "Bảng -> Markdown"   -> giữ được quan hệ hàng/cột, sau này parse lại được
 *   4. "[không đọc được]"   -> cho model một LỐI THOÁT hợp lệ, để nó khỏi bịa.
 *      Đây là mẹo quan trọng nhất khi chống "ảo giác" (hallucination) của AI:
 *      luôn cho model một cách trả lời "tôi không biết" mà không bị coi là sai.
 */
const OCR_PROMPT = [
  'Bạn là công cụ OCR chính xác cao chuyên xử lý tài liệu tiếng Việt về bóng đá.',
  '',
  'Hãy đọc TOÀN BỘ chữ có trong tài liệu đính kèm và tuân thủ nghiêm ngặt:',
  '1. CHỈ trả về phần chữ đọc được. Không thêm lời dẫn, không giải thích, không bình luận.',
  '2. Giữ NGUYÊN dấu tiếng Việt, tên riêng và mọi con số. Sai một dấu là sai dữ liệu.',
  '3. Giữ nguyên thứ tự đọc tự nhiên và các lần xuống dòng.',
  '4. Nếu gặp BẢNG, hãy trình bày lại bằng bảng Markdown (dùng dấu |) để không mất quan hệ hàng - cột.',
  '5. Chỗ nào mờ, bị che hoặc không chắc chắn thì ghi đúng ký hiệu [không đọc được].',
  '   TUYỆT ĐỐI KHÔNG suy đoán hay tự điền thay cho chữ bị mờ.',
].join('\n');

// ---------------------------------------------------------------------------
// 1. OCR THÔ — ẢNH/PDF -> CHỮ
// ---------------------------------------------------------------------------

/**
 * Đọc chữ từ một khối dữ liệu nhị phân (buffer) đã nằm sẵn trong RAM.
 *
 * Đây là hàm LÕI — hai hàm tiện ích bên dưới (đọc từ file, đọc từ URL) đều
 * quy về gọi hàm này.
 *
 * @param buffer   Nội dung file dạng byte
 * @param mimeType MIME type, ví dụ 'image/png' hoặc 'application/pdf'
 * @param hint     Gợi ý bối cảnh, ví dụ 'bảng xếp hạng vòng loại World Cup'.
 *                 Cho model biết nó đang nhìn cái gì -> kết quả chính xác hơn hẳn.
 * @returns        Kết quả OCR, hoặc null nếu tắt OCR / không có key / gọi thất bại
 */
export async function ocrBuffer(
  buffer: Buffer,
  mimeType: string,
  hint?: string
): Promise<OcrResult | null> {
  // --- Ba cửa kiểm tra TRƯỚC khi tốn một lượt gọi API ---

  if (!env.OCR_ENABLED) {
    logger.warn('[OCR] Đang tắt (OCR_ENABLED=false). Bỏ qua.');
    return null;
  }

  if (!isGeminiEnabled()) {
    logger.warn(
      '[OCR] Chưa có key Gemini nào. Điền GEMINI_API_KEYS vào .env ở gốc repo để bật OCR.'
    );
    return null;
  }

  const sizeMb = buffer.length / (1024 * 1024);
  if (sizeMb > env.OCR_MAX_FILE_MB) {
    logger.warn(
      '[OCR] File ' +
        sizeMb.toFixed(1) +
        'MB vượt ngưỡng OCR_MAX_FILE_MB=' +
        env.OCR_MAX_FILE_MB +
        'MB. Hãy nén ảnh hoặc tách PDF thành nhiều phần nhỏ.'
    );
    return null;
  }

  // --- Gọi Gemini, có xoay vòng key ---

  /**
   * Ảnh phải mã hoá base64 vì JSON không chứa được byte thô.
   * Base64 làm dữ liệu phình khoảng 33% — đó là cái giá phải trả, và cũng là
   * lý do ta chặn file lớn ở trên.
   */
  const base64 = buffer.toString('base64');

  const text = await runWithKeyRotation('ocr', async (client) => {
    const response = await client.models.generateContent({
      model: env.OCR_MODEL,
      /**
       * `contents` là MẢNG nhiều phần: vừa có chữ (prompt) vừa có ảnh.
       * Đây chính là điểm khác biệt của model đa phương thức so với model
       * chỉ đọc chữ thuần.
       */
      contents: [
        {
          role: 'user',
          parts: [
            { text: hint ? OCR_PROMPT + '\n\nBối cảnh tài liệu: ' + hint : OCR_PROMPT },
            { inlineData: { mimeType, data: base64 } },
          ],
        },
      ],
      config: {
        /**
         * temperature = 0: OCR là việc CHÉP LẠI, không phải việc sáng tác.
         * Càng ít ngẫu nhiên càng tốt. Đây là khác biệt lớn so với dự đoán
         * trận đấu (dùng 0.4 để văn phong tự nhiên hơn).
         */
        temperature: 0,
        maxOutputTokens: 8192, // tài liệu dài cần nhiều chỗ chứa hơn câu trả lời chat
      },
    });
    return response.text ?? '';
  });

  if (!text) {
    logger.warn('[OCR] Không nhận được kết quả (mọi key đều bận, hoặc tài liệu không có chữ).');
    return null;
  }

  logger.info('[OCR] Đọc xong ' + text.length + ' ký tự bằng model ' + env.OCR_MODEL);

  return { text: text.trim(), model: env.OCR_MODEL, charCount: text.trim().length };
}

/**
 * OCR một file trên ổ đĩa.
 *
 * Dùng khi bạn tải sẵn ảnh/PDF về máy, ví dụ:
 *   npm run ocr -- ./tai-lieu/bang-xep-hang.png
 */
export async function ocrFile(filePath: string, hint?: string): Promise<OcrResult | null> {
  const mimeType = guessMimeType(filePath);

  if (!mimeType) {
    logger.error(
      '[OCR] Định dạng không hỗ trợ: ' +
        path.extname(filePath) +
        '. Các định dạng nhận được: ' +
        Object.keys(MIME_BY_EXTENSION).join(', ')
    );
    return null;
  }

  try {
    const buffer = await fs.readFile(filePath);
    logger.info('[OCR] Đang đọc ' + path.basename(filePath) + ' (' + mimeType + ')');
    return await ocrBuffer(buffer, mimeType, hint);
  } catch (err) {
    logger.error(
      '[OCR] Không đọc được file ' + filePath + ': ' + (err instanceof Error ? err.message : String(err))
    );
    return null;
  }
}

/**
 * OCR một ảnh/PDF nằm trên Internet — tải về RAM rồi đọc, không ghi ra đĩa.
 *
 * Đây là hàm mà crawler dùng: gặp ảnh bảng xếp hạng trong bài báo thì gọi
 * thẳng hàm này, không cần bước tải file thủ công.
 *
 * ⚠️ responseType 'arraybuffer' là BẮT BUỘC. Mặc định axios cố hiểu phản hồi
 * thành chuỗi UTF-8, làm hỏng toàn bộ byte nhị phân của ảnh.
 */
export async function ocrUrl(url: string, hint?: string): Promise<OcrResult | null> {
  try {
    const response = await axios.get<ArrayBuffer>(url, {
      responseType: 'arraybuffer',
      timeout: env.CRAWLER_TIMEOUT_MS,
      headers: { 'User-Agent': env.CRAWLER_USER_AGENT },
      // Chặn tải file khổng lồ ngay ở tầng mạng, trước cả khi vào RAM
      maxContentLength: env.OCR_MAX_FILE_MB * 1024 * 1024,
    });

    /**
     * Ưu tiên MIME do máy chủ khai báo trong header; nếu máy chủ khai báo
     * chung chung (application/octet-stream) thì mới đoán theo đuôi URL.
     */
    const headerMime = (String(response.headers['content-type'] ?? '').split(';')[0] ?? '').trim();
    const mimeType =
      headerMime && headerMime !== 'application/octet-stream'
        ? headerMime
        : guessMimeType(new URL(url).pathname);

    if (!mimeType || !Object.values(MIME_BY_EXTENSION).includes(mimeType)) {
      logger.warn('[OCR] URL trả về định dạng không hỗ trợ: ' + mimeType + ' — ' + url);
      return null;
    }

    return await ocrBuffer(Buffer.from(response.data), mimeType, hint);
  } catch (err) {
    logger.error(
      '[OCR] Không tải được ' + url + ': ' + (err instanceof Error ? err.message : String(err))
    );
    return null;
  }
}

// ---------------------------------------------------------------------------
// 2. OCR CÓ CẤU TRÚC — ẢNH/PDF -> CÁC TRƯỜNG DỮ LIỆU RÕ RÀNG
// ---------------------------------------------------------------------------

/**
 * Vừa OCR vừa phân tích tài liệu thành các trường có cấu trúc, TRONG MỘT
 * lượt gọi API duy nhất.
 *
 * 💰 VÌ SAO GỘP LÀM MỘT LƯỢT MÀ KHÔNG LÀM HAI BƯỚC?
 * Làm hai bước (OCR rồi mới phân tích) tốn 2 lượt gọi và phải gửi lại toàn
 * bộ văn bản ở bước 2. Gộp lại: tiết kiệm một nửa quota — điều rất đáng giá
 * khi bạn đang xoay vòng các key miễn phí.
 *
 * Kết quả trả về đúng khuôn EXTRACTION_SCHEMA nên có thể đưa thẳng vào
 * kb_documents mà không cần parse thêm.
 */
export async function ocrStructured(
  buffer: Buffer,
  mimeType: string,
  hint?: string
): Promise<StructuredOcrResult | null> {
  if (!env.OCR_ENABLED || !isGeminiEnabled()) return null;

  const sizeMb = buffer.length / (1024 * 1024);
  if (sizeMb > env.OCR_MAX_FILE_MB) {
    logger.warn('[OCR] File quá lớn: ' + sizeMb.toFixed(1) + 'MB');
    return null;
  }

  const base64 = buffer.toString('base64');

  const prompt = [
    'Bạn là chuyên viên bóc tách dữ liệu bóng đá Việt Nam.',
    '',
    'Hãy đọc tài liệu đính kèm rồi điền vào cấu trúc JSON đã quy định.',
    'Quy tắc bắt buộc:',
    '- Giữ nguyên mọi con số, tên riêng và dấu tiếng Việt.',
    '- Trường content phải chứa TOÀN BỘ nội dung chữ, bảng biểu trình bày bằng Markdown.',
    '- Trường published_at: chỉ điền khi tài liệu GHI RÕ ngày. Không thấy thì để chuỗi rỗng.',
    '- Trường is_relevant: đặt false nếu tài liệu không liên quan bóng đá Việt Nam.',
    '- TUYỆT ĐỐI không bịa thông tin không có trong tài liệu.',
    hint ? '\nBối cảnh: ' + hint : '',
  ].join('\n');

  const raw = await runWithKeyRotation('ocr-structured', async (client) => {
    const response = await client.models.generateContent({
      model: env.OCR_MODEL,
      contents: [
        { role: 'user', parts: [{ text: prompt }, { inlineData: { mimeType, data: base64 } }] },
      ],
      config: {
        temperature: 0,
        maxOutputTokens: 8192,
        // responseSchema biến đầu ra của AI thành JSON tin cậy được — xem config/gemini.ts
        responseMimeType: 'application/json',
        responseSchema: EXTRACTION_SCHEMA as never,
      },
    });
    return response.text ?? '';
  });

  if (!raw) return null;

  try {
    return JSON.parse(raw) as StructuredOcrResult;
  } catch {
    /**
     * Về lý thuyết responseSchema đã bảo đảm JSON hợp lệ, nhưng vẫn bọc
     * try/catch: model có thể bị cắt giữa chừng khi chạm maxOutputTokens,
     * để lại một chuỗi JSON dở dang. Thà bỏ qua một tài liệu còn hơn
     * để cả job crawl sập.
     */
    logger.error('[OCR] JSON trả về không hợp lệ (có thể do bị cắt vì quá dài).');
    return null;
  }
}
