/**
 * ============================================================================
 * CONFIG/GEMINIKEYPOOL.TS — HỒ KEY GEMINI XOAY VÒNG (chống hết quota)
 * ============================================================================
 *
 * 🎯 BÀI TOÁN
 * Gói miễn phí của Gemini giới hạn theo PHÚT (RPM) và theo NGÀY (RPD).
 * Khi crawl + OCR hàng trăm trang, một key sẽ hết lượt rất nhanh, Google trả
 * về HTTP 429 và toàn bộ pipeline đứng hình.
 *
 * 💡 CÁCH GIẢI — bốn lớp, đơn giản mà hiệu quả:
 *
 *   LỚP 1 — XOAY VÒNG (round-robin)
 *     Mỗi lần xin key, con trỏ `cursor` nhích sang key kế tiếp. Tải được
 *     rải đều thay vì dồn hết vào key đầu tiên.
 *
 *   LỚP 2 — PHẠT NGHỈ (cooldown)
 *     Key nào dính 429 bị đánh dấu "đang nghỉ" tới thời điểm `cooldownUntil`.
 *     Trong lúc nghỉ, pool bỏ qua key đó. Hết giờ nghỉ nó tự quay lại hàng đợi
 *     — KHÔNG cần khởi động lại server, KHÔNG cần sửa .env.
 *
 *   LỚP 3 — THỬ LẠI BẰNG KEY KHÁC (failover)
 *     `runWithKeyRotation()` bọc quanh MỌI lời gọi Gemini. Gặp 429 -> nó tự
 *     đổi key rồi chạy lại, tối đa bằng số key đang có. Lời gọi bên ngoài
 *     hoàn toàn không biết chuyện gì vừa xảy ra.
 *
 *   LỚP 4 — LOẠI KEY HỎNG VĨNH VIỄN
 *     Key trả về 403/401 (dự án bị Google chặn, key bị thu hồi) thì chờ bao
 *     lâu cũng vô ích. Pool loại hẳn nó ra rồi vẫn TIẾP TỤC sang key kế tiếp,
 *     nên một key hỏng không kéo cả dịch vụ xuống. Xem isDeadKeyError().
 *
 * ----------------------------------------------------------------------------
 * ⚠️ MỘT SỰ THẬT PHẢI BIẾT TRƯỚC KHI TẠO 10 KEY
 * Quota tính theo DỰ ÁN Google Cloud, không phải theo key. Tạo 5 key trong
 * cùng một dự án thì vẫn chỉ có MỘT hạn mức. Muốn nhân quota thật sự, mỗi key
 * phải thuộc một TÀI KHOẢN GOOGLE khác nhau.
 *
 * ----------------------------------------------------------------------------
 * 🔐 BẢO MẬT
 * Key KHÔNG BAO GIỜ được ghi nguyên văn vào log. Mọi chỗ hiển thị đều dùng
 * maskKey() -> "AQ.Ab8R…mLBY". Log thường bị gom về hệ thống tập trung,
 * in key ra đó là làm rò rỉ.
 * ============================================================================
 */

import { GoogleGenAI } from '@google/genai';
import { env, geminiApiKeys } from '@/config/env';
import { logger } from '@/utils/logger';

/** Trạng thái theo dõi của MỘT key trong hồ */
interface KeySlot {
  /** Key gốc — chỉ dùng để khởi tạo client, không bao giờ in ra */
  apiKey: string;
  /** Client Gemini đã khởi tạo sẵn, tái sử dụng cho mọi request của key này */
  client: GoogleGenAI;
  /** Chuỗi đã che, dùng cho log: "AQ.Ab8R…mLBY" */
  label: string;
  /** Mốc thời gian (ms) key được phép dùng lại. 0 = đang rảnh */
  cooldownUntil: number;
  /** Đếm số lần gọi thành công — phục vụ endpoint /ai/status */
  okCount: number;
  /** Đếm số lần dính 429 / hết quota */
  quotaErrors: number;
  /** Đếm số lỗi khác (mạng, timeout, 500 phía Google) */
  otherErrors: number;
  /**
   * Key đã bị LOẠI VĨNH VIỄN khỏi hồ trong phiên chạy này (403/401).
   * Khác với cooldownUntil ở chỗ: cooldown tự hết hạn, còn cờ này thì không —
   * chỉ khởi động lại server (sau khi bạn đã sửa key) mới xoá được nó.
   */
  disabled: boolean;
  /** Lý do bị loại, để hiện ở /ai/status cho bạn biết đường mà sửa */
  disabledReason: string | null;
}

