/**
 * ============================================================================
 * SERVICES/CRAWL/EXTRACT.TS — BÓC NỘI DUNG THẬT RA KHỎI TRANG HTML
 * ============================================================================
 *
 * 🎯 BÀI TOÁN: một trang báo có khoảng 5% là bài viết, 95% còn lại là menu,
 * quảng cáo, "tin liên quan", chân trang, nút chia sẻ, ô bình luận...
 * Nhét cả 95% rác đó vào kho tri thức thì mọi tìm kiếm đều trả về menu.
 *
 * 💡 GIẢI PHÁP HAI TẦNG — rẻ trước, đắt sau:
 *
 *   TẦNG 1 — cheerio (MIỄN PHÍ, chạy trong tích tắc)
 *     Xoá thẳng các thẻ chắc chắn là rác (script, style, nav, footer...),
 *     rồi tìm khối nội dung chính bằng danh sách selector ưu tiên.
 *     Xử lý gọn khoảng 80% số trang.
 *
 *   TẦNG 2 — Gemini (TỐN QUOTA, chỉ dùng khi cần)
 *     Với trang có cấu trúc lạ, đưa phần chữ thô cho AI làm sạch và bóc tách
 *     thành các trường có cấu trúc. AI còn trả lời được câu hỏi quan trọng:
 *     "trang này có thực sự nói về bóng đá Việt Nam không?"
 *
 * ⭐ VÌ SAO PHẢI PHÂN TẦNG? Vì gọi AI cho MỌI trang sẽ đốt sạch quota trong
 * vài chục trang đầu. Làm việc rẻ trước, chỉ trả tiền cho phần việc khó —
 * đây là nguyên tắc chung khi xây pipeline có dùng AI.
 * ============================================================================
 */

import * as cheerio from 'cheerio';
import { env } from '@/config/env';
import { runWithKeyRotation, isGeminiEnabled, EXTRACTION_SCHEMA } from '@/config/gemini';
import { logger } from '@/utils/logger';
import { cleanWhitespace } from '@/utils/text';

/** Kết quả bóc tách một trang */
export interface ExtractedPage {
  title: string;
  summary: string;
  content: string;
  /** YYYY-MM-DD hoặc chuỗi rỗng */
  publishedAt: string;
  tags: string[];
  /** false = trang lạc đề, không nên lưu vào kho tri thức */
  isRelevant: boolean;
  /** Các link tìm thấy trong trang, để crawler đi tiếp (đã đổi sang URL tuyệt đối) */
  links: string[];
  /** 'cheerio' hay 'gemini' — biết trang nào đã tốn quota */
  method: 'cheerio' | 'gemini';
}

/**
 * Các thẻ CHẮC CHẮN là rác trên mọi website. Xoá không cần suy nghĩ.
 *
 * Đặc biệt lưu ý `script` và `style`: nếu không xoá, toàn bộ mã JavaScript
 * và CSS sẽ lọt vào phần "nội dung" — hàng nghìn ký tự vô nghĩa, vừa làm hỏng
 * kết quả tìm kiếm vừa đốt token khi gửi cho AI.
 */
const NOISE_SELECTORS = [
  'script', 'style', 'noscript', 'iframe', 'svg', 'canvas',
  'nav', 'header', 'footer', 'aside',
  'form', 'button', 'input', 'select',
  '.advertisement', '.ads', '.ad-container', '[id*="google_ads"]',
  '.comment', '.comments', '#comments',
  '.social-share', '.share-buttons', '.related-news', '.related-posts',
  '.breadcrumb', '.pagination', '.sidebar', '.menu', '.navbar',
  '.cookie-banner', '.newsletter', '.popup', '.modal',
];

/**
 * Selector tìm khối nội dung chính, XẾP THEO ĐỘ TIN CẬY GIẢM DẦN.
 *
 * Thứ tự ở đây rất quan trọng: `<article>` là thẻ ngữ nghĩa chuẩn HTML5,
 * gần như luôn bao đúng bài viết. Còn `.content` là tên lớp chung chung,
 * nhiều trang dùng nó cho cả trang -> để cuối cùng, chỉ dùng khi hết cách.
 */
const CONTENT_SELECTORS = [
  'article',
  '[itemprop="articleBody"]',
  '.article-content',
  '.article-body',
  '.post-content',
  '.entry-content',
  '.detail-content',
  '#main-detail',       // định dạng phổ biến của báo Việt Nam
  '.fck_detail',        // VnExpress
  '.detail__content',
  'main',
  '.content',
];

