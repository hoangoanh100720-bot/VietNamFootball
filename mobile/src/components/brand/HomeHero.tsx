/**
 * ============================================================================
 * COMPONENTS/BRAND/HOMEHERO.TSX — BANNER TRANG CHỦ (Tab Trận đấu)
 * ============================================================================
 *
 *   ┌───────────────────────────────────────┐
 *   │ ĐỘI TUYỂN BÓNG ĐÁ QUỐC GIA        (👤) │
 *   │ Việt Nam                   ▄▄▄▄▄▄▄     │ ◄ lá cờ LỚN bay phía sau,
 *   │ Những chiến binh Sao Vàng  █  ★  █     │   nghiêng nhẹ, tràn mép phải
 *   │ ▬▬▬▬ đỏ·vàng·xanh          ▀▀▀▀▀▀▀     │
 *   │ [★ Hạng 109 FIFA ▲4] [🏆 3 lần vô địch] │ ◄ 3 thẻ số liệu mang 3 màu
 *   │ [🚩 Nhất bảng F]              🌾   🌾   │   chủ đạo: vàng · đỏ · xanh tre
 *   └───────────────────────────────────────┘
 *
 * ----------------------------------------------------------------------------
 * 🎯 VÌ SAO BANNER CŨ "TRỐNG TRẢI"?
 *
 * Bản cũ chỉ có một dòng tên + một dòng hạng FIFA trên cả mảng 390×136pt: hơn
 * nửa diện tích là nền xanh đậm không mang thông tin, không mang cảm xúc.
 * Banner mới lấp khoảng trống bằng hai thứ có GIÁ TRỊ, không phải hoa văn vô nghĩa:
 *
 *   1. BẢN SẮC — lá cờ đỏ sao vàng lớn và bông lúa: người mở app biết ngay
 *      "đây là app của đội tuyển mình", không cần đọc chữ.
 *   2. THÔNG TIN — ba con số người hâm mộ quan tâm nhất (hạng FIFA, số lần vô
 *      địch, vị trí ở bảng đấu), mỗi thẻ mang một màu chủ đạo -> ba màu cờ/sao/tre
 *      hiện rõ ngay màn hình đầu tiên.
 *
 * ⚠️ QUY TẮC TƯƠNG PHẢN VẪN GIỮ NGUYÊN: lá cờ nằm DƯỚI chữ, nhưng mọi dòng chữ
 * đặt trên nền tối hoặc trên thẻ có nền đặc riêng — không có chữ nào nằm trực
 * tiếp trên nền đỏ của lá cờ (chỗ đó chữ vàng/trắng không đủ 4.5:1).
 *
 * 🔁 Dữ liệu dùng CHUNG khoá truy vấn với các màn khác (['ranking','fifa',5],
 * ['team','overview'], ['competitions','standings','current']) -> không tải thêm
 * lần nào nếu người dùng đã mở Tab Giới thiệu hay phân đoạn BXH.
 * ============================================================================
 */

import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { AppText } from '@/components/common/Text';
import { Skeleton } from '@/components/common/States';
import { AccountButton } from '@/components/common/AccountButton';
import { GoldStar, HeroBanner, RiceStalk, TricolorStripe, VietnamFlag } from '@/components/decor';
import { competitionsApi, rankingApi, teamApi } from '@/api/endpoints';

