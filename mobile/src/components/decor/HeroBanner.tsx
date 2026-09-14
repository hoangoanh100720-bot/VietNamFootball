/**
 * ============================================================================
 * COMPONENTS/DECOR/HEROBANNER.TSX — KHỐI ĐẦU MÀN HÌNH MANG BẢN SẮC VIỆT
 * ============================================================================
 *
 * 🎯 KHỐI HERO LÀ GÌ VÀ ĐỂ LÀM GÌ?
 * Là mảng lớn đầu tiên người dùng nhìn thấy khi mở một màn hình. Nó có đúng
 * ba nhiệm vụ, không hơn:
 *   1. Cho biết "đây là app nào" trong chưa tới một giây
 *   2. Nêu thông tin quan trọng nhất của màn hình
 *   3. Tạo điểm dừng thị giác trước khi mắt đi vào danh sách bên dưới
 *
 * ----------------------------------------------------------------------------
 * 🎨 BỐN LỚP CHỒNG LÊN NHAU (thứ tự chính là thứ tự vẽ, dưới lên trên)
 *
 *   ┌────────────────────────────────────┐
 *   │ ④ Nội dung: tiêu đề, mô tả         │ ← rõ nhất, tương phản cao nhất
 *   │ ③ Vệt cờ đỏ mảnh ở cạnh trái       │ ← dấu hiệu nhận diện
 *   │ ② Bụi tre mờ ở đáy (7% độ đục)     │ ← chiều sâu
 *   │ ① Dải xanh tre sẫm                 │ ← nền
 *   └────────────────────────────────────┘
 *
 * ⚠️ QUY TẮC BẤT DI BẤT DỊCH KHI LÀM HERO CÓ HOẠ TIẾT:
 *    CHỮ PHẢI LUÔN ĐẠT TƯƠNG PHẢN ≥ 4.5:1 SO VỚI ĐIỂM SÁNG NHẤT CỦA NỀN.
 *
 * Đây là lỗi mà rất nhiều hero đẹp mắc phải: nền gradient chỗ tối chỗ sáng,
 * chữ trắng đọc tốt ở chỗ tối nhưng biến mất ở chỗ sáng. Ở đây ta xử lý bằng
 * cách giữ mọi hoạ tiết ở mức ≤ 8% độ đục và dùng dải màu TỐI làm nền —
 * nhờ vậy chữ trắng luôn an toàn trên toàn bộ diện tích.
 * ============================================================================
 */

import type { ReactNode } from 'react';
import { View, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useTheme } from '@/theme';
import { staticColors } from '@/theme/colors';
import { BambooGrove } from './Bamboo';
import { VietnamFlag } from './VietnamFlag';

interface HeroBannerProps {
  children: ReactNode;
  /** Chiều cao tối thiểu. Nội dung dài hơn thì khối tự giãn ra. */
  minHeight?: number;
  /**
   * Kiểu nền:
   *   'bamboo' — xanh tre sẫm (mặc định, dùng cho hầu hết màn hình)
   *   'flag'   — đỏ cờ, chỉ dùng cho khoảnh khắc trọng đại (trận đang đá,
   *              vô địch). Đỏ là màu mạnh nhất trong bảng — dùng nhiều
   *              thì hết thiêng.
   */
  variant?: 'bamboo' | 'flag';
  /** Hiện bụi tre mờ ở đáy khối */
  showBamboo?: boolean;
  /** Hiện lá cờ nhỏ ở góc trên bên phải */
  showFlag?: boolean;
  /** Bo góc dưới — để hero "đổ" mềm vào nội dung phía dưới */
  rounded?: boolean;
  /**
   * Hoạ tiết lớn vẽ PHÍA SAU chữ (lớp ③c) — ví dụ lá cờ lớn ở banner trang chủ.
   * Người truyền vào tự đặt position:'absolute' và phải giữ chữ đủ tương phản.
   */
  decoration?: ReactNode;
}

export function HeroBanner({
  children,
  minHeight = 150,
  variant = 'bamboo',
  showBamboo = true,
  showFlag = true,
  rounded = true,
  decoration,
}: HeroBannerProps) {
  const t = useTheme();

  const colors =
    variant === 'flag' ? staticColors.flagGradient : staticColors.heroGradient;

  return (
    <View
      style={[
        styles.wrapper,
        {
          minHeight,
          borderBottomLeftRadius: rounded ? t.radius.xl : 0,
          borderBottomRightRadius: rounded ? t.radius.xl : 0,
        },
      ]}
    >
      {/* --- LỚP ①: dải màu nền --- */}
      <LinearGradient
        colors={colors as unknown as readonly [string, string, ...string[]]}
        // Chéo từ trên-trái xuống dưới-phải: hướng ánh sáng tự nhiên,
        // giống cách mặt trời chiếu vào một khung cảnh ngoài trời.
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* --- LỚP ②: bụi tre mờ ở đáy --- */}
      {showBamboo && <BambooGrove height={minHeight * 0.78} count={6} opacity={0.08} />}

      {/* --- LỚP ③: vệt cờ đỏ ở cạnh trái --- */}
      {/*
        Một vệt dọc 4px màu đỏ cờ. Nhỏ xíu, nhưng chính nó là thứ khiến khối
        hero "thuộc về app này" chứ không phải một cái hộp gradient chung chung.
        Ở biến thể 'flag' thì bỏ đi — nền đã đỏ sẵn, thêm vệt đỏ nữa là thừa.
      */}
      {variant === 'bamboo' && (
        <View pointerEvents="none" style={styles.flagStripe}>
          <LinearGradient
            colors={staticColors.flagGradient as unknown as readonly [string, string, ...string[]]}
            style={StyleSheet.absoluteFill}
          />
        </View>
      )}

      {/* --- LỚP ③b: lá cờ nhỏ góc phải --- */}
      {showFlag && (
        <View pointerEvents="none" style={styles.flagCorner}>
          <VietnamFlag size={34} opacity={variant === 'flag' ? 0.35 : 0.9} />
        </View>
      )}

      {/* --- LỚP ③c: hoạ tiết lớn tuỳ màn hình (nằm dưới chữ, không nhận chạm) --- */}
      {decoration && (
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {decoration}
        </View>
      )}

      {/* --- LỚP ④: nội dung --- */}
      <View style={[styles.content, { padding: t.spacing.lg }]}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    // overflow: 'hidden' là BẮT BUỘC — không có nó, bụi tre và dải màu sẽ
    // tràn ra ngoài phần bo góc, để lộ những góc vuông nham nhở.
    overflow: 'hidden',
    justifyContent: 'flex-end',
  },
  flagStripe: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
  },
  flagCorner: {
    position: 'absolute',
    top: 14,
    right: 16,
  },
  content: {
    // zIndex đẩy nội dung lên trên mọi lớp trang trí.
    // Trên Android, position:'relative' là điều kiện để zIndex có tác dụng.
    position: 'relative',
    zIndex: 2,
  },
});