// ---------------------------------------------------------------------------
// TẦNG 1 — BÓC BẰNG CHEERIO
// ---------------------------------------------------------------------------

/**
 * Bóc nội dung bằng cách phân tích cấu trúc HTML. Không tốn một đồng nào.
 *
 * @param html    Mã HTML thô
 * @param baseUrl URL của trang — cần để đổi link tương đối ("/tin/abc")
 *                thành link tuyệt đối ("https://bao.vn/tin/abc")
 */
export function extractWithCheerio(html: string, baseUrl: string): ExtractedPage {
  const $ = cheerio.load(html);

  // --- B1: lấy các thông tin ở phần <head> TRƯỚC KHI xoá rác ---

  /**
   * Ưu tiên og:title (thẻ Open Graph dùng cho mạng xã hội) hơn <title>,
   * vì <title> thường bị nhét thêm tên báo: "Tiến Linh ghi bàn - Báo ABC".
   * og:title sạch hơn: "Tiến Linh ghi bàn".
   */
  const title =
    $('meta[property="og:title"]').attr('content')?.trim() ||
    $('h1').first().text().trim() ||
    $('title').text().trim() ||
    'Không có tiêu đề';

  const summary =
    $('meta[property="og:description"]').attr('content')?.trim() ||
    $('meta[name="description"]').attr('content')?.trim() ||
    '';

  /**
   * Ngày đăng — thử lần lượt nhiều cách khai báo khác nhau.
   * Mỗi website làm một kiểu, không có chuẩn nào được tuân thủ tuyệt đối.
   */
  const publishedRaw =
    $('meta[property="article:published_time"]').attr('content') ||
    $('meta[itemprop="datePublished"]').attr('content') ||
    $('time[datetime]').first().attr('datetime') ||
    '';
  // Cắt lấy đúng phần YYYY-MM-DD, bỏ phần giờ phút và múi giờ
  const publishedAt = /^\d{4}-\d{2}-\d{2}/.test(publishedRaw) ? publishedRaw.slice(0, 10) : '';

  // --- B2: thu thập link TRƯỚC khi xoá nav (link điều hướng cũng đáng đi tiếp) ---
  const links = new Set<string>();
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    if (!href) return;
    try {
      // new URL(href, baseUrl) tự xử lý mọi dạng: "/a", "../b", "https://c"
      const absolute = new URL(href, baseUrl);
      // Chỉ giữ http/https — loại bỏ mailto:, tel:, javascript:
      if (absolute.protocol === 'http:' || absolute.protocol === 'https:') {
        absolute.hash = ''; // bỏ phần #neo, vì nó vẫn là cùng một trang
        links.add(absolute.toString());
      }
    } catch {
      // href hỏng -> bỏ qua, không làm gián đoạn việc bóc tách
    }
  });

  // --- B3: xoá rác ---
  for (const selector of NOISE_SELECTORS) {
    $(selector).remove();
  }

  // --- B4: tìm khối nội dung chính ---
  let content = '';
  for (const selector of CONTENT_SELECTORS) {
    const node = $(selector).first();
    if (node.length > 0) {
      const text = node.text();
      /**
       * Ngưỡng 200 ký tự: dưới mức này gần như chắc chắn ta bắt nhầm một cái
       * hộp trang trí chứ không phải bài viết. Thà thử selector tiếp theo.
       */
      if (text.trim().length > 200) {
        content = text;
        break;
      }
    }
  }

  // Không selector nào ăn -> lấy cả <body>. Bẩn hơn, nhưng còn hơn rỗng.
  if (!content) content = $('body').text();

  return {
    title: title.slice(0, 200),
    summary: summary.slice(0, 500),
    content: cleanWhitespace(content),
    publishedAt,
    tags: [],
    /**
     * cheerio không "hiểu" nội dung nên không thể đánh giá mức liên quan.
     * Mặc định true; tầng Gemini (nếu chạy) sẽ đưa ra phán quyết thật sự.
     */
    isRelevant: true,
    links: Array.from(links),
    method: 'cheerio',
  };
}

// ---------------------------------------------------------------------------
// TẦNG 2 — LÀM SẠCH BẰNG GEMINI
// ---------------------------------------------------------------------------

