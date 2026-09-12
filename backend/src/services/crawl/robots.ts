/**
 * ============================================================================
 * SERVICES/CRAWL/ROBOTS.TS — ĐỌC VÀ TUÂN THỦ robots.txt
 * ============================================================================
 *
 * ⚖️ robots.txt LÀ GÌ VÀ VÌ SAO PHẢI TUÂN THỦ?
 *
 * Mỗi website đặt ở gốc tên miền một file text tên robots.txt, ghi rõ đường
 * dẫn nào cho phép bot truy cập, đường nào không:
 *
 *     User-agent: *
 *     Disallow: /admin/
 *     Disallow: /api/
 *     Crawl-delay: 2
 *
 * Về kỹ thuật, bạn hoàn toàn có thể phớt lờ nó. Nhưng:
 *
 *   1. 📜 PHÁP LÝ — nhiều nước coi việc cố tình vượt rào kỹ thuật là truy cập
 *      trái phép. Vụ kiện hiaQ vs LinkedIn cho thấy ranh giới này rất mong manh.
 *   2. 🚫 THỰC TẾ — bỏ qua robots.txt là cách nhanh nhất để IP của bạn bị chặn
 *      vĩnh viễn. Lúc đó dự án mất luôn nguồn dữ liệu.
 *   3. 🤝 ĐẠO ĐỨC — người ta dựng máy chủ bằng tiền của họ. Tôn trọng lời họ
 *      đã ghi rõ ràng là phép lịch sự tối thiểu.
 *
 * File này cài đặt một bộ phân tích robots.txt gọn nhẹ, đủ dùng cho các
 * chỉ thị phổ biến: User-agent, Allow, Disallow, Crawl-delay.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ KHÔNG hỗ trợ: Sitemap, Host, và biểu thức chính quy đầy đủ. Với các
 * trang tin tức Việt Nam thông thường, ngần này là đủ. Cần chuẩn xác tuyệt đối
 * thì hãy dùng thư viện `robots-parser`.
 * ============================================================================
 */

import axios from 'axios';
import { env } from '@/config/env';
import { logger } from '@/utils/logger';

/** Luật đã phân tích cho MỘT tên miền */
interface RobotsRules {
  /** Các đường dẫn bị cấm, ví dụ ['/admin/', '/api/'] */
  disallow: string[];
  /** Các đường dẫn được cho phép rõ ràng — Allow thắng Disallow khi khớp dài hơn */
  allow: string[];
  /** Số giây trang web yêu cầu nghỉ giữa hai lần truy cập (nếu có khai báo) */
  crawlDelayMs: number | null;
  /** Thời điểm tải luật này về, dùng để làm mới sau 1 giờ */
  fetchedAt: number;
}

/**
 * Bộ nhớ tạm theo tên miền.
 *
 * VÌ SAO PHẢI CACHE? Không cache thì crawl 50 trang của cùng một báo sẽ tải
 * robots.txt đúng 50 lần — vừa chậm, vừa là hành vi thiếu lịch sự y như thứ
 * mà file này sinh ra để ngăn chặn.
 */
const cache = new Map<string, RobotsRules>();

/** Luật sống 1 giờ rồi tải lại — website có thể sửa robots.txt bất cứ lúc nào */
const CACHE_TTL_MS = 60 * 60 * 1000;

/**
 * Phân tích nội dung robots.txt thô thành luật áp dụng cho bot CỦA TA.
 *
 * 🔍 QUY TẮC CHỌN KHỐI LỆNH (phần dễ làm sai nhất):
 * Một file robots.txt có nhiều khối, mỗi khối bắt đầu bằng User-agent.
 * Ta chỉ áp dụng khối khớp với User-Agent của mình, ưu tiên:
 *   1. Khối ghi đích danh tên bot của ta   (cụ thể nhất -> ưu tiên cao nhất)
 *   2. Khối "User-agent: *"                 (luật chung)
 * Khối dành cho Googlebot, Bingbot... KHÔNG áp dụng cho ta.
 */
function parseRobots(content: string, userAgent: string): RobotsRules {
  const rules: RobotsRules = {
    disallow: [],
    allow: [],
    crawlDelayMs: null,
    fetchedAt: Date.now(),
  };

  // "VietNamFootballBot/1.0 (+lien he: ...)" -> "vietnamfootballbot"
  const ourAgent = (userAgent.toLowerCase().split('/')[0] ?? '').trim();

  /**
   * Ba trạng thái khi duyệt file:
   *   'none'     — đang ở khối không liên quan tới ta
   *   'wildcard' — đang trong khối "User-agent: *"
   *   'exact'    — đang trong khối ghi đích danh tên bot ta (ưu tiên cao nhất)
   */
  let section: 'none' | 'wildcard' | 'exact' = 'none';
  /** Đã gặp khối đích danh chưa — nếu có thì bỏ hết luật của khối wildcard */
  let foundExactBlock = false;

  for (const rawLine of content.split('\n')) {
    // Bỏ phần chú thích sau dấu #
    const line = (rawLine.split('#')[0] ?? '').trim();
    if (!line) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex < 0) continue;

    const directive = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (directive === 'user-agent') {
      const agent = value.toLowerCase();
      if (agent === '*') {
        section = 'wildcard';
      } else if (ourAgent.includes(agent) || agent.includes(ourAgent)) {
        section = 'exact';
        if (!foundExactBlock) {
          // Gặp khối đích danh -> vứt bỏ những gì đã thu từ khối chung,
          // vì luật cụ thể luôn thắng luật chung.
          rules.disallow = [];
          rules.allow = [];
          foundExactBlock = true;
        }
      } else {
        section = 'none';
      }
      continue;
    }

    // Đang ở khối không liên quan, hoặc đã có khối đích danh mà dòng này
    // thuộc khối chung -> bỏ qua.
    if (section === 'none') continue;
    if (foundExactBlock && section === 'wildcard') continue;

    if (directive === 'disallow' && value) rules.disallow.push(value);
    else if (directive === 'allow' && value) rules.allow.push(value);
    else if (directive === 'crawl-delay') {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds > 0) rules.crawlDelayMs = seconds * 1000;
    }
  }

  return rules;
}

