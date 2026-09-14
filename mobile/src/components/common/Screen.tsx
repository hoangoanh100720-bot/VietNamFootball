/**
 * ============================================================================
 * COMPONENTS/COMMON/SCREEN.TSX — KHUNG NỀN CHUNG CỦA MỌI MÀN HÌNH
 * ============================================================================
 *
 * "VÙNG AN TOÀN" (SAFE AREA) LÀ GÌ?
 * Điện thoại đời mới có tai thỏ, camera đục lỗ, thanh gạt về ở đáy màn hình.
 * Nếu vẽ nội dung tràn ra đó, chữ sẽ bị che mất.
 *
 * SafeAreaView tự chừa đúng khoảng cần thiết cho TỪNG loại máy.
 *
 *   ┌──────────────┐
 *   │ ▓▓ tai thỏ ▓▓│ <- vùng cấm
 *   ├──────────────┤
 *   │              │
 *   │  nội dung    │ <- vùng an toàn
 *   │              │
 *   ├──────────────┤
 *   │ ▓▓▓ gạt ▓▓▓ │ <- vùng cấm
 *   └──────────────┘
 *
 * ⚠️ Ở màn hình có thanh tab dưới cùng, ta KHÔNG chừa cạnh dưới ("bottom"),
 * vì chính thanh tab đã lo phần đó rồi. Chừa hai lần sẽ dư một khoảng trống.
 */

import type { ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  View,
  type ScrollViewProps,
  type ViewStyle,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import { useTheme } from '@/theme';

interface ScreenProps {
  children: ReactNode;
  /**
   * ⭐ KHỐI ĐẦU MÀN HÌNH TRÀN VIỀN (full-bleed).
   *
   * Nội dung thường (children) luôn có lề hai bên `spacing.lg` cho dễ đọc.
   * Nhưng khối hero, ảnh bìa hay dải màu thì PHẢI chạm sát mép màn hình —
   * chừa lề ra là lộ ngay hai vệt nền hai bên, trông như vẽ hụt.
   *
   * Prop này render TRƯỚC và NGOÀI phần lề, nên cùng một màn hình vừa có
   * hero tràn viền vừa có nội dung canh lề gọn gàng.
   *
   *   <Screen header={<HeroBanner>...</HeroBanner>}>
   *     ...nội dung có lề...
   *   </Screen>
   */
  header?: ReactNode;
  /** true = nội dung cuộn được (mặc định) */
  scroll?: boolean;
  /** Hàm gọi khi người dùng kéo xuống để làm mới */
  onRefresh?: () => void;
  refreshing?: boolean;
  /** Cạnh cần chừa. Màn hình trong tab: ['top'] — đáy đã có tab lo */
  edges?: Edge[];
  padded?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ScrollViewProps['contentContainerStyle'];
}

export function Screen({
  children,
  header,
  scroll = true,
  onRefresh,
  refreshing = false,
  edges = ['top'],
  padded = true,
  style,
  contentContainerStyle,
}: ScreenProps) {
  const t = useTheme();

  // Phần nội dung CÓ LỀ. Khối header ở dưới được render riêng, ngoài lề này.
  const content = (
    <View
      style={[
        {
          flex: scroll ? undefined : 1,
          paddingHorizontal: padded ? t.spacing.lg : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: t.colors.bg }} edges={edges}>
      {/*
        StatusBar: chữ giờ/pin ở đỉnh màn hình.
        Nền tối -> chữ phải sáng ("light"), nền sáng -> chữ tối ("dark").
        Quên dòng này là chữ đen trên nền đen, không đọc được gì.

        ⚠️ Không chừa cạnh trên = màn hình nằm DƯỚI thanh tiêu đề của Stack
        (chi tiết trận, hồ sơ cầu thủ). Thanh đó luôn xanh tre sẫm (xem
        staticColors.brandBar) nên chữ trạng thái luôn sáng, bất kể chế độ.
      */}
      <StatusBar style={t.isDark || !edges.includes('top') ? 'light' : 'dark'} />

      {scroll ? (
        <ScrollView
          // Ẩn thanh cuộn: giao diện gọn hơn, đây là chuẩn của app di động
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            {
              paddingBottom: t.spacing.xxxl, // chừa chỗ để nội dung cuối
                                             // không bị thanh tab che
            },
            contentContainerStyle,
          ]}
          /**
           * KÉO ĐỂ LÀM MỚI — cử chỉ mà ai dùng điện thoại cũng biết.
           * tintColor/colors phải đặt theo màu nhấn, nếu không vòng quay
           * sẽ là màu xám mặc định, trông rất "chưa làm xong".
           */
          refreshControl={
            onRefresh ? (
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={t.colors.accentText}
                colors={[t.colors.accent]}
                progressBackgroundColor={t.colors.surface}
              />
            ) : undefined
          }
          // Bàn phím hiện lên mà chạm ra ngoài thì tự ẩn đi
          keyboardShouldPersistTaps="handled"
        >
          {header}
          {content}
        </ScrollView>
      ) : (
        <>
          {header}
          {content}
        </>
      )}
    </SafeAreaView>
  );
}