/**
 * Nhờ Gemini làm sạch và bóc tách phần văn bản thô.
 *
 * KHI NÀO NÊN GỌI HÀM NÀY?
 *   • cheerio trả về nội dung quá ngắn (< 300 ký tự) — nhiều khả năng bắt hụt
 *   • Cần biết chắc trang có liên quan bóng đá Việt Nam hay không
 *   • Cần trích ngày đăng mà trang không khai báo thẻ meta chuẩn
 *
 * 💰 Mỗi lần gọi tốn một lượt quota. Hàm `extractPage()` bên dưới đã cài sẵn
 * logic quyết định khi nào cần gọi — hãy dùng hàm đó thay vì gọi thẳng đây.
 */
export async function refineWithGemini(
  rawText: string,
  url: string
): Promise<Partial<ExtractedPage> | null> {
  if (!isGeminiEnabled()) return null;

  /**
   * Chỉ gửi 12.000 ký tự đầu. Bài báo dài hơn thế thì phần đầu đã chứa toàn
   * bộ thông tin cốt lõi (nguyên tắc "kim tự tháp ngược" của báo chí), trong
   * khi gửi cả bài 50.000 ký tự làm chi phí tăng gấp bốn lần mà chẳng thêm
   * được bao nhiêu giá trị.
   */
  const excerpt = rawText.slice(0, 12_000);

  const prompt = [
    'Bạn là biên tập viên chuyên trang bóng đá Việt Nam.',
    '',
    'Dưới đây là phần chữ thô lấy từ trang: ' + url,
    'Hãy làm sạch và bóc tách theo đúng cấu trúc JSON đã quy định.',
    '',
    'Quy tắc bắt buộc:',
    '- Bỏ toàn bộ menu, quảng cáo, "tin liên quan", chân trang, lời mời đăng ký.',
    '- Giữ NGUYÊN mọi con số, tên riêng, tỷ số và dấu tiếng Việt.',
    '- published_at: chỉ điền khi trang GHI RÕ ngày. Không thấy thì để chuỗi rỗng. Không được suy đoán.',
    '- is_relevant: đặt false nếu trang không nói về bóng đá Việt Nam',
    '  (ví dụ: trang chủ, trang lỗi, tin showbiz, quảng cáo).',
    '- TUYỆT ĐỐI không thêm thông tin không có trong văn bản gốc.',
    '',
    '--- VĂN BẢN THÔ ---',
    excerpt,
  ].join('\n');

  const raw = await runWithKeyRotation('extract', async (client) => {
    const response = await client.models.generateContent({
      model: env.GEMINI_MODEL,
      contents: prompt,
      config: {
        temperature: 0, // bóc tách là việc chính xác, không phải việc sáng tạo
        maxOutputTokens: 8192,
        responseMimeType: 'application/json',
        responseSchema: EXTRACTION_SCHEMA as never,
      },
    });
    return response.text ?? '';
  });

  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as {
      title: string;
      summary: string;
      content: string;
      published_at: string;
      tags: string[];
      is_relevant: boolean;
    };

    return {
      title: parsed.title?.slice(0, 200),
      summary: parsed.summary?.slice(0, 500),
      content: cleanWhitespace(parsed.content ?? ''),
      publishedAt: /^\d{4}-\d{2}-\d{2}$/.test(parsed.published_at) ? parsed.published_at : '',
      tags: Array.isArray(parsed.tags) ? parsed.tags.slice(0, 8).map(String) : [],
      isRelevant: Boolean(parsed.is_relevant),
      method: 'gemini',
    };
  } catch {
    logger.error('[extract] Gemini trả JSON không hợp lệ cho ' + url);
    return null;
  }
}

// ---------------------------------------------------------------------------
// HÀM CÔNG KHAI — GHÉP HAI TẦNG
// ---------------------------------------------------------------------------

/**
 * ⭐ Bóc tách một trang, tự quyết định có cần gọi AI hay không.
 *
 * @param useAi false = chỉ dùng cheerio, không tốn một lượt quota nào.
 *              Rất hữu ích khi bạn muốn crawl thử trước để xem cấu trúc.
 */
