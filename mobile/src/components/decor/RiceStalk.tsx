/**
 * ============================================================================
 * COMPONENTS/DECOR/RICESTALK.TSX — BÔNG LÚA
 * ============================================================================
 *
 * 🌾 VÌ SAO LÀ BÔNG LÚA?
 * Bông lúa là hình ảnh gắn với người Việt Nam sâu nhất sau lá cờ: nó nằm
 * trên quốc huy, trên đồng tiền, trong ca dao. Trong app này, bông lúa mang
 * đúng ý nghĩa mà nó vẫn có: SỰ GHI CÔNG.
 *
 * Vì thế nó chỉ xuất hiện ở những nơi nói về thành tích:
 *   • Vòng nguyệt quế ôm lấy danh hiệu (vô địch AFF Cup, HCV SEA Games)
 *   • Viền khối "Thành tích nổi bật" ở tab Giới thiệu
 *   • Huy hiệu cầu thủ xuất sắc nhất trận
 *
 * ⛔ KHÔNG rải bông lúa khắp nơi. Biểu tượng nào cũng vậy: dùng đúng chỗ thì
 *    trang trọng, dùng bừa thì thành hoa văn rẻ tiền.
 *
 * ----------------------------------------------------------------------------
 * 🎨 CÁCH VẼ — "như tranh vẽ" chứ không phải icon hình học
 *
 * Một bông lúa = một thân cong + nhiều hạt lúa xếp so le hai bên, hạt nhỏ dần
 * về phía ngọn. Ba chi tiết tạo nên cảm giác vẽ tay:
 *
 *   1. Thân CONG bằng đường Bézier bậc hai (lệnh Q), không phải đường thẳng
 *   2. Hạt NGHIÊNG dần theo độ cong của thân, không cắm vuông góc cứng nhắc
 *   3. Hạt NHỎ DẦN về ngọn — đúng quy luật một bông lúa thật
 *
 * Thiếu cả ba, ta được một cái "xương cá" chứ không phải bông lúa.
 * ============================================================================
 */