/** Con trỏ xoay vòng. Tăng dần, lấy dư cho số key -> chạy vòng tròn mãi mãi */
let cursor = 0;

/** Hồ key. Khởi tạo LƯỜI (lazy) ở lần dùng đầu tiên, xem getPool() */
let pool: KeySlot[] | null = null;

/**
 * Che key khi ghi log: giữ 6 ký tự đầu + 4 ký tự cuối.
 * Đủ để phân biệt key nào đang lỗi, mà không đủ để ai đó dùng lại.
 */
function maskKey(key: string): string {
  if (key.length <= 12) return '***';
  return key.slice(0, 6) + '…' + key.slice(-4);
}

/**
 * Dựng hồ key ở lần gọi đầu tiên (singleton).
 *
 * VÌ SAO KHỞI TẠO LƯỜI CHỨ KHÔNG LÀM NGAY KHI IMPORT?
 * Vì file này được import từ nhiều nơi. Khởi tạo ngay lúc import sẽ tạo client
 * kể cả khi request đó không hề đụng tới AI — tốn RAM vô ích và làm log khởi
 * động rối. Lười một chút, sạch hơn nhiều.
 */
function getPool(): KeySlot[] {
  if (pool) return pool;

  pool = geminiApiKeys.map((apiKey) => ({
    apiKey,
    client: new GoogleGenAI({ apiKey }),
    label: maskKey(apiKey),
    cooldownUntil: 0,
    okCount: 0,
    quotaErrors: 0,
    otherErrors: 0,
    disabled: false,
    disabledReason: null,
  }));

  if (pool.length === 0) {
    logger.warn(
      '[Gemini] Chưa có key nào. Các tính năng AI sẽ dùng phương án dự phòng ' +
        '(mô hình thống kê Elo, tìm kiếm full-text). Điền GEMINI_API_KEYS vào .env để bật AI thật.'
    );
  } else {
    logger.info(
      '[Gemini] Hồ key sẵn sàng: ' +
        pool.length +
        ' key (' +
        pool.map((s) => s.label).join(', ') +
        ') — model ' +
        env.GEMINI_MODEL +
        ', phạt nghỉ khi 429: ' +
        env.GEMINI_KEY_COOLDOWN_MS +
        'ms'
    );
  }
  return pool;
}

/** Có ít nhất một key hay không — dùng để quyết định bật/tắt tính năng AI */
export function isGeminiEnabled(): boolean {
  return getPool().length > 0;
}

/** Tổng số key trong hồ (kể cả key đang bị phạt nghỉ) */
export function getKeyCount(): number {
  return getPool().length;
}

/**
 * Lấy key kế tiếp còn dùng được.
 *
 * THUẬT TOÁN: đi tối đa đúng n bước (n = số key). Bước nào gặp key đang
 * trong thời gian phạt thì bỏ qua. Đi hết một vòng mà không key nào rảnh
 * -> trả về null, nghĩa là "cả hồ đang nghỉ".
 *
 * Đi tối đa n bước là điều kiện dừng bắt buộc: nếu không, hàm sẽ lặp vô tận
 * khi mọi key đều đang bị phạt.
 */
function acquireSlot(): KeySlot | null {
  const slots = getPool();
  if (slots.length === 0) return null;

  const now = Date.now();
  for (let step = 0; step < slots.length; step += 1) {
    const slot = slots[cursor % slots.length];
    cursor = (cursor + 1) % slots.length;
    // slots không rỗng và cursor luôn nằm trong khoảng hợp lệ, nhưng TypeScript
    // (bật noUncheckedIndexedAccess) vẫn coi truy cập mảng là có thể undefined.
    if (slot && !slot.disabled && slot.cooldownUntil <= now) return slot;
  }
  return null;
}