export function HomeHero() {
  const t = useTheme();

  const ranking = useQuery({ queryKey: ['ranking', 'fifa', 5], queryFn: () => rankingApi.fifa(5) });
  const team = useQuery({ queryKey: ['team', 'overview'], queryFn: teamApi.overview, staleTime: 60 * 60 * 1000 });
  const standings = useQuery({
    queryKey: ['competitions', 'standings', 'current'],
    queryFn: () => competitionsApi.standings(),
    staleTime: 10 * 60 * 1000,
  });

  const vie = ranking.data?.vietnam;
  const champion = team.data?.trophies.champion;
  const group = standings.data?.groups.find((g) => g.rows.some((r) => r.is_vietnam));
  const vieRow = group?.rows.find((r) => r.is_vietnam);

  /**
   * Hoạ tiết phía sau chữ. Toạ độ tính cho màn 360–430pt: lá cờ 150pt rộng,
   * lùi ra ngoài mép phải 22pt để trông như đang bay vào khung hình — cờ nằm
   * trọn trong khung thì giống hình dán, tràn mép thì có chuyển động.
   */
  const decoration = (
    <>
      {/*
        Quầng sao vàng rất nhẹ sau lá cờ — như nắng chiếu vào lá cờ.
        ⚠️ Giữ ≤ 6% độ đục: ảnh chụp trên máy ảo cho thấy ở 12%, vàng trộn với nền
        xanh tre sẫm thành màu ô-liu xỉn, trông như vết bẩn chứ không phải ánh sáng.
      */}
      <View style={{ position: 'absolute', right: -10, top: 30, opacity: 0.06 }}>
        <GoldStar size={190} />
      </View>
      <View style={{ position: 'absolute', right: -22, top: 58, transform: [{ rotate: '-9deg' }] }}>
        <VietnamFlag size={150} radius={6} />
      </View>
      {/* Hai bông lúa ở góc dưới phải — ý nghĩa "ghi công, thành quả" */}
      <View style={{ position: 'absolute', right: 70, bottom: 6, opacity: 0.55 }}>
        <RiceStalk size={64} />
      </View>
      <View style={{ position: 'absolute', right: 34, bottom: 2, opacity: 0.4 }}>
        <RiceStalk size={54} mirrored />
      </View>
    </>
  );

  return (
    <HeroBanner minHeight={236} showFlag={false} decoration={decoration}>
      {/* ---------- Hàng trên: nhãn nhỏ + nút tài khoản ---------- */}
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
        <AppText variant="overline" style={{ color: t.static.liveGold, letterSpacing: 1.2 }}>
          Đội tuyển bóng đá quốc gia
        </AppText>
        <AccountButton />
      </View>

      {/* ---------- Tên + khẩu hiệu — cột trái, chừa chỗ cho lá cờ bên phải ---------- */}
      <View style={{ maxWidth: '62%', marginTop: 2 }}>
        <AppText variant="h1" style={{ color: t.static.white }}>
          Việt Nam
        </AppText>
        <AppText variant="body" style={{ color: t.static.riceGradient[0] }}>
          Những chiến binh Sao Vàng
        </AppText>
        <View style={{ width: 72, marginTop: t.spacing.sm, borderRadius: 2, overflow: 'hidden' }}>
          <TricolorStripe height={4} />
        </View>
      </View>

      {/* ---------- Ba thẻ số liệu — ba màu chủ đạo ---------- */}
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: t.spacing.sm, marginTop: t.spacing.lg }}>
        {/* ① VÀNG — hạng FIFA */}
        {ranking.isLoading ? (
          <Skeleton width={130} height={30} radius={15} />
        ) : vie ? (
          <Chip
            background={t.static.onDark.chipBg}
            border={t.static.liveGold}
            icon={<GoldStar size={13} />}
            label={`Hạng ${vie.rank} FIFA`}
            color={t.static.liveGold}
            accessibilityLabel={`Hạng ${vie.rank} thế giới theo FIFA${vie.change ? `, ${vie.change > 0 ? 'tăng' : 'giảm'} ${Math.abs(vie.change)} bậc` : ''}`}
            trailing={
              vie.change !== 0 ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Ionicons
                    name={vie.change > 0 ? 'caret-up' : 'caret-down'}
                    size={11}
                    color={vie.change > 0 ? t.static.onDark.win : t.static.onDark.lose}
                  />
                  <AppText
                    tabular
                    style={{
                      fontSize: t.fontSize.xs,
                      fontWeight: t.fontWeight.bold,
                      color: vie.change > 0 ? t.static.onDark.win : t.static.onDark.lose,
                    }}
                  >
                    {Math.abs(vie.change)}
                  </AppText>
                </View>
              ) : null
            }
          />
        ) : null}

        {/* ② ĐỎ — số lần vô địch */}
        {typeof champion === 'number' && champion > 0 && (
          <Chip
            background={t.static.tricolor[0]}
            icon={<Ionicons name="trophy" size={13} color={t.static.white} />}
            label={`${champion} lần vô địch`}
            color={t.static.white}
          />
        )}

        {/* ③ XANH TRE — vị trí ở bảng đấu (chỉ khi đang dự giải vòng bảng) */}
        {vieRow && group && (
          <Chip
            background={t.static.tricolor[2]}
            icon={<Ionicons name="podium" size={13} color={t.static.white} />}
            label={`${vieRow.position === 1 ? 'Nhất' : `Hạng ${vieRow.position}`} ${group.group_name.replace(/^Bảng/, 'bảng')}`}
            color={t.static.white}
          />
        )}
      </View>
    </HeroBanner>
  );
}

/**
 * Thẻ số liệu dạng viên thuốc.
 *
 * Mỗi thẻ có NỀN ĐẶC riêng: đặt lên lá cờ đỏ hay nền tre đều đọc được, vì chữ
 * chỉ so tương phản với nền của chính thẻ (trắng trên đỏ cờ 4.9:1, trắng trên
 * xanh tre 5.6:1, vàng trên nền gần đen 12:1).
 */
function Chip({
  background,
  border,
  icon,
  label,
  color,
  trailing,
  accessibilityLabel,
}: {
  background: string;
  border?: string;
  icon: React.ReactNode;
  label: string;
  color: string;
  trailing?: React.ReactNode;
  accessibilityLabel?: string;
}) {
  const t = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={accessibilityLabel ?? label}
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        height: 30,
        paddingHorizontal: t.spacing.md,
        borderRadius: 15,
        backgroundColor: background,
        borderWidth: border ? 1 : 0,
        borderColor: border,
      }}
    >
      {icon}
      <AppText tabular style={{ fontSize: t.fontSize.sm, fontWeight: t.fontWeight.bold, color }}>
        {label}
      </AppText>
      {trailing}
    </View>
  );
}
