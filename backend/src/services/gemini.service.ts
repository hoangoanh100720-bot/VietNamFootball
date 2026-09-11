/**
 * ============================================================================
 * SERVICES/GEMINI.SERVICE.TS — XÂY PROMPT, GỌI AI, KIỂM CHỨNG KẾT QUẢ
 * ============================================================================
 *
 * Ba việc phải làm cho tử tế khi dùng AI trong sản phẩm thật:
 *
 *   1. PROMPT TỐT     : AI chỉ giỏi bằng dữ liệu ta đưa vào. Đưa số liệu cụ thể
 *                       (phong độ, H2H, thứ hạng), đừng hỏi chung chung.
 *   2. RETRY THÔNG MINH: mạng lỗi, API quá tải -> thử lại với thời gian chờ
 *                       TĂNG DẦN (exponential backoff): 1s, 2s, 4s.
 *                       Thử lại ngay lập tức chỉ làm dịch vụ đang quá tải càng nặng.
 *   3. KIỂM CHỨNG     : AI có thể trả 45+30+24 = 99. Ta phải sửa lại thành 100
 *                       trước khi lưu, vì database có ràng buộc CHECK.
 */

import { getGeminiClient, isGeminiEnabled, PREDICTION_SCHEMA } from '@/config/gemini';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';
import { AppError } from '@/utils/AppError';

/** Dữ liệu đầu vào để AI phân tích — càng chi tiết, dự đoán càng đáng tin */
export interface PredictionContext {
  competition: string;
  round: string | null;
  kickoff_at: string;
  venue: string | null;
  is_home: boolean;            // Việt Nam đá sân nhà?
  vietnam: TeamContext;
  opponent: TeamContext;
  h2h: {
    total: number;
    vietnam_wins: number;
    draws: number;
    vietnam_losses: number;
    goals_for: number;
    goals_against: number;
    recent: string[];          // ['05/01/2025: Thái Lan 2-3 Việt Nam', ...]
  };
}

export interface TeamContext {
  name: string;
  fifa_rank: number | null;
  fifa_points: number | null;
  form: string[];              // ['W','W','D','L','W'] mới nhất trước
  recent_matches: string[];
  squad_value_eur?: number;
  key_players?: string[];
}

/** Kết quả AI trả về, sau khi đã kiểm chứng */
export interface PredictionResult {
  win_pct: number;
  draw_pct: number;
  lose_pct: number;
  analysis_text: string;
  key_factors: string[];
  predicted_score: string;
  confidence: 'low' | 'medium' | 'high';
  model_version: string;
}

// ---------------------------------------------------------------------------
// XÂY PROMPT
// ---------------------------------------------------------------------------

/**
 * Prompt gồm 3 phần theo đúng thực hành tốt:
 *   VAI TRÒ    — "Bạn là chuyên gia phân tích..." giúp model chọn đúng giọng văn
 *   DỮ LIỆU    — số liệu thật, trình bày có cấu trúc để model dễ đọc
 *   YÊU CẦU    — nói rõ ràng buộc (tổng = 100, viết tiếng Việt, 150-250 từ)
 */
