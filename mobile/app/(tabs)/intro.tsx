/**
 * ============================================================================
 * APP/(TABS)/INTRO.TSX — TAB 1: GIỚI THIỆU & THÀNH TÍCH
 * ============================================================================
 *
 * Đây là tab ĐẦU TIÊN người dùng thấy khi mở app. Nhiệm vụ của nó không phải
 * cập nhật tin tức, mà trả lời câu hỏi: "Đội tuyển này là ai?"
 *
 * Đặc tả gốc: ARCHITECTURE.md mục 5.1
 *
 * ----------------------------------------------------------------------------
 * 🗺️ BỐ CỤC (từ trên xuống, theo đúng thứ tự người ta muốn biết)
 *
 *   ┌────────────────────────────────────┐
 *   │ 🇻🇳 Đội tuyển Việt Nam             │  ← HERO: cờ + tên + biệt danh
 *   │    Những chiến binh Sao Vàng        │
 *   │    [AFC] [AFF]  ⭐ Hạng cao nhất #94│
 *   ├────────────────────────────────────┤
 *   │ 🌾   3   🌾   ← TỦ DANH HIỆU        │  vòng nguyệt quế bông lúa
 *   │    LẦN VÔ ĐỊCH                      │  ôm lấy con số vô địch
 *   │  [1 Á quân] [2 Châu lục] [6 Tổng]   │
 *   ├────────────────────────────────────┤
 *   │ GIỚI THIỆU              Xem thêm ›  │  intro_text, thu gọn 4 dòng
 *   ├────────────────────────────────────┤
 *   │ DÒNG THỜI GIAN                      │  danh sách thành tích theo năm
 *   │ ● 2024  Vô địch ASEAN Cup           │
 *   │ ○ 2022  Á quân AFF Cup              │
 *   ├────────────────────────────────────┤
 *   │ THÔNG TIN CHUNG                     │  liên đoàn, sân nhà
 *   └────────────────────────────────────┘
 *
 * ----------------------------------------------------------------------------
 * 🌾 VÌ SAO TAB NÀY ĐƯỢC DÙNG BÔNG LÚA?
 *
 * Bông lúa trong bộ nhận diện của app mang đúng MỘT ý nghĩa: SỰ GHI CÔNG
 * (xem docs/DESIGN-SYSTEM.md mục 4). Tủ danh hiệu là nơi duy nhất trong app
 * nói về thành tích lịch sử — nên nó xứng đáng với vòng nguyệt quế.
 *
 * Cả app chỉ có hai chỗ dùng bông lúa: đây và thứ hạng FIFA ở tab Dự đoán.
 * Dùng ít thì mỗi lần thấy nó người dùng hiểu ngay "đây là điều đáng tự hào".
 *
 * ----------------------------------------------------------------------------
 * 💾 VÌ SAO CACHE TỚI 24 GIỜ?
 *
 * Hồ sơ đội tuyển và danh sách thành tích gần như bất biến — một chức vô địch
 * mới thì cả năm mới có một lần. Cache dài giúp tab này mở ra TỨC THÌ kể cả
 * khi mạng chậm, và người dùng vẫn kéo xuống làm mới được nếu muốn.
 *
 * Đối lập hoàn toàn với tab Trận đấu (cache 30 giây) — ở đó dữ liệu đổi từng phút.
 */

