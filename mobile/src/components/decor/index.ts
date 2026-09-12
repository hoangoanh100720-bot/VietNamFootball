/**
 * ============================================================================
 * COMPONENTS/DECOR/INDEX.TS — CỬA XUẤT CHUNG CỦA BỘ HOẠ TIẾT
 * ============================================================================
 *
 * Gom mọi hoạ tiết vào một chỗ để nơi dùng chỉ cần viết:
 *
 *   import { VietnamFlag, RiceStalk, BambooDivider } from '@/components/decor';
 *
 * thay vì ba dòng import từ ba file khác nhau.
 *
 * ----------------------------------------------------------------------------
 * 🎨 BỘ NHẬN DIỆN HÌNH ẢNH — DÙNG MỖI THỨ VÀO VIỆC GÌ
 *
 *   🇻🇳 VietnamFlag  — huy hiệu app, khoảnh khắc trọng đại, hero
 *   ⭐ GoldStar      — đội trưởng, cầu thủ hay nhất trận, thang đánh giá
 *   🌾 RiceStalk     — CHỈ dùng cho thành tích và danh hiệu
 *   🌾 RiceWreath    — vòng nguyệt quế ôm lấy một con số thành tích
 *   🎋 BambooStalk   — cột trang trí, hoạ tiết nền
 *   🎋 BambooDivider — đường phân cách giữa các mục
 *   🎋 BambooGrove   — bụi tre mờ làm nền (luôn để độ đục ≤ 8%)
 *   🖼️ HeroBanner    — khối đầu màn hình, đã ghép sẵn cả bốn lớp
 *
 * ⛔ NGUYÊN TẮC CHUNG: mỗi biểu tượng có MỘT ý nghĩa và chỉ dùng đúng chỗ đó.
 *    Bông lúa rải lên màn hình đăng nhập thì nó không còn nghĩa là thành tích
 *    nữa — nó chỉ còn là hoa văn. Và hoa văn dùng bừa thì làm giao diện rẻ đi.
 * ============================================================================
 */

export { VietnamFlag, GoldStar, buildStarPath, STAR_INNER_RATIO } from './VietnamFlag';
export { RiceStalk, RiceWreath } from './RiceStalk';
export { BambooStalk, BambooDivider, BambooGrove } from './Bamboo';
export { HeroBanner } from './HeroBanner';