export function buildPrompt(ctx: PredictionContext): string {
  const formText = (form: string[]) =>
    form.length ? form.join(' - ').replace(/W/g, 'Thắng').replace(/D/g, 'Hoà').replace(/L/g, 'Thua') : 'chưa có dữ liệu';

  return `Bạn là chuyên gia phân tích bóng đá châu Á với 20 năm kinh nghiệm, chuyên sâu về bóng đá Đông Nam Á và đội tuyển Việt Nam.

## THÔNG TIN TRẬN ĐẤU
- Giải đấu: ${ctx.competition}${ctx.round ? ` (${ctx.round})` : ''}
- Thời gian: ${ctx.kickoff_at}
- Sân: ${ctx.venue ?? 'chưa xác định'}
- Việt Nam thi đấu trên: ${ctx.is_home ? 'SÂN NHÀ' : 'SÂN KHÁCH'}

## ĐỘI TUYỂN VIỆT NAM
- Hạng FIFA: ${ctx.vietnam.fifa_rank ?? 'không rõ'} (${ctx.vietnam.fifa_points ?? '?'} điểm)
- Phong độ 5 trận gần nhất: ${formText(ctx.vietnam.form)}
- Chi tiết: ${ctx.vietnam.recent_matches.join(' | ') || 'chưa có'}
${ctx.vietnam.squad_value_eur ? `- Tổng giá trị đội hình: ${ctx.vietnam.squad_value_eur.toLocaleString('vi-VN')} EUR` : ''}
${ctx.vietnam.key_players?.length ? `- Trụ cột: ${ctx.vietnam.key_players.join(', ')}` : ''}

## ĐỐI THỦ: ${ctx.opponent.name.toUpperCase()}
- Hạng FIFA: ${ctx.opponent.fifa_rank ?? 'không rõ'} (${ctx.opponent.fifa_points ?? '?'} điểm)
- Phong độ 5 trận gần nhất: ${formText(ctx.opponent.form)}
- Chi tiết: ${ctx.opponent.recent_matches.join(' | ') || 'chưa có'}

## LỊCH SỬ ĐỐI ĐẦU
- Tổng ${ctx.h2h.total} lần gặp nhau: Việt Nam thắng ${ctx.h2h.vietnam_wins}, hoà ${ctx.h2h.draws}, thua ${ctx.h2h.vietnam_losses}
- Hiệu số bàn thắng (theo Việt Nam): ${ctx.h2h.goals_for} - ${ctx.h2h.goals_against}
- Các trận gần đây:
${ctx.h2h.recent.map((r) => `  • ${r}`).join('\n') || '  • chưa có dữ liệu'}

## YÊU CẦU
Phân tích và dự đoán kết quả trận đấu THEO GÓC NHÌN ĐỘI TUYỂN VIỆT NAM.

Ràng buộc bắt buộc:
1. win_pct + draw_pct + lose_pct PHẢI cộng lại đúng 100.
2. analysis_text viết bằng tiếng Việt, 150-250 từ, văn phong báo chí thể thao, có dẫn chứng số liệu cụ thể từ dữ liệu trên.
3. key_factors gồm 3-5 yếu tố then chốt, mỗi yếu tố một câu ngắn gọn.
4. Cân nhắc đầy đủ: chênh lệch trình độ (hạng FIFA), phong độ hiện tại, lợi thế sân bãi, lịch sử đối đầu và tính chất giải đấu.
5. Khách quan, KHÔNG thiên vị đội tuyển Việt Nam. Nếu đối thủ mạnh hơn rõ rệt thì phải phản ánh đúng trong tỷ lệ.`;
}

// ---------------------------------------------------------------------------
// GỌI GEMINI
// ---------------------------------------------------------------------------

/** Dừng chương trình một khoảng thời gian (dùng cho backoff) */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Gọi Gemini và trả về dự đoán đã kiểm chứng.
 * Ném AppError nếu thất bại sau tất cả các lần thử.
 */
