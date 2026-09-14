/**
 * ============================================================================
 * APP/(TABS)/ACCOUNT.TSX — TAB "CÀI ĐẶT" (CHỈ HIỆN Ở SENIOR MODE)
 * ============================================================================
 *
 * ARCHITECTURE.md mục 7.2: Senior mode có 3 tab — Trận đấu · Đội hình · Cài đặt.
 *
 * Ở giao diện thường, tab này bị ẨN khỏi thanh tab (`href: null` trong
 * app/(tabs)/_layout.tsx) và Cài đặt được mở từ ảnh đại diện ở góc màn hình.
 * Người lớn tuổi khó tìm nút nhỏ ở góc — nên với họ, Cài đặt lên hẳn thanh tab,
 * và quan trọng nhất: công tắc TẮT Senior mode luôn chỉ cách một cú chạm.
 *
 * Nội dung dùng chung với app/settings.tsx — xem components/settings/SettingsContent.tsx.
 * ============================================================================
 */

import { Screen } from '@/components/common/Screen';
import { Seo } from '@/components/common/Seo';
import { SettingsContent } from '@/components/settings/SettingsContent';

export default function AccountTab() {
  return (
    // scroll={false}: SettingsContent đã tự có ScrollView — lồng thêm một lớp cuộn dọc là vuốt lúc ăn lúc không
    <Screen scroll={false} padded={false}>
      <Seo title="Cài đặt" description="Tuỳ chỉnh giao diện ứng dụng Đội tuyển Việt Nam." path="/account" noIndex />
      <SettingsContent />
    </Screen>
  );
}