/**
 * Nhận diện lỗi "hết quota / quá nhiều request".
 *
 * VÌ SAO PHẢI DÒ CHUỖI CHỨ KHÔNG ĐỌC err.status?
 * SDK @google/genai gói lỗi theo nhiều hình dạng khác nhau tuỳ tầng phát sinh
 * (lỗi HTTP thô, lỗi đã parse, lỗi từ fetch). Cách bền nhất là gom cả object
 * về chuỗi rồi dò các dấu hiệu đặc trưng. Dò thừa còn hơn bỏ sót: bỏ sót
 * nghĩa là pool không đổi key và toàn bộ tiến trình chết vì một key hết lượt.
 */
function errorToText(err: unknown): string {
  let text: string;
  try {
    text = JSON.stringify(
      err instanceof Error ? { ...err, message: err.message, name: err.name } : err
    );
  } catch {
    // Object có vòng lặp tham chiếu -> JSON.stringify ném lỗi. Lùi về String().
    text = String(err);
  }
  return (text || '').toLowerCase();
}

function isQuotaError(err: unknown): boolean {
  const text = errorToText(err);

  return (
    text.includes('429') ||
    text.includes('resource_exhausted') ||
    text.includes('quota') ||
    text.includes('rate limit') ||
    text.includes('too many requests')
  );
}

/**
 * ⭐ NHẬN DIỆN KEY HỎNG VĨNH VIỄN (khác hẳn "tạm hết lượt").
 *
 * 🐛 TÌNH HUỐNG CÓ THẬT ĐÃ GẶP — và nó bộc lộ một lỗ hổng của thiết kế ban đầu:
 *
 * Một key được thêm vào hồ trông hoàn toàn hợp lệ (gọi listModels ra đủ 50
 * model), nhưng MỌI lệnh gọi AI đều trả về:
 *
 *     HTTP 403 — "Your project has been denied access. Please contact support."
 *
 * Dự án Google Cloud phía sau key đó đã bị Google chặn. Chờ bao lâu cũng
 * không hết — đây KHÔNG phải chuyện hết quota.
 *
 * ⚠️ VÌ SAO ĐIỀU NÀY NGUY HIỂM NẾU KHÔNG XỬ LÝ RIÊNG?
 * Bản đầu của hồ key chỉ chia lỗi làm hai loại: "hết quota" (đổi key, thử lại)
 * và "mọi lỗi khác" (dừng ngay, trả null). Một key hỏng vĩnh viễn rơi vào loại
 * thứ hai — nghĩa là cứ mỗi lần con trỏ xoay vòng chạm vào nó, TOÀN BỘ lời gọi
 * đó thất bại, dù hai key còn lại vẫn khoẻ. Với 3 key thì cứ 3 request hỏng 1,
 * mà log chỉ báo "lỗi không phải quota" nên rất khó lần ra nguyên nhân.
 *
 * 💡 CÁCH GIẢI: coi đây là loại lỗi THỨ BA — "loại key này ra khỏi hồ cho tới
 * khi khởi động lại", rồi TIẾP TỤC sang key kế tiếp như với lỗi quota. Tải
 * dồn về các key còn tốt, dịch vụ không hề gián đoạn.
 *
 * Các mã lỗi thuộc nhóm này:
 *   401 UNAUTHENTICATED   — key sai hoặc đã bị thu hồi
 *   403 PERMISSION_DENIED — dự án bị chặn, hoặc chưa bật Generative Language API
 *   400 API_KEY_INVALID   — key gõ sai, thiếu ký tự
 */
function isDeadKeyError(err: unknown): boolean {
  const text = errorToText(err);

  return (
    text.includes('permission_denied') ||
    text.includes('unauthenticated') ||
    text.includes('api_key_invalid') ||
    text.includes('api key not valid') ||
    text.includes('denied access') ||
    text.includes('403') ||
    text.includes('401')
  );
}