import { useState } from 'react';
import { View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/theme';
import { Screen } from '@/components/common/Screen';
import { AppText } from '@/components/common/Text';
import { Card, SectionHeader, InfoRow, Badge } from '@/components/common/Card';
import { ErrorState, Skeleton } from '@/components/common/States';
import { AccountButton } from '@/components/common/AccountButton';
import { Seo } from '@/components/common/Seo';
import { HeroBanner, RiceWreath, GoldStar, BambooDivider } from '@/components/decor';
import { teamApi } from '@/api/endpoints';
import type { Achievement, AchievementResult } from '@/types';

/**
 * Bảng tra: mã kết quả -> nhãn tiếng Việt + màu + icon.
 *
 * ⚠️ Khai báo ở cấp MODULE (ngoài component) được vì nó KHÔNG chứa màu theo
 * theme — chỉ có tên token dạng chuỗi, được tra ra màu thật lúc render.
 * Đây là khác biệt với bảng tra trong app/match/[id].tsx: bảng đó dùng
 * `t.colors.*` trực tiếp nên BẮT BUỘC phải nằm trong component.
 */
const RESULT_META: Record<
  AchievementResult,
  { label: string; tone: 'gold' | 'silver' | 'bronze' | 'neutral'; icon: keyof typeof Ionicons.glyphMap }
> = {
  champion: { label: 'Vô địch', tone: 'gold', icon: 'trophy' },
  runner_up: { label: 'Á quân', tone: 'silver', icon: 'medal' },
  third_place: { label: 'Hạng ba', tone: 'bronze', icon: 'medal-outline' },
  semi_final: { label: 'Bán kết', tone: 'neutral', icon: 'ribbon-outline' },
  quarter_final: { label: 'Tứ kết', tone: 'neutral', icon: 'ribbon-outline' },
  round_of_16: { label: 'Vòng 1/8', tone: 'neutral', icon: 'ribbon-outline' },
  group_stage: { label: 'Vòng bảng', tone: 'neutral', icon: 'ellipse-outline' },
  qualified: { label: 'Vượt vòng loại', tone: 'neutral', icon: 'checkmark-circle-outline' },
};

export default function IntroTab() {
  const t = useTheme();

  /**
   * Đoạn giới thiệu dài ~5 dòng. Mặc định THU GỌN còn 4 dòng.
   *
   * 📐 Vì sao không hiện hết ngay? Vì một khối chữ dài đặt ở đầu màn hình sẽ
   * đẩy tủ danh hiệu và dòng thời gian xuống dưới tầm nhìn. Người dùng mở tab
   * này muốn thấy THÀNH TÍCH trước, đọc tiểu sử sau — nên chữ dài phải nhường chỗ.
   */
  const [expanded, setExpanded] = useState(false);

  const query = useQuery({
    queryKey: ['team', 'overview'],
    queryFn: teamApi.overview,
    // Xem giải thích "vì sao cache 24 giờ" ở đầu file
    staleTime: 24 * 60 * 60 * 1000,
  });

  const data = query.data;

  // -------------------------------------------------------------------------
  // KHỐI HERO — cờ đỏ sao vàng + tên đội + biệt danh
  // -------------------------------------------------------------------------
  /**
   * ⚠️ Màu chữ ở đây dùng `t.static.*`, KHÔNG dùng `t.colors.*`.
   * Nền hero luôn là dải xanh tre SẪM ở cả chế độ sáng lẫn tối; dùng token
   * theo theme thì ở chế độ sáng chữ sẽ biến mất. Xem docs/DESIGN-SYSTEM.md mục 2.
   */
  const hero = (
    <HeroBanner minHeight={168}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: t.spacing.md }}>
        <View style={{ flex: 1, gap: 4 }}>
          <AppText variant="h2" style={{ color: t.static.white }}>
            {data?.profile.name ?? 'Đội tuyển Việt Nam'}
          </AppText>

          {/* Biệt danh — thứ tạo cảm xúc, nên cho nó màu vàng lúa nổi bật */}
          <AppText variant="body" style={{ color: t.static.riceGradient[0] }}>
            {data?.profile.nickname ?? 'Những chiến binh Sao Vàng'}
          </AppText>

          {/* Các liên đoàn thành viên + thứ hạng cao nhất từng đạt */}
          <View
            style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              alignItems: 'center',
              gap: t.spacing.sm,
              marginTop: 6,
            }}
          >
            {(data?.profile.confederations ?? []).map((c) => (
              <View
                key={c}
                style={{
                  borderWidth: 1,
                  borderColor: t.static.onDark.border,
                  borderRadius: t.radius.pill,
                  paddingHorizontal: 8,
                  paddingVertical: 2,
                }}
              >
                <AppText variant="caption" style={{ color: t.static.onDark.textMuted }}>
                  {c}
                </AppText>
              </View>
            ))}

            {data?.profile.best_fifa_rank && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                <GoldStar size={12} />
                <AppText variant="caption" tabular style={{ color: t.static.liveGold }}>
                  Hạng cao nhất #{data.profile.best_fifa_rank}
                </AppText>
              </View>
            )}
          </View>
        </View>

        {/* marginRight chừa chỗ cho lá cờ mà HeroBanner tự vẽ ở góc phải */}
        <View style={{ marginRight: 40 }}>
          <AccountButton />
        </View>
      </View>
    </HeroBanner>
  );

  return (
    <Screen header={hero} onRefresh={() => void query.refetch()} refreshing={query.isRefetching}>
      <Seo
        title="Giới thiệu & Thành tích"
        description="Lịch sử, tủ danh hiệu và dòng thời gian thành tích của Đội tuyển Bóng đá Quốc gia Việt Nam: 3 lần vô địch Đông Nam Á và 2 lần vào tứ kết Asian Cup."
        path="/intro"
      />

      <View style={{ height: t.spacing.lg }} />

      {/* ===================== ĐANG TẢI / LỖI ===================== */}
      {query.isLoading ? (
        <View style={{ gap: t.spacing.lg }}>
          <Skeleton width="100%" height={150} radius={t.radius.lg} />
          <Skeleton width="100%" height={120} radius={t.radius.lg} />
          <Skeleton width="100%" height={220} radius={t.radius.lg} />
        </View>
      ) : query.isError || !data ? (
        <ErrorState
          title="Không tải được thông tin đội tuyển"
          message={query.error instanceof Error ? query.error.message : undefined}
          onRetry={() => void query.refetch()}
        />
      ) : (
        <>
          {/* ===================== TỦ DANH HIỆU ===================== */}
          <SectionHeader title="Tủ danh hiệu" />

          <Card>
            {/*
              Con số VÔ ĐỊCH được đặt trong vòng nguyệt quế bông lúa và cho cỡ
              chữ lớn nhất màn hình. Ba con số còn lại nhỏ hơn, xếp thành hàng.

              📐 Đây là "phân cấp thị giác" bằng KÍCH THƯỚC: mắt luôn nhìn thứ
              to nhất trước. Nếu cả bốn con số cùng cỡ, người dùng phải tự đọc
              nhãn để biết cái nào quan trọng — chậm hơn nhiều.
            */}
            <View style={{ alignItems: 'center', paddingVertical: t.spacing.sm }}>
              <RiceWreath size={72}>
                <AppText
                  tabular
                  style={{
                    fontSize: t.fontSize.display,
                    fontWeight: t.fontWeight.black,
                    color: t.colors.goldText,
                  }}
                >
                  {data.trophies.champion}
                </AppText>
                <AppText variant="overline" tone="muted">
                  Lần vô địch
                </AppText>
              </RiceWreath>
            </View>

            <View style={{ alignItems: 'center', marginVertical: t.spacing.md }}>
              <BambooDivider width={120} />
            </View>

            <View style={{ flexDirection: 'row', justifyContent: 'space-around' }}>
              <TrophyStat value={data.trophies.runner_up} label="Á quân" />
              <TrophyStat value={data.trophies.continental_best} label="Châu lục" />
              <TrophyStat value={data.trophies.total} label="Tổng giải" />
            </View>
          </Card>

          {/* ===================== GIỚI THIỆU ===================== */}
          <SectionHeader title="Giới thiệu" />

          <Card onPress={() => setExpanded((v) => !v)}>
            {/*
              numberOfLines={4} khi thu gọn, undefined khi mở rộng.
              ⚠️ Phải là `undefined` chứ KHÔNG phải 0 — số 0 nghĩa là "không
              hiện dòng nào", chữ sẽ biến mất hoàn toàn.
            */}
            <AppText variant="body" tone="muted" numberOfLines={expanded ? undefined : 4}>
              {data.profile.intro_text}
            </AppText>

            <View
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                gap: 4,
                marginTop: t.spacing.sm,
              }}
            >
              <AppText variant="caption" style={{ color: t.colors.accentText }}>
                {expanded ? 'Thu gọn' : 'Xem thêm'}
              </AppText>
              <Ionicons
                name={expanded ? 'chevron-up' : 'chevron-down'}
                size={13}
                color={t.colors.accentText}
              />
            </View>
          </Card>

          {/* ===================== DÒNG THỜI GIAN ===================== */}
          <SectionHeader title="Dòng thời gian thành tích" />

          <Card padded={false}>
            {data.achievements.map((item, i) => (
              <AchievementRow
                key={item.id}
                item={item}
                last={i === data.achievements.length - 1}
              />
            ))}
          </Card>

          {/* ===================== THÔNG TIN CHUNG ===================== */}
          <SectionHeader title="Thông tin chung" />

          <Card>
            <InfoRow label="Liên đoàn" value={data.profile.federation ?? '—'} />
            <InfoRow label="Sân nhà" value={data.profile.home_stadium ?? '—'} />
            <InfoRow
              label="Thành viên"
              value={data.profile.confederations.join(' · ') || '—'}
            />
            <InfoRow
              label="Hạng FIFA cao nhất"
              value={
                data.profile.best_fifa_rank
                  ? `#${data.profile.best_fifa_rank}${
                      data.profile.best_fifa_rank_date
                        ? ` (${String(data.profile.best_fifa_rank_date).slice(0, 4)})`
                        : ''
                    }`
                  : '—'
              }
              tabular
              last
            />
          </Card>

          <View style={{ height: t.spacing.xxxl }} />
        </>
      )}
    </Screen>
  );
}

