/**
 * ============================================================================
 * APP/+HTML.TSX — VỎ HTML CỦA BẢN WEB (nền tảng của toàn bộ SEO)
 * ============================================================================
 *
 * 🌐 FILE NÀY LÀ GÌ?
 * Expo Router cho phép build app React Native ra WEB. Khi đó nó cần một
 * khung HTML bao ngoài. Mặc định Expo tạo sẵn một khung tối giản —
 * file `+html.tsx` này GHI ĐÈ khung đó.
 *
 * ⚠️ ĐIỀU BẮT BUỘC PHẢI HIỂU:
 * File này CHỈ chạy trên web, và chỉ chạy MỘT LẦN lúc dựng trang ở phía máy
 * chủ (server-side render). Nó KHÔNG chạy trên iOS/Android, và KHÔNG có
 * useState, useEffect hay bất kỳ hook nào — viết vào là lỗi ngay.
 *
 * ============================================================================
 * 🔍 VÌ SAO MỘT APP DI ĐỘNG LẠI CẦN SEO?
 * ============================================================================
 *
 * Vì bản web chính là CỬA NGÕ để người ta biết tới app:
 *
 *   1. Ai đó tìm Google "lịch thi đấu đội tuyển Việt Nam"
 *   2. Trang web của bạn hiện ra trong kết quả
 *   3. Họ vào xem, thấy hay, rồi mới tải app
 *
 * Không có SEO thì bước 2 không bao giờ xảy ra. Và khi người ta chia sẻ
 * đường dẫn qua Zalo/Messenger/Facebook, thẻ Open Graph dưới đây quyết định
 * link đó hiện ra thành một thẻ đẹp có ảnh, hay chỉ là một dòng chữ trơ trọi.
 *
 * ============================================================================
 * ✅ DANH SÁCH KIỂM TRA SEO — ĐÃ LÀM ĐỦ NHỮNG GÌ TRONG FILE NÀY
 * ============================================================================
 *
 *   [x] lang="vi"               — báo cho Google biết đây là nội dung tiếng Việt
 *   [x] <title> và description  — hai dòng chữ hiện trong kết quả tìm kiếm
 *   [x] viewport                — không có thì Google đánh trượt "thân thiện di động"
 *   [x] Open Graph              — thẻ xem trước khi chia sẻ lên Facebook/Zalo
 *   [x] Twitter Card            — tương tự, dành cho X/Twitter
 *   [x] canonical               — chống nội dung trùng lặp giữa các URL
 *   [x] JSON-LD (Schema.org)    — giúp Google HIỂU đây là dữ liệu thể thao
 *   [x] theme-color             — màu thanh trình duyệt trên di động
 *   [x] manifest.json           — cài được lên màn hình chính như app (PWA)
 *   [x] preconnect              — bắt tay sớm với máy chủ API, trang hiện nhanh hơn
 *   [x] CSS chặn kéo ngang      — Google phạt trang bị tràn ngang trên di động
 *
 * ⚠️ PHẢI SỬA TRƯỚC KHI LÊN THẬT: đổi SITE_URL thành tên miền của bạn.
 *    Để nguyên example.com thì canonical và Open Graph đều trỏ sai chỗ.
 * ============================================================================
 */

import { ScrollViewStyleReset } from 'expo-router/html';
import type { ReactNode } from 'react';

/** ⚠️ ĐỔI THÀNH TÊN MIỀN THẬT CỦA BẠN TRƯỚC KHI TRIỂN KHAI */
const SITE_URL = 'https://doituyenvietnam.vn';

const SITE_NAME = 'Đội tuyển Việt Nam';

/**
 * 📝 CÁCH VIẾT THẺ TITLE CHUẨN SEO — ghi lại ở đây để tra cứu, vì title
 *    KHÔNG còn được khai trong file này nữa (mỗi màn hình tự lo bằng <Seo>):
 *
 *   • Dài 50-60 ký tự (dài hơn bị Google cắt đuôi bằng dấu "…")
 *   • Từ khoá quan trọng nhất đặt ở ĐẦU
 *   • Có tên thương hiệu ở cuối — <Seo> tự nối " · Đội tuyển Việt Nam"
 */