/**
 * Loại một key ra khỏi hồ vĩnh viễn (trong phiên chạy này).
 *
 * Ghi log ở mức ERROR chứ không phải WARN: đây là việc BẠN PHẢI XỬ LÝ,
 * không phải chuyện tự khỏi như hết quota. Thông báo nêu rõ phải làm gì,
 * vì "PERMISSION_DENIED" một mình chẳng nói lên điều gì với người đọc log.
 */
function disableKey(slot: KeySlot, reason: string): void {
  slot.disabled = true;
  slot.disabledReason = reason.slice(0, 200);
  slot.otherErrors += 1;

  const remaining = getPool().filter((s) => !s.disabled).length;

  logger.error(
    [
      '[Gemini] Key ' + slot.label + ' BỊ LOẠI khỏi hồ — ' + reason.slice(0, 120),
      '    Đây KHÔNG phải hết quota, chờ bao lâu cũng không khỏi. Cần kiểm tra:',
      '      1. Dự án Google Cloud của key có bị chặn / đình chỉ không?',
      '      2. Đã bật Generative Language API cho dự án đó chưa?',
      '      3. Key có bị dán thiếu ký tự vào .env không?',
      '    Tạo key mới tại https://aistudio.google.com/apikey rồi thay vào GEMINI_API_KEYS.',
      '    Còn lại ' + remaining + '/' + getPool().length + ' key dùng được.',
    ].join('\n')
  );
}

/** Đánh dấu một key vừa dính 429 -> cho nghỉ và ghi log cảnh báo */
function penalize(slot: KeySlot): void {
  slot.cooldownUntil = Date.now() + env.GEMINI_KEY_COOLDOWN_MS;
  slot.quotaErrors += 1;
  logger.warn(
    '[Gemini] Key ' +
      slot.label +
      ' hết lượt (429) — cho nghỉ ' +
      env.GEMINI_KEY_COOLDOWN_MS +
      'ms, chuyển sang key khác.'
  );
}

/**
 * ⭐ HÀM QUAN TRỌNG NHẤT FILE NÀY.
 *
 * Bọc một lời gọi Gemini bất kỳ và tự lo chuyện đổi key khi hết quota.
 *
 * Cách dùng:
 *
 *   const text = await runWithKeyRotation('ocr', async (client) => {
 *     const res = await client.models.generateContent({ ... });
 *     return res.text ?? '';
 *   });
 *
 * Hàm callback nhận vào client đã gắn sẵn key — người viết không cần biết
 * key nào đang được dùng, cũng không cần viết lại logic thử lại.
 *
 * @param taskName Tên tác vụ, chỉ để ghi log cho dễ truy vết ("ocr", "chat"…)
 * @param fn       Việc cần làm với client Gemini
 * @returns        Kết quả của fn, hoặc null nếu mọi key đều bận/hỏng
 */
