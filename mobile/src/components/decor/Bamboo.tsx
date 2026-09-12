/**
 * ============================================================================
 * COMPONENTS/DECOR/BAMBOO.TSX — CÂY TRE
 * ============================================================================
 *
 * 🎋 VÌ SAO LÀ CÂY TRE?
 * "Tre già măng mọc" — hình ảnh của sự kế thừa, đúng với một đội tuyển quốc
 * gia nơi lứa cầu thủ sau nối tiếp lứa trước. Tre cũng là thứ dẻo dai, gió
 * bão quật không gãy: tinh thần mà người hâm mộ vẫn gán cho đội tuyển.
 *
 * Về mặt thị giác, tre giải quyết một bài toán thiết kế cụ thể: nó cho ta
 * những ĐƯỜNG DỌC tự nhiên để phân tách và đóng khung nội dung, thay cho
 * những đường kẻ 1px vô hồn mà app nào cũng có.
 *
 * ----------------------------------------------------------------------------
 * 🎨 GIẢI PHẪU MỘT THÂN TRE (đúng ba chi tiết này là ra tre)
 *
 *   ║      ← LÓNG: đoạn thân trơn giữa hai mắt
 *   ╠══    ← MẮT (đốt): vòng gờ nổi, hơi phình ra hai bên
 *   ║  ╲   ← LÁ: thuôn dài, nhọn, mọc chéo lên từ mắt
 *   ╠══
 *   ║
 *
 * • Lóng KHÔNG đều nhau — lóng gốc dài, lên ngọn ngắn dần.
 *   Chia đều tăm tắp sẽ ra cái thước kẻ, không ra cây tre.
 * • Mắt tre luôn PHÌNH nhẹ so với thân.
 * • Lá chỉ mọc từ mắt, không mọc giữa lóng.
 * ============================================================================
 */

import { View } from 'react-native';
import Svg, { Path, Rect, G, Defs, LinearGradient, Stop } from 'react-native-svg';
import { staticColors } from '@/theme/colors';

interface BambooStalkProps {
  /** Chiều cao thân tre */
  height?: number;
  /** Bề ngang thân */
  width?: number;
  /** Số mắt (đốt) tre. 4-6 là vừa mắt */
  nodes?: number;
  /** Vẽ lá ở mắt nào? 'top' = chỉ ngọn, 'all' = mọi mắt, 'none' = trơn */
  leaves?: 'none' | 'top' | 'all';
  opacity?: number;
}

/**
 * 🎋 Một thân tre dựng đứng.
 *
 * Cách dùng:
 *   <BambooStalk height={120} />                     // cột trang trí
 *   <BambooStalk height={200} opacity={0.07} />      // hoạ tiết nền chìm
 *   <BambooStalk height={80} leaves="none" />        // thanh phân cách dọc
 */
export function BambooStalk({
  height = 120,
  width = 14,
  nodes = 5,
  leaves = 'top',
  opacity = 1,
}: BambooStalkProps) {
  const VB_W = 40;
  const VB_H = 200;

  /**
   * Tính vị trí các mắt tre.
   *
   * ⭐ MẸO TẠO NHỊP TỰ NHIÊN: lóng NGẮN DẦN khi lên cao.
   * Dùng luỹ thừa 1.35 cho biến t (0 → 1) khiến khoảng cách giữa các mắt
   * co lại dần về phía ngọn — đúng như tre thật. Chia đều thì ra cái thang.
   */
  const nodePositions: number[] = [];
  for (let i = 1; i <= nodes; i += 1) {
    const t = i / (nodes + 1);
    nodePositions.push(VB_H - Math.pow(t, 1.35) * VB_H * 0.92);
  }

  const stalkX = (VB_W - 14) / 2; // canh thân vào giữa khung vẽ
  const stalkW = 14;

  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      opacity={opacity}
      // preserveAspectRatio="none" cho phép ép ngang mà không méo chiều dọc,
      // nhờ vậy `width` điều khiển được bề ngang thân tre một cách độc lập.
      preserveAspectRatio="none"
    >
      <Defs>
        {/*
          Dải màu NGANG (x1=0 → x2=1), không phải dọc.
          Thân tre là hình TRỤ: mép trái tối, giữa sáng, mép phải tối lại.
          Đúng ba chặng này là mắt người lập tức thấy nó tròn chứ không dẹt.
        */}
        <LinearGradient id="bambooCulm" x1="0" y1="0" x2="1" y2="0">
          <Stop offset="0" stopColor={staticColors.bambooGradient[0]} />
          <Stop offset="0.45" stopColor={staticColors.bambooGradient[2]} />
          <Stop offset="1" stopColor={staticColors.bambooGradient[1]} />
        </LinearGradient>
      </Defs>

      {/* --- Thân --- */}
      <Rect x={stalkX} y={4} width={stalkW} height={VB_H - 4} rx={3} fill="url(#bambooCulm)" />

      {/* --- Các mắt tre --- */}
      {nodePositions.map((y, i) => (
        <G key={i}>
          {/* Vòng gờ: rộng hơn thân 2px mỗi bên -> tạo cảm giác phình ra */}
          <Rect
            x={stalkX - 2}
            y={y - 2.5}
            width={stalkW + 4}
            height={5}
            rx={2.5}
            fill={staticColors.decor.bambooNode}
          />

          {/* --- Lá mọc từ mắt --- */}
          {(leaves === 'all' || (leaves === 'top' && i >= nodePositions.length - 2)) && (
            <>
              {/*
                Lá tre = đường cong Bézier khép kín, thuôn nhọn hai đầu.
                Q kéo phần bụng lá phình ra, rồi Q thứ hai khép về đúng gốc lá.
                Mọc CHÉO LÊN (y giảm dần) — lá tre không bao giờ rủ xuống như liễu.
              */}
              <Path
                d={`M ${stalkX} ${y} Q ${stalkX - 16} ${y - 10} ${stalkX - 22} ${y - 20}
                    Q ${stalkX - 12} ${y - 14} ${stalkX} ${y}`}
                fill={staticColors.decor.bambooLeaf}
              />
              <Path
                d={`M ${stalkX + stalkW} ${y} Q ${stalkX + stalkW + 16} ${y - 8} ${stalkX + stalkW + 21} ${y - 17}
                    Q ${stalkX + stalkW + 11} ${y - 12} ${stalkX + stalkW} ${y}`}
                fill={staticColors.decor.bambooLeaf}
              />
            </>
          )}
        </G>
      ))}
    </Svg>
  );
}