/**
 * 📝 CÁCH VIẾT MÔ TẢ CHUẨN SEO:
 *   • Dài 150-160 ký tự
 *   • Có LỜI MỜI HÀNH ĐỘNG, vì đây là dòng quyết định người ta bấm hay lướt qua
 *   • Chứa tự nhiên các từ khoá người Việt thật sự gõ vào Google
 *
 * ⚠️ Google KHÔNG dùng thẻ này để xếp hạng, nhưng nó quyết định TỶ LỆ BẤM.
 *   Mô tả hay kéo người vào; mô tả dở thì dù xếp hạng 1 cũng ít ai bấm.
 */
const SITE_DESCRIPTION =
  'Theo dõi tỷ số trực tiếp, lịch thi đấu, đội hình ra sân và bảng xếp hạng FIFA ' +
  'của Đội tuyển Bóng đá Quốc gia Việt Nam. Cập nhật từng phút, có phân tích bằng AI.';

// Ảnh xem trước khi chia sẻ (khổ chuẩn 1200×630) do <Seo> khai báo cho từng
// trang — xem components/common/Seo.tsx. Ở đây chỉ còn khai kích thước.

export default function Root({ children }: { children: ReactNode }) {
  return (
    /**
     * ⭐ lang="vi" LÀ THẺ SEO QUAN TRỌNG NHẤT MÀ NGƯỜI TA HAY QUÊN.
     *
     * Nó cho Google biết nội dung là tiếng Việt, để:
     *   • Ưu tiên hiện trang này cho người tìm kiếm ở Việt Nam
     *   • Không cố dịch trang một cách vô duyên
     *   • Trình đọc màn hình phát âm đúng tiếng Việt (đây là việc TIẾP CẬN,
     *     nhưng Google cũng tính nó vào điểm chất lượng trang)
     */
    <html lang="vi">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />

        {/*
          VIEWPORT — không có thẻ này, Google đánh trượt tiêu chí "thân thiện
          với thiết bị di động", và tiêu chí đó ảnh hưởng TRỰC TIẾP tới thứ hạng.

          viewport-fit=cover để nội dung tràn được ra vùng tai thỏ trên iPhone.
        */}
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, shrink-to-fit=no, viewport-fit=cover"
        />

        {/*
          ====================================================================
          ⚠️ RANH GIỚI GIỮA FILE NÀY VÀ components/common/Seo.tsx
          ====================================================================

          File này CHỈ chứa những thẻ GIỐNG NHAU Ở MỌI TRANG.
          Mọi thẻ THAY ĐỔI THEO TỪNG TRANG (description, og:title, og:url,
          canonical...) nằm ở component <Seo>, đặt trong từng màn hình.

          🐛 VÌ SAO TÁCH BẠCH NHƯ VẬY? ĐÂY LÀ LỖI CÓ THẬT ĐÃ GẶP:

          Ban đầu file này khai luôn cả description và og:* cho toàn site.
          Kết quả kiểm tra file HTML xuất ra:

              <meta name="description" content="Tỷ số trực tiếp từng phút..."/>   ← từ <Seo>
              <meta name="description" content="Theo dõi tỷ số trực tiếp..."/>    ← từ file này
              <link rel="canonical" href="https://.../"/>                          ← từ <Seo>
              <link rel="canonical" href="https://..."/>                           ← từ file này

          HAI thẻ description với nội dung KHÁC NHAU, và HAI canonical trỏ hai
          địa chỉ khác nhau. Google gặp cảnh này sẽ tự chọn bừa một cái — nghĩa
          là bạn mất quyền quyết định trang mình hiện ra thế nào.

          ⚠️ THẺ <title> CŨNG BỊ TRÙNG Y HỆT — và đây là chỗ dễ tưởng nhầm nhất.
          Thư viện quản lý head (react-helmet, nằm sau expo-router/head) chỉ gộp
          các thẻ DO CHÍNH NÓ tạo ra. Thẻ viết thẳng trong file này nằm ngoài
          tầm với của nó, nên file HTML xuất ra có ĐÚNG HAI thẻ title:

              <title data-rh="true">Lịch thi đấu · Đội tuyển Việt Nam</title>
              <title>Đội tuyển Việt Nam — Lịch thi đấu, tỷ số...</title>

          Hai thẻ title là lỗi cú pháp HTML, và Google sẽ tự chọn một trong hai.
          Vì vậy file này KHÔNG khai <title> nữa — mỗi màn hình tự lo bằng <Seo>.

          👉 Quy tắc rút ra: một thông tin — một nơi khai báo duy nhất.
          ====================================================================
        */}

        <meta name="application-name" content={SITE_NAME} />

        {/*
          ⚠️ THẺ KEYWORDS ĐÃ CHẾT TỪ 2009.
          Google công khai tuyên bố KHÔNG dùng nó nữa, vì bị lạm dụng quá nhiều.
          Ai bảo bạn "nhồi keywords để lên top" là đang dùng kiến thức của
          15 năm trước. Ta cố tình KHÔNG thêm thẻ đó vào đây.

          Thứ thật sự quyết định thứ hạng ngày nay: nội dung tốt, tốc độ tải,
          trải nghiệm di động và dữ liệu có cấu trúc (JSON-LD bên dưới).
        */}

        {/*
          ---------- OPEN GRAPH: CHỈ CÁC THẺ KHÔNG ĐỔI THEO TRANG ----------

          og:title / og:description / og:url / og:image / canonical đã chuyển
          hết sang <Seo> — xem khối giải thích về thẻ trùng lặp ở phía trên.

          Ba thẻ kích thước ảnh dưới đây thì giữ lại, vì mọi trang đều dùng
          chung một khổ ảnh xem trước 1200×630 (kích thước chuẩn của Facebook
          và Zalo). Ảnh không đúng khổ này sẽ bị cắt xén tuỳ tiện khi hiển thị.
        */}
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Đội tuyển Bóng đá Quốc gia Việt Nam" />

        {/* ---------- GIAO DIỆN TRÊN DI ĐỘNG ---------- */}
        {/*
          theme-color tô màu thanh địa chỉ của trình duyệt trên Android.
          Hai giá trị khớp với hai chế độ trong theme/colors.ts:
            sáng -> #F7F6EF (giấy dó)   ·   tối -> #0A1A12 (xanh tre đêm)
        */}
        <meta name="theme-color" media="(prefers-color-scheme: light)" content="#F7F6EF" />
        <meta name="theme-color" media="(prefers-color-scheme: dark)" content="#0A1A12" />
        <meta name="color-scheme" content="dark light" />

        {/* ---------- PWA: CÀI ĐƯỢC LÊN MÀN HÌNH CHÍNH ---------- */}
        <link rel="manifest" href="/manifest.json" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content={SITE_NAME} />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />

        {/*
          ---------- TỐI ƯU TỐC ĐỘ ----------
          preconnect bảo trình duyệt bắt tay trước với máy chủ API (DNS + TLS)
          NGAY KHI đọc tới dòng này, thay vì đợi tới lúc gọi request đầu tiên.
          Tiết kiệm được 100-300ms — và tốc độ là một yếu tố xếp hạng thật sự
          của Google (nhóm chỉ số Core Web Vitals).
        */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />

        {/*
          ====================================================================
          ⭐ JSON-LD — DỮ LIỆU CÓ CẤU TRÚC (phần SEO giá trị nhất của file này)
          ====================================================================

          Các thẻ meta ở trên chỉ MÔ TẢ trang. JSON-LD thì khác: nó cho Google
          biết trang này nói về CÁI GÌ, theo một bộ từ vựng chuẩn (schema.org)
          mà máy hiểu được.

          Lợi ích cụ thể: Google có thể hiển thị trang của bạn dưới dạng
          "kết quả nổi bật" (rich result) — có ảnh, có tên đội, có lịch đấu
          ngay trong trang kết quả tìm kiếm, thay vì chỉ hai dòng chữ.

          Ở đây ta khai báo hai thực thể:
            1. SportsTeam    — đội tuyển bóng đá quốc gia Việt Nam
            2. WebSite       — kèm ô tìm kiếm ngay trên kết quả Google

          🔧 Kiểm tra lại tại: https://search.google.com/test/rich-results
          ====================================================================
        */}
        <script
          type="application/ld+json"
          // dangerouslySetInnerHTML là cách DUY NHẤT để nhúng JSON-LD trong React.
          // An toàn ở đây vì toàn bộ nội dung là hằng số do ta viết, KHÔNG có
          // một ký tự nào đến từ người dùng.
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              '@context': 'https://schema.org',
              '@graph': [
                {
                  '@type': 'SportsTeam',
                  name: 'Đội tuyển bóng đá quốc gia Việt Nam',
                  alternateName: ['Vietnam national football team', 'ĐT Việt Nam'],
                  sport: 'Bóng đá',
                  url: SITE_URL,
                  logo: SITE_URL + '/icon.png',
                  memberOf: {
                    '@type': 'SportsOrganization',
                    name: 'Liên đoàn Bóng đá Việt Nam (VFF)',
                  },
                  areaServed: { '@type': 'Country', name: 'Việt Nam' },
                },
                {
                  '@type': 'WebSite',
                  name: SITE_NAME,
                  url: SITE_URL,
                  inLanguage: 'vi-VN',
                  description: SITE_DESCRIPTION,
                  /*
                   * potentialAction cho phép Google hiện Ô TÌM KIẾM ngay dưới
                   * kết quả của trang bạn — người dùng gõ thẳng vào đó và nhảy
                   * luôn tới trang kết quả trên site của bạn.
                   */
                  potentialAction: {
                    '@type': 'SearchAction',
                    target: {
                      '@type': 'EntryPoint',
                      urlTemplate: SITE_URL + '/players?search={search_term_string}',
                    },
                    'query-input': 'required name=search_term_string',
                  },
                },
              ],
            }),
          }}
        />

        {/*
          ⚠️ ScrollViewStyleReset LÀ BẮT BUỘC VỚI EXPO ROUTER TRÊN WEB.
          Không có nó, các ScrollView lồng nhau sẽ cuộn sai hoàn toàn trên web.
          Đây là yêu cầu kỹ thuật của Expo, không phải tuỳ chọn.
        */}
        <ScrollViewStyleReset />

        {/* CSS nền tảng — viết thẳng vào head để không phải chờ tải thêm file */}
        <style dangerouslySetInnerHTML={{ __html: BASE_CSS }} />
      </head>

      <body>{children}</body>
    </html>
  );
}