// ---------------------------------------------------------------------------
// CÁC THÀNH PHẦN NHỎ
// ---------------------------------------------------------------------------

/** Một ô số liệu trong tủ danh hiệu (á quân / châu lục / tổng) */
function TrophyStat({ value, label }: { value: number; label: string }) {
  const t = useTheme();

  return (
    <View style={{ alignItems: 'center', gap: 2 }}>
      <AppText
        tabular
        style={{
          fontSize: t.fontSize.xl,
          fontWeight: t.fontWeight.bold,
          color: t.colors.text,
        }}
      >
        {value}
      </AppText>
      <AppText variant="caption" tone="faint">
        {label}
      </AppText>
    </View>
  );
}

/**
 * MỘT DÒNG TRONG DÒNG THỜI GIAN THÀNH TÍCH.
 *
 * Bố cục: [năm] [chấm + đường nối] [tiêu đề + mô tả] [huy hiệu kết quả]
 *
 * 🎨 CHẤM TRÒN CÓ HAI HÌNH THÁI:
 *   ● đặc  = chức vô địch (thành tích cao nhất)
 *   ○ rỗng = các thành tích khác
 *
 * Phân biệt bằng CẢ hình dạng lẫn màu, không chỉ bằng màu — để người mù màu
 * vẫn đọc được dòng thời gian. Đây là quy tắc bắt buộc của dự án.
 */
