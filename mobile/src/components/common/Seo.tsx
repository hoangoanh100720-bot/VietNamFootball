/**
 * ============================================================================
 * COMPONENTS/COMMON/SEO.TSX — THẺ SEO RIÊNG CHO TỪNG MÀN HÌNH
 * ============================================================================
 *
 * 🎯 VÌ SAO CẦN, KHI ĐÃ CÓ +html.tsx?
 *
 * `app/+html.tsx` đặt thẻ meta cho TOÀN BỘ trang web — mọi màn hình dùng
 * chung một title, một description. Nhưng SEO tốt đòi hỏi MỖI trang có
 * title và mô tả RIÊNG:
 *
 *   ❌ Mọi trang đều "Đội tuyển Việt Nam"
 *      -> Google thấy 5 trang trùng tiêu đề, coi là nội dung trùng lặp,
 *         và chỉ chọn một trang để hiện. Bốn trang kia coi như vô hình.
 *
 *   ✅ Mỗi trang một tiêu đề riêng
 *      -> "Đội hình ra sân · Đội tuyển Việt Nam"
 *      -> "Cầu thủ & HLV · Đội tuyển Việt Nam"
 *      -> mỗi trang có cơ hội lên top cho một nhóm từ khoá khác nhau
 *
 * ----------------------------------------------------------------------------
 * 📱 TRÊN iOS/ANDROID THÌ SAO?
 *
 * `expo-router/head` không chỉ dùng cho web. Trên iOS nó nạp thông tin vào
 * CoreSpotlight và Handoff, nghĩa là:
 *   • Người dùng vuốt xuống tìm kiếm trên iPhone, gõ "đội hình" -> màn hình
 *     này hiện ra trong kết quả, bấm vào là mở thẳng đúng chỗ
 *   • Đang xem trên iPhone, mở MacBook lên là tiếp tục được ngay (Handoff)
 *
 * Một component, hai nền tảng, hai lợi ích hoàn toàn khác nhau.
 *
 * ----------------------------------------------------------------------------
 * 💡 CÁCH DÙNG — đặt ngay dòng đầu tiên trong phần return của màn hình:
 *
 *   export default function SquadTab() {
 *     return (
 *       <Screen>
 *         <Seo
 *           title="Đội hình ra sân"
 *           description="Sơ đồ chiến thuật và danh sách cầu thủ ra sân..."
 *           path="/squad"
 *         />
 *         ...
 *       </Screen>
 *     );
 *   }
 * ============================================================================
 */

import Head from 'expo-router/head';

/** ⚠️ Phải TRÙNG với SITE_URL trong app/+html.tsx */
const SITE_URL = 'https://doituyenvietnam.vn';
const SITE_NAME = 'Đội tuyển Việt Nam';

interface SeoProps {
  /**
   * Tiêu đề RIÊNG của màn hình, KHÔNG kèm tên thương hiệu — component tự nối
   * " · Đội tuyển Việt Nam" vào sau.
   *
   * 📏 Giữ dưới 35 ký tự: cộng thêm phần thương hiệu là vừa đúng 60 ký tự,
   * ngưỡng mà Google bắt đầu cắt đuôi tiêu đề bằng dấu "…".
   */
  title: string;

  /**
   * Mô tả riêng, 150-160 ký tự.
   *
   * ⚠️ MỖI MÀN HÌNH PHẢI CÓ MÔ TẢ KHÁC NHAU. Sao chép cùng một đoạn cho mọi
   * trang là một trong những lỗi SEO phổ biến nhất, và Google Search Console
   * sẽ báo thẳng vào mặt bạn: "Duplicate meta descriptions".
   */
  description: string;

  /** Đường dẫn của màn hình, ví dụ '/squad'. Dùng để dựng thẻ canonical. */
  path: string;

  /** Ảnh xem trước khi chia sẻ. Bỏ trống thì dùng ảnh mặc định của site. */
  image?: string;

  /**
   * true = bảo cỗ máy tìm kiếm ĐỪNG lập chỉ mục trang này.
   *
   * Dùng cho những trang không có giá trị với người tìm kiếm — và quan trọng
   * hơn, cho trang riêng tư: màn hình đăng nhập, trang hồ sơ cá nhân.
   * Những trang đó lọt vào kết quả Google vừa vô ích vừa có thể lộ thông tin.
   */
  noIndex?: boolean;
}

export function Seo({ title, description, path, image, noIndex = false }: SeoProps) {
  // Dấu "·" ngăn cách đọc dễ hơn dấu "|" và không bị nhầm với ký tự ống lệnh
  const fullTitle = `${title} · ${SITE_NAME}`;
  const url = SITE_URL + path;
  const ogImage = image ?? SITE_URL + '/og-image.png';

  return (
    <Head>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />

      {/* Canonical: "bản chính thức của trang này nằm ở đúng địa chỉ đây" */}
      <link rel="canonical" href={url} />

      {/*
        noindex   = đừng đưa trang này vào kết quả tìm kiếm
        nofollow  = cũng đừng đi theo các liên kết trong trang này

        Hai chỉ thị này KHÁC HẲN robots.txt:
          robots.txt  ngăn bot TẢI trang
          noindex     cho bot tải, nhưng không cho hiện trong kết quả

        ⚠️ Một trang bị chặn bởi robots.txt thì Google KHÔNG ĐỌC ĐƯỢC thẻ
        noindex của nó — và nghịch lý là trang vẫn có thể lọt vào kết quả
        (qua link từ nơi khác). Muốn chắc chắn một trang không xuất hiện,
        hãy dùng noindex và ĐỪNG chặn nó trong robots.txt.
      */}
      {noIndex && <meta name="robots" content="noindex, nofollow" />}

      {/* --- Open Graph: quyết định link trông thế nào khi gửi qua Zalo/Facebook --- */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content="website" />
      <meta property="og:locale" content="vi_VN" />
      <meta property="og:site_name" content={SITE_NAME} />

      {/* --- Twitter / X --- */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />
    </Head>
  );
}