/**
 * Lấy luật robots.txt của một tên miền (có cache).
 *
 * 🛟 XỬ LÝ KHI KHÔNG TẢI ĐƯỢC — đây là quyết định thiết kế quan trọng:
 * Không có robots.txt (lỗi 404) nghĩa là trang web KHÔNG đặt ra hạn chế nào.
 * Theo chuẩn, mặc định lúc đó là CHO PHÉP TẤT CẢ. Ta trả về luật rỗng chứ
 * không chặn — chặn hết thì crawler sẽ không làm được gì với phần lớn website.
 */
async function fetchRobots(origin: string): Promise<RobotsRules> {
  const cached = cache.get(origin);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached;

  const empty: RobotsRules = { disallow: [], allow: [], crawlDelayMs: null, fetchedAt: Date.now() };

  try {
    const { data } = await axios.get<string>(origin + '/robots.txt', {
      timeout: 10_000,
      headers: { 'User-Agent': env.CRAWLER_USER_AGENT },
      responseType: 'text',
      // Tự xử lý mọi mã trạng thái thay vì để axios ném lỗi với 404
      validateStatus: () => true,
    });

    const rules = typeof data === 'string' ? parseRobots(data, env.CRAWLER_USER_AGENT) : empty;
    cache.set(origin, rules);

    if (rules.disallow.length > 0) {
      logger.debug(
        '[robots] ' + origin + ' cấm ' + rules.disallow.length + ' đường dẫn: ' +
          rules.disallow.slice(0, 5).join(', ')
      );
    }
    return rules;
  } catch {
    // Mất mạng / máy chủ không phản hồi -> coi như không có hạn chế,
    // nhưng vẫn cache để khỏi thử lại liên tục trong cùng một phiên crawl.
    cache.set(origin, empty);
    return empty;
  }
}

/**
 * ⭐ Kiểm tra: URL này có được phép cào không?
 *
 * 📐 QUY TẮC "KHỚP DÀI NHẤT THẮNG" — điểm tinh tế của chuẩn robots.txt:
 *
 *     Disallow: /tin-tuc/
 *     Allow:    /tin-tuc/bong-da/
 *
 * Với /tin-tuc/bong-da/viet-nam: Disallow khớp 10 ký tự, Allow khớp 18 ký tự.
 * Allow khớp DÀI HƠN nên thắng -> được phép cào.
 *
 * Hiểu sai quy tắc này sẽ dẫn tới một trong hai lỗi: hoặc cào cả vùng bị cấm
 * (rủi ro pháp lý), hoặc bỏ sót vùng được phép (mất dữ liệu).
 */
export async function isAllowed(url: string): Promise<boolean> {
  // Người dùng chủ động tắt kiểm tra. Chỉ nên làm vậy với website của CHÍNH BẠN.
  if (!env.CRAWLER_RESPECT_ROBOTS) return true;

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false; // URL sai định dạng thì không cào
  }

  const rules = await fetchRobots(parsed.origin);
  const pathWithQuery = parsed.pathname + parsed.search;

  /** Độ dài phần khớp; 0 = không khớp luật nào */
  const matchLength = (patterns: string[]): number => {
    let longest = 0;
    for (const pattern of patterns) {
      // "Disallow: /" nghĩa là cấm toàn bộ site
      if (pattern === '/' && pathWithQuery.startsWith('/')) {
        longest = Math.max(longest, 1);
      } else if (pathWithQuery.startsWith(pattern)) {
        longest = Math.max(longest, pattern.length);
      }
    }
    return longest;
  };

  const disallowMatch = matchLength(rules.disallow);
  const allowMatch = matchLength(rules.allow);

  // Không luật cấm nào khớp -> cho phép
  if (disallowMatch === 0) return true;

  // Có cả hai -> luật nào khớp DÀI HƠN thì thắng (hoà thì Allow thắng)
  return allowMatch >= disallowMatch;
}

/**
 * Lấy khoảng nghỉ mà website yêu cầu, tính bằng mili-giây.
 *
 * Trả về số LỚN HƠN giữa hai giá trị: Crawl-delay của website và
 * CRAWLER_DELAY_MS trong .env. Nghĩa là ta luôn lịch sự ít nhất bằng mức
 * họ yêu cầu — website bảo nghỉ 5 giây thì ta nghỉ 5 giây, dù .env chỉ đặt 1,5s.
 */
export async function getCrawlDelay(url: string): Promise<number> {
  try {
    const rules = await fetchRobots(new URL(url).origin);
    return Math.max(env.CRAWLER_DELAY_MS, rules.crawlDelayMs ?? 0);
  } catch {
    return env.CRAWLER_DELAY_MS;
  }
}