export async function runWithKeyRotation<T>(
  taskName: string,
  fn: (client: GoogleGenAI) => Promise<T>
): Promise<T | null> {
  const total = getKeyCount();
  if (total === 0) return null;

  // Thử nhiều nhất bằng đúng số key đang có: mỗi key được một cơ hội.
  // Thử nhiều hơn cũng vô nghĩa vì đã đi hết hồ.
  let lastError: unknown = null;

  for (let attempt = 0; attempt < total; attempt += 1) {
    const slot = acquireSlot();

    if (!slot) {
      // Cả hồ đang bị phạt nghỉ. Không cố nữa — trả null để nơi gọi
      // dùng phương án dự phòng, thay vì bắt người dùng chờ vô ích.
      logger.warn(
        '[Gemini:' +
          taskName +
          '] Toàn bộ ' +
          total +
          ' key đang trong thời gian nghỉ. Dùng phương án dự phòng. ' +
          'Cân nhắc bổ sung thêm key vào GEMINI_API_KEYS.'
      );
      return null;
    }

    try {
      const result = await fn(slot.client);
      slot.okCount += 1;
      return result;
    } catch (err) {
      lastError = err;

      // --- Loại 1: tạm hết lượt -> cho nghỉ, đổi key, thử lại ---
      if (isQuotaError(err)) {
        penalize(slot);
        continue; // vòng lặp sẽ tự lấy key kế tiếp
      }

      // --- Loại 2: key hỏng vĩnh viễn -> loại khỏi hồ, đổi key, thử lại ---
      /**
       * Điểm khác biệt với loại 1: key này sẽ KHÔNG BAO GIỜ quay lại hàng đợi
       * trong phiên chạy hiện tại. Nhưng lời gọi vẫn `continue` để các key còn
       * tốt gánh tiếp — đúng tinh thần "một key hỏng không được làm hỏng
       * cả dịch vụ". Xem giải thích đầy đủ ở isDeadKeyError().
       */
      if (isDeadKeyError(err)) {
        disableKey(slot, err instanceof Error ? err.message : String(err));
        continue;
      }

      // --- Loại 3: lỗi thật sự khác (prompt sai, model không tồn tại, mất
      // mạng, 500 phía Google): đổi key cũng không cứu được -> dừng ngay,
      // đỡ đốt thêm lượt gọi của các key còn tốt. ---
      slot.otherErrors += 1;
      logger.error(
        '[Gemini:' +
          taskName +
          '] Lỗi không phải quota với key ' +
          slot.label +
          ': ' +
          (err instanceof Error ? err.message : String(err))
      );
      return null;
    }
  }

  logger.error(
    '[Gemini:' +
      taskName +
      '] Đã thử hết ' +
      total +
      ' key nhưng key nào cũng hết lượt. ' +
      'Hãy thêm key mới vào GEMINI_API_KEYS trong .env ở gốc repo.',
    { lastError: lastError instanceof Error ? lastError.message : String(lastError) }
  );
  return null;
}

/**
 * Ảnh chụp tình trạng hồ key — phục vụ GET /api/v1/ai/status.
 *
 * ⚠️ Chỉ trả về label ĐÃ CHE. Endpoint này có thể public, tuyệt đối không
 * để lọt key thật ra ngoài.
 */
export function getPoolStats() {
  const now = Date.now();
  const slots = getPool();

  return {
    total: slots.length,
    /**
     * ⚠️ "available" phải loại BỎ CẢ key bị vô hiệu hoá, không chỉ key đang nghỉ.
     * Đếm thiếu điều kiện `!s.disabled` sẽ báo "3/3 key sẵn sàng" trong khi
     * thực tế chỉ có 2 key chạy được — đúng kiểu con số làm người ta yên tâm
     * sai chỗ, rồi không hiểu vì sao mọi thứ vẫn chậm.
     */
    available: slots.filter((s) => !s.disabled && s.cooldownUntil <= now).length,
    cooling: slots.filter((s) => !s.disabled && s.cooldownUntil > now).length,
    /** Số key hỏng vĩnh viễn — khác 0 nghĩa là bạn cần thay key */
    disabled: slots.filter((s) => s.disabled).length,
    keys: slots.map((s) => ({
      label: s.label,
      status: s.disabled
        ? ('disabled' as const)
        : s.cooldownUntil > now
          ? ('cooling' as const)
          : ('ready' as const),
      /** Còn bao nhiêu giây nữa key này được dùng lại (0 nếu đang rảnh) */
      cooldownSeconds: Math.max(0, Math.ceil((s.cooldownUntil - now) / 1000)),
      /** Vì sao bị loại — null nếu key vẫn tốt. Giúp bạn biết đường mà sửa. */
      disabledReason: s.disabledReason,
      okCount: s.okCount,
      quotaErrors: s.quotaErrors,
      otherErrors: s.otherErrors,
    })),
  };
}

/**
 * Dùng trong kiểm thử: xoá hồ để lần gọi sau khởi tạo lại từ đầu.
 * KHÔNG gọi hàm này trong code chạy thật.
 */
export function resetPoolForTesting(): void {
  pool = null;
  cursor = 0;
}