import type { ReactNode } from 'react';
import { View } from 'react-native';
import Svg, { Path, Ellipse, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { staticColors } from '@/theme/colors';

interface RiceStalkProps {
  /** Chiều cao bông lúa */
  size?: number;
  /** true = lật ngang, để ghép thành cặp đối xứng ôm lấy nội dung */
  mirrored?: boolean;
  /** Số cặp hạt lúa. 7-9 là đẹp nhất; nhiều quá thành bắp ngô */
  grains?: number;
  color?: string;
  opacity?: number;
}

/**
 * 🌾 Một bông lúa.
 *
 * Cách dùng:
 *   <RiceStalk size={48} />                      // đứng một mình
 *   <RiceStalk size={48} mirrored />             // vế đối xứng
 *   <RiceStalk size={120} opacity={0.06} />      // hoạ tiết nền chìm
 */
export function RiceStalk({
  size = 48,
  mirrored = false,
  grains = 8,
  color = staticColors.decor.riceGold,
  opacity = 1,
}: RiceStalkProps) {
  // Khung vẽ chuẩn 40×100, sau đó co giãn theo `size`. Làm việc trên một hệ
  // toạ độ cố định giúp mọi con số dưới đây dễ hình dung và dễ chỉnh.
  const VB_W = 40;
  const VB_H = 100;
  const width = (size * VB_W) / VB_H;

  /**
   * THÂN LÚA — đường Bézier bậc hai.
   *
   *   M 20 100  : bắt đầu ở gốc, giữa đáy khung
   *   Q 30 60   : điểm điều khiển — kéo đường cong võng sang phải
   *     26 34   : điểm kết thúc chặng một (giữa thân)
   *   Q 22 14   : điểm điều khiển chặng hai — cong ngược lại
   *     16 4    : ngọn bông, hơi ngả sang trái
   *
   * Hai chặng cong ngược chiều nhau tạo dáng chữ S rất nhẹ — đó chính là
   * dáng của một bông lúa trĩu hạt đang oằn xuống.
   */
  const stalkPath = 'M 20 100 Q 30 60 26 34 Q 22 14 16 4';

  /**
   * Sinh các hạt lúa dọc theo thân.
   *
   * Hạt xếp SO LE hai bên (trái, phải, trái, phải…) giống bông lúa thật,
   * chứ không mọc thành từng cặp đối xứng như xương cá.
   */
  const grainNodes = [];
  for (let i = 0; i < grains; i += 1) {
    // t chạy từ 0 (gốc bông) tới 1 (ngọn)
    const t = i / (grains - 1);

    // Vị trí trên thân — bám sát đường cong đã vẽ ở trên
    const y = 70 - t * 60;              // từ y=70 (gốc bông) lên y=10 (ngọn)
    const xCenter = 26 - t * 9;         // thân nghiêng dần vào trong

    // Hạt nhỏ dần về ngọn: từ 100% xuống 45% kích thước
    const scale = 1 - t * 0.55;
    const rx = 4.2 * scale;
    const ry = 2.4 * scale;

    // So le hai bên thân
    const side = i % 2 === 0 ? 1 : -1;
    const x = xCenter + side * 4.5 * scale;

    /**
     * Góc nghiêng của hạt: hạt gốc gần như nằm ngang, hạt ngọn dựng đứng dần
     * — mô phỏng đúng cách hạt lúa bám vào thân đang cong.
     */
    const rotate = side * (55 - t * 25);

    grainNodes.push(
      <Ellipse
        key={i}
        cx={x}
        cy={y}
        rx={rx}
        ry={ry}
        fill="url(#riceGrain)"
        transform={`rotate(${rotate} ${x} ${y})`}
      />
    );
  }

  return (
    <Svg
      width={width}
      height={size}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      opacity={opacity}
      // scaleX(-1) lật ngang để tạo vế đối xứng cho vòng nguyệt quế
      style={mirrored ? { transform: [{ scaleX: -1 }] } : undefined}
    >
      <Defs>
        {/*
          Hạt lúa có dải màu từ vàng non (mép ngoài) sang vàng chín (lõi),
          tạo cảm giác hạt căng mẩy thay vì một vệt màu phẳng.
        */}
        <LinearGradient id="riceGrain" x1="0" y1="0" x2="1" y2="1">
          <Stop offset="0" stopColor={staticColors.riceGradient[0]} />
          <Stop offset="0.6" stopColor={staticColors.riceGradient[1]} />
          <Stop offset="1" stopColor={staticColors.riceGradient[2]} />
        </LinearGradient>
      </Defs>

      <G>
        {/*
          Thân vẽ TRƯỚC để nằm dưới các hạt.
          Thứ tự trong SVG chính là thứ tự chồng lớp: vẽ sau nằm trên.
        */}
        <Path
          d={stalkPath}
          stroke={color}
          strokeWidth={2}
          strokeLinecap="round"
          fill="none"
        />
        {grainNodes}
      </G>
    </Svg>
  );
}

/**
 * 🏆 VÒNG NGUYỆT QUẾ BẰNG BÔNG LÚA — hai bông ôm lấy nội dung ở giữa.
 *
 * Đây là cách dùng bông lúa đúng nhất: bao quanh một con số thành tích.
 *
 *        🌾  12  🌾
 *            lần vô địch
 *
 * Component này KHÔNG tự vẽ phần giữa — nó nhận `children`, nên bạn đặt gì
 * vào cũng được: số danh hiệu, huy chương, tên cầu thủ hay nhất trận…
 * Tách bạch như vậy khiến nó dùng lại được ở nhiều nơi mà không cần sửa.
 */
export function RiceWreath({
  size = 56,
  children,
  opacity = 1,
}: {
  size?: number;
  children?: ReactNode;
  opacity?: number;
}) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center' }}>
      <RiceStalk size={size} opacity={opacity} />
      {/* Khoảng thở hai bên nội dung — không có, chữ sẽ dính vào hạt lúa */}
      <View style={{ paddingHorizontal: 10, alignItems: 'center' }}>{children}</View>
      <RiceStalk size={size} mirrored opacity={opacity} />
    </View>
  );
}