export async function extractPage(
  html: string,
  url: string,
  useAi = true
): Promise<ExtractedPage> {
  const base = extractWithCheerio(html, url);

  if (!useAi || !isGeminiEnabled()) return base;

  /**
   * 🚦 LUẬT QUYẾT ĐỊNH GỌI AI — cân giữa chất lượng và chi phí:
   *
   *   < 300 ký tự      : cheerio hụt rồi, AI may ra cứu được  -> GỌI
   *   > 300 ký tự và
   *   có cả tiêu đề    : cheerio làm tốt                      -> KHÔNG GỌI
   *   nội dung rất dài : nhiều khả năng lẫn cả menu vào       -> GỌI để lọc
   *
   * Ba nhánh này giúp phần lớn trang được xử lý miễn phí, chỉ trả tiền cho
   * những trang thật sự khó.
   */
  const tooShort = base.content.length < 300;
  const suspiciouslyLong = base.content.length > 20_000;

  if (!tooShort && !suspiciouslyLong) {
    logger.debug('[extract] cheerio xử lý ổn (' + base.content.length + ' ký tự) — không gọi AI.');
    return base;
  }

  /**
   * 🚫 NGOẠI LỆ QUAN TRỌNG: TRANG ẢNH / TRANG MỤC LỤC — ĐỪNG GỌI AI.
   *
   * 🐛 LÃNG PHÍ CÓ THẬT ĐÃ QUAN SÁT ĐƯỢC trong lúc crawl vff.org.vn:
   *
   *     [extract] Gọi Gemini làm sạch .../thu-vien/mot-so-hinh-anh-doi-tuyen-nu...
   *               (lý do: nội dung quá ngắn)
   *
   * Đó là một trang THƯ VIỆN ẢNH. Nó ngắn không phải vì cheerio bóc hụt, mà
   * vì trang đó vốn CHỈ CÓ ẢNH — chẳng có bài viết nào để bóc. Gọi AI chỉ tốn
   * đúng một lượt quota để nhận về tay trắng.
   *
   * Với hàng chục trang ảnh trên một website tin tức, chỗ lãng phí này cộng
   * dồn rất nhanh — và nó chính là thứ đẩy các key vào trạng thái 429.
   *
   * 💡 DẤU HIỆU NHẬN BIẾT: trang mà cheerio ĐÃ lấy được tiêu đề tử tế VÀ mô tả
   * (og:description) nhưng thân bài vẫn ngắn ngủn. Cặp "có tiêu đề + có mô tả
   * + không có nội dung" gần như luôn là trang ảnh, trang mục lục hoặc trang
   * chuyển hướng. Cheerio đã lấy được đúng phần có giá trị; AI không thêm gì.
   *
   * ⚠️ Chỉ áp dụng cho nhánh "quá ngắn". Trang quá DÀI vẫn phải gọi AI để lọc
   * bớt menu, vì ở đó chắc chắn có nội dung thật lẫn bên trong.
   */
  const looksLikeGallery =
    tooShort && base.title.length > 10 && base.summary.length > 30 && base.content.length < 300;

  if (looksLikeGallery) {
    logger.debug(
      '[extract] Bỏ qua AI cho trang ảnh/mục lục (đã có tiêu đề + mô tả, thân bài ' +
        base.content.length +
        ' ký tự): ' +
        url
    );
    /**
     * Trả về nội dung ghép từ tiêu đề + mô tả. Ngắn nhưng ĐÚNG, và vẫn đủ để
     * tìm kiếm khớp được khi người dùng hỏi về chủ đề của trang ảnh đó.
     * (Crawler sẽ tự bỏ qua nếu tổng vẫn dưới 200 ký tự — xem crawler.ts.)
     */
    return { ...base, content: cleanWhitespace(base.title + '\n\n' + base.summary) };
  }

  logger.info(
    '[extract] Gọi Gemini làm sạch ' + url +
      ' (lý do: ' + (tooShort ? 'nội dung quá ngắn' : 'nội dung quá dài, nghi lẫn menu') + ')'
  );

  const refined = await refineWithGemini(base.content || html, url);
  if (!refined) return base;

  /**
   * Trộn kết quả: ưu tiên phần AI làm, nhưng GIỮ LẠI `links` từ cheerio.
   * AI không trả về link (và cũng không nên bắt nó làm việc đó — vừa tốn
   * token vừa dễ bịa ra URL không tồn tại). Còn cheerio đọc link từ DOM
   * nên luôn chính xác tuyệt đối.
   */
  return {
    ...base,
    ...refined,
    links: base.links,
    method: 'gemini',
  };
}