export async function generatePrediction(ctx: PredictionContext): Promise<PredictionResult> {
  const client = getGeminiClient();
  if (!client) throw AppError.serviceUnavailable('Chưa cấu hình GEMINI_API_KEY');

  const prompt = buildPrompt(ctx);
  logger.debug('Prompt gửi Gemini dài ' + prompt.length + ' ký tự');

  let lastError: unknown;

  // Thử tối đa GEMINI_MAX_RETRIES lần
  for (let attempt = 1; attempt <= env.GEMINI_MAX_RETRIES; attempt++) {
    try {
      // Promise.race: cái nào xong trước thì lấy cái đó.
      // Nếu Gemini chậm hơn GEMINI_TIMEOUT_MS thì ta bỏ cuộc, không treo request.
      const response = await Promise.race([
        client.models.generateContent({
          model: env.GEMINI_MODEL,
          contents: prompt,
          config: {
            temperature: env.GEMINI_TEMPERATURE, // 0 = luôn giống nhau, 1 = sáng tạo
            maxOutputTokens: env.GEMINI_MAX_OUTPUT_TOKENS,
            responseMimeType: 'application/json',
            responseSchema: PREDICTION_SCHEMA as never,
          },
        }),
        sleep(env.GEMINI_TIMEOUT_MS).then(() => {
          throw new Error('Gemini quá thời gian chờ ' + env.GEMINI_TIMEOUT_MS + 'ms');
        }),
      ]);

      const text = response.text;
      if (!text) throw new Error('Gemini trả về nội dung rỗng');

      const parsed = JSON.parse(text) as Omit<PredictionResult, 'model_version'>;

      logger.info('Gemini dự đoán thành công', {
        attempt,
        win: parsed.win_pct,
        draw: parsed.draw_pct,
        lose: parsed.lose_pct,
      });

      return normalizePrediction(parsed, env.GEMINI_MODEL);
    } catch (err) {
      lastError = err;
      const message = err instanceof Error ? err.message : String(err);
      logger.warn(`Gemini lần thử ${attempt}/${env.GEMINI_MAX_RETRIES} thất bại: ${message}`);

      // Chờ tăng dần rồi thử lại: 1s -> 2s -> 4s
      if (attempt < env.GEMINI_MAX_RETRIES) {
        await sleep(1000 * Math.pow(2, attempt - 1));
      }
    }
  }

  throw AppError.serviceUnavailable(
    'Không thể tạo dự đoán lúc này: ' + (lastError instanceof Error ? lastError.message : 'lỗi không rõ')
  );
}

/**
 * KIỂM CHỨNG & SỬA KẾT QUẢ AI
 *
 * Không bao giờ tin tuyệt đối đầu ra của AI. Ba việc phải làm:
 *   1. Ép về số nguyên trong khoảng 0-100
 *   2. Bảo đảm tổng đúng 100 (cộng/trừ phần lệch vào ô lớn nhất)
 *   3. Cắt bớt nội dung quá dài để không làm phình database
 */
function normalizePrediction(
  raw: Omit<PredictionResult, 'model_version'>,
  modelVersion: string
): PredictionResult {
  const clamp = (n: unknown) => Math.max(0, Math.min(100, Math.round(Number(n) || 0)));

  let win = clamp(raw.win_pct);
  let draw = clamp(raw.draw_pct);
  let lose = clamp(raw.lose_pct);

  const sum = win + draw + lose;

  if (sum !== 100) {
    logger.warn(`AI trả tổng ${sum}% thay vì 100% — đang tự điều chỉnh`);

    if (sum === 0) {
      // Trường hợp cực đoan: AI trả toàn số 0 -> dùng giá trị trung lập
      win = 34; draw = 33; lose = 33;
    } else {
      // Chia lại theo tỷ lệ rồi dồn phần dư vào ô lớn nhất
      win = Math.round((win / sum) * 100);
      draw = Math.round((draw / sum) * 100);
      lose = 100 - win - draw;

      // Sau khi ép, lose có thể âm (do làm tròn) -> vay từ ô lớn nhất
      if (lose < 0) {
        if (win >= draw) win += lose;
        else draw += lose;
        lose = 0;
      }
    }
  }

  return {
    win_pct: win,
    draw_pct: draw,
    lose_pct: lose,
    analysis_text: String(raw.analysis_text ?? '').slice(0, 4000),
    key_factors: Array.isArray(raw.key_factors) ? raw.key_factors.slice(0, 6).map(String) : [],
    predicted_score: String(raw.predicted_score ?? '').slice(0, 10),
    confidence: ['low', 'medium', 'high'].includes(raw.confidence) ? raw.confidence : 'medium',
    model_version: modelVersion,
  };
}

export { isGeminiEnabled };