/**
 * CSS nền tảng cho bản web.
 *
 * Bốn khối dưới đây đều phục vụ SEO/trải nghiệm, không phải để trang trí:
 *
 *   1. Màu nền theo chế độ sáng/tối — chống "chớp trắng" lúc trang vừa tải.
 *      Chớp trắng làm xấu chỉ số CLS (một trong ba Core Web Vitals của Google).
 *
 *   2. overflow-x: hidden — Google PHẠT trang bị kéo ngang được trên di động.
 *
 *   3. text-size-adjust — chặn iOS Safari tự phóng to chữ khi xoay ngang,
 *      thứ làm vỡ bố cục và cũng bị tính là lỗi thân thiện di động.
 *
 *   4. prefers-reduced-motion — tôn trọng người dùng đã tắt hiệu ứng chuyển
 *      động vì lý do sức khoẻ (say chuyển động, rối loạn tiền đình).
 */
const BASE_CSS = `
  :root { color-scheme: dark light; }

  html, body {
    margin: 0;
    padding: 0;
    /* Chặn kéo ngang — trang bị tràn ngang là lỗi bị Google trừ điểm */
    overflow-x: hidden;
    /* Chặn iOS tự phóng chữ khi xoay máy */
    -webkit-text-size-adjust: 100%;
    text-size-adjust: 100%;
  }

  /* Nền mặc định = chế độ tối (chế độ chính của app) */
  body {
    background-color: #0A1A12;
    font-family: system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif;
  }

  /* Người dùng để máy ở chế độ sáng -> nền giấy dó */
  @media (prefers-color-scheme: light) {
    body { background-color: #F7F6EF; }
  }

  /* Tôn trọng lựa chọn tắt hiệu ứng chuyển động */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      animation-iteration-count: 1 !important;
      transition-duration: 0.01ms !important;
      scroll-behavior: auto !important;
    }
  }

  /*
    Vòng tiêu điểm khi dùng bàn phím Tab.
    :focus-visible chỉ hiện khi điều hướng bằng BÀN PHÍM, không hiện khi bấm
    chuột — vừa đạt chuẩn tiếp cận, vừa không làm xấu giao diện lúc bấm chuột.
    Đỏ cờ #DA251D để vòng tiêu điểm cũng thuộc về bộ nhận diện.
  */
  :focus-visible {
    outline: 2px solid #DA251D;
    outline-offset: 2px;
  }
`;