function AchievementRow({ item, last }: { item: Achievement; last: boolean }) {
  const t = useTheme();

  const meta = RESULT_META[item.result] ?? RESULT_META.group_stage;
  const isChampion = item.result === 'champion';

  /**
   * Đổi "tone" trong bảng tra thành màu thật.
   *
   * Làm ở đây (trong component) chứ không làm trong RESULT_META vì màu phụ
   * thuộc theme sáng/tối, mà bảng tra lại nằm ở cấp module.
   */
  const toneColor =
    meta.tone === 'gold'
      ? t.colors.goldText
      : meta.tone === 'silver'
        ? t.colors.textMuted
        : meta.tone === 'bronze'
          ? t.colors.accentText
          : t.colors.bambooText;

  return (
    <View
      style={{
        flexDirection: 'row',
        gap: t.spacing.md,
        padding: t.spacing.md,
        borderBottomWidth: last ? 0 : 1,
        borderBottomColor: t.colors.border,
        alignItems: 'flex-start',
      }}
    >
      {/* Cột NĂM — rộng cố định để mọi dòng thẳng hàng, dễ lướt mắt dọc */}
      <AppText
        tabular
        variant="label"
        style={{ width: 42, color: isChampion ? t.colors.goldText : t.colors.textMuted }}
      >
        {item.edition_year}
      </AppText>

      {/* Chấm dòng thời gian */}
      <View
        style={{
          width: 10,
          height: 10,
          borderRadius: 5,
          marginTop: 5,
          backgroundColor: isChampion ? t.colors.gold : 'transparent',
          borderWidth: isChampion ? 0 : 2,
          borderColor: t.colors.borderStrong,
        }}
      />

      <View style={{ flex: 1, gap: 2 }}>
        <AppText variant="bodyBold">{item.title}</AppText>

        {item.description && (
          <AppText variant="caption" tone="muted" numberOfLines={2}>
            {item.description}
          </AppText>
        )}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 }}>
          <Ionicons name={meta.icon} size={12} color={toneColor} />
          {/* Nhãn CHỮ đi kèm icon — không bao giờ truyền tin chỉ bằng màu */}
          <AppText variant="caption" style={{ color: toneColor }}>
            {meta.label}
          </AppText>
          {item.host && (
            <AppText variant="caption" tone="faint">
              · {item.host}
            </AppText>
          )}
        </View>
      </View>

      {/* Ngôi sao vàng đánh dấu thành tích nổi bật */}
      {item.is_highlight && (
        <View style={{ marginTop: 3 }}>
          <GoldStar size={14} />
        </View>
      )}
    </View>
  );
}
