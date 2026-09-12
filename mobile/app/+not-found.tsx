/**
 * ============================================================================
 * APP/+NOT-FOUND.TSX — TRANG 404 "KHÔNG TÌM THẤY"
 * ============================================================================
 *
 * 📍 KHI NÀO MÀN HÌNH NÀY HIỆN RA?
 * Khi người dùng mở một đường dẫn không tồn tại:
 *   • Trên web  : gõ /cau-thu-abc, hoặc bấm link cũ đã bị xoá
 *   • Trên app  : mở deep link vietnamfootball://match/99999 (trận không có thật)
 *
 * Tên file bắt đầu bằng dấu cộng (+) là quy ước của Expo Router cho các file
 * ĐẶC BIỆT, không phải một route bình thường.
 *
 * ----------------------------------------------------------------------------
 * ⭐ VÌ SAO PHẢI TỰ VIẾT, KHI EXPO ĐÃ CÓ SẴN MỘT TRANG 404?
 *
 * Trang mặc định của Expo chỉ có dòng chữ "Unmatched Route" trên nền trắng.
 * Ba vấn đề với nó:
 *
 *   1. 🌐 SEO — nó KHÔNG có thẻ <title> và <meta description>. Trang duy nhất
 *      trong cả site thiếu hai thẻ đó. Tệ hơn, nó không báo noindex nên
 *      Google có thể đưa chính trang lỗi vào kết quả tìm kiếm.
 *
 *   2. 🎨 NHẬN DIỆN — chữ tiếng Anh, nền trắng, không theo bảng màu.
 *      Người dùng tưởng app hỏng chứ không nghĩ mình gõ nhầm địa chỉ.
 *
 *   3. 🚪 LỐI THOÁT — không có nút nào để quay lại. Người dùng cụt đường
 *      và đóng app luôn. Một trang 404 tốt LUÔN phải chỉ đường đi tiếp.
 *
 * ----------------------------------------------------------------------------
 * ⚠️ VỀ MÃ TRẠNG THÁI HTTP 404
 * Bản web xuất ra là file tĩnh, nên máy chủ (Vercel/Netlify/Nginx) mới là nơi
 * trả mã 404 thật. Hãy trỏ trang lỗi của máy chủ tới file `+not-found.html`.
 * Riêng thẻ noindex trong <Seo> thì đã đủ để Google không lập chỉ mục trang này.
 * ============================================================================
 */

import { View } from 'react-native';
import { Link, Stack } from 'expo-router';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Seo } from '@/components/common/Seo';
import { VietnamFlag, BambooDivider } from '@/components/decor';

export default function NotFoundScreen() {
  const t = useTheme();

  return (
    <>
      <Stack.Screen options={{ title: 'Không tìm thấy' }} />

      {/*
        noIndex là BẮT BUỘC với trang lỗi. Không có nó, Google có thể lập chỉ
        mục chính trang 404 — và người tìm kiếm bấm vào sẽ rơi thẳng vào
        một trang báo lỗi. Ấn tượng đầu tiên tệ nhất có thể có.
      */}
      <Seo
        title="Không tìm thấy trang"
        description="Đường dẫn bạn vừa mở không tồn tại hoặc đã được chuyển đi nơi khác."
        path="/404"
        noIndex
      />

      <Screen edges={['top', 'bottom']}>
        <View
          style={{
            flex: 1,
            alignItems: 'center',
            justifyContent: 'center',
            // Khoảng đệm dọc lớn để khối nội dung nằm ở phần trên-giữa màn hình,
            // chỗ mắt người nhìn vào đầu tiên — không rơi tụt xuống đáy.
            paddingVertical: t.spacing.xxxl,
            gap: t.spacing.lg,
          }}
        >
          {/* Lá cờ làm điểm neo thị giác: ngay cả trang lỗi cũng phải "thuộc về" app này */}
          <VietnamFlag size={64} opacity={0.9} />

          <AppText
            tabular
            center
            style={{
              fontSize: t.fontSize.display,
              fontWeight: t.fontWeight.black,
              color: t.colors.accentText,
            }}
          >
            404
          </AppText>

          <BambooDivider width={100} />

          <View style={{ gap: t.spacing.sm, alignItems: 'center' }}>
            <AppText variant="h2" center>
              Không tìm thấy trang này
            </AppText>

            {/*
              maxWidth 300: giữ độ dài dòng khoảng 45-60 ký tự.
              Dòng chữ căn giữa mà kéo dài hết bề ngang màn hình thì mắt phải
              "nhảy" tìm đầu dòng mỗi lần xuống dòng — đọc rất mệt.
            */}
            <AppText variant="body" tone="muted" center style={{ maxWidth: 300 }}>
              Đường dẫn bạn vừa mở không tồn tại hoặc đã được chuyển đi nơi khác.
            </AppText>
          </View>

          {/*
            LỐI THOÁT — phần quan trọng nhất của một trang 404.
            Dùng <Link> của expo-router thay vì <Button> + router.push, vì trên
            web nó dựng ra một thẻ <a href> thật: bấm chuột phải mở tab mới
            được, và bot tìm kiếm cũng đi theo được để tìm về trang chủ.
          */}
          <Link
            href="/"
            style={{
              marginTop: t.spacing.sm,
              backgroundColor: t.colors.accent,
              color: t.colors.accentFg,
              paddingVertical: t.spacing.md,
              paddingHorizontal: t.spacing.xl,
              borderRadius: t.radius.md,
              fontSize: t.fontSize.base,
              fontWeight: t.fontWeight.semibold,
              overflow: 'hidden', // iOS cần dòng này thì borderRadius mới ăn trên Text
            }}
          >
            Về trang chủ
          </Link>
        </View>
      </Screen>
    </>
  );
}