/**
 * 🎋 ĐƯỜNG PHÂN CÁCH HÌNH THÂN TRE NẰM NGANG.
 *
 * Thay cho đường kẻ 1px vô hồn giữa các mục. Nhìn kỹ thì thấy đó là một
 * lóng tre có hai mắt ở hai đầu — nhìn lướt thì vẫn chỉ là một đường phân
 * cách, không hề gây rối mắt.
 *
 * Đây chính là kiểu chi tiết làm nên bản sắc: đủ tinh tế để không ai thấy
 * phiền, đủ riêng để không giống bất kỳ app nào khác.
 */
export function BambooDivider({
  width = 120,
  thickness = 6,
  opacity = 0.9,
}: {
  width?: number;
  thickness?: number;
  opacity?: number;
}) {
  const VB_W = 200;
  const VB_H = 12;
  const y = (VB_H - 6) / 2;

  return (
    <Svg width={width} height={thickness * 2} viewBox={`0 0 ${VB_W} ${VB_H}`} opacity={opacity}>
      <Defs>
        {/* Dải DỌC ở đây (y1→y2) vì thân tre giờ nằm ngang: trên sáng, dưới tối */}
        <LinearGradient id="bambooBar" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={staticColors.bambooGradient[2]} />
          <Stop offset="0.5" stopColor={staticColors.bambooGradient[1]} />
          <Stop offset="1" stopColor={staticColors.bambooGradient[0]} />
        </LinearGradient>
      </Defs>

      {/* Lóng tre — hai đầu bo tròn để không cụt lủn */}
      <Rect x={10} y={y} width={VB_W - 20} height={6} rx={3} fill="url(#bambooBar)" />

      {/* Hai mắt tre ở hai đầu, cao hơn thân một chút */}
      <Rect x={8} y={y - 1.5} width={5} height={9} rx={2} fill={staticColors.decor.bambooNode} />
      <Rect x={VB_W - 13} y={y - 1.5} width={5} height={9} rx={2} fill={staticColors.decor.bambooNode} />
    </Svg>
  );
}

/**
 * 🎋 KHUNG TRE — một hàng tre đứng làm nền chìm cho khối nội dung.
 *
 * ⚠️ ĐỘ MỜ LÀ THỨ QUYẾT ĐỊNH THÀNH BẠI Ở ĐÂY.
 * Hoạ tiết nền phải ở mức 5-10% độ đục. Đậm hơn là nó tranh chỗ với chữ,
 * người dùng đọc mỏi mắt mà không hiểu vì sao. Nhạt hơn thì coi như không có.
 *
 * Quy tắc kiểm tra nhanh: lùi ra xa màn hình một mét. Còn ĐỌC được chữ rõ
 * ràng nhưng vẫn CẢM được có hoạ tiết -> đúng mức.
 */
export function BambooGrove({
  height = 140,
  count = 5,
  opacity = 0.07,
}: {
  height?: number;
  count?: number;
  opacity?: number;
}) {
  return (
    <View
      // pointerEvents="none": lớp trang trí KHÔNG được ăn cú chạm của người dùng.
      // Thiếu dòng này, các nút nằm dưới nó sẽ bấm không ăn — một lỗi cực kỳ
      // khó truy ra vì nhìn màn hình thì mọi thứ trông hoàn toàn bình thường.
      pointerEvents="none"
      style={{
        position: 'absolute',
        left: 0,
        right: 0,
        bottom: 0,
        height,
        flexDirection: 'row',
        alignItems: 'flex-end',
        justifyContent: 'space-around',
        overflow: 'hidden',
      }}
    >
      {Array.from({ length: count }).map((_, i) => (
        <BambooStalk
          key={i}
          // Cao thấp so le -> ra bụi tre. Đều tăm tắp -> ra hàng rào.
          height={height * (0.6 + ((i * 37) % 40) / 100)}
          width={10 + (i % 3) * 2}
          nodes={4 + (i % 2)}
          leaves={i % 2 === 0 ? 'top' : 'none'}
          opacity={opacity}
        />
      ))}
    </View>
  );
}
