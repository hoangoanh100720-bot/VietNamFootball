# 🎨 HỆ THỐNG THIẾT KẾ — ĐỘI TUYỂN VIỆT NAM

> Tài liệu này dành cho người **viết giao diện** cho dự án. Đọc xong bạn sẽ biết
> dùng màu nào ở đâu, khi nào được dùng hoạ tiết, và những lỗi nào phải tránh.
>
> 📐 Kiến trúc tổng thể: [ARCHITECTURE.md](../ARCHITECTURE.md) · 🚀 Chạy thử: [README.md](../README.md)

---

## 1. BA MÀU CHỦ ĐẠO & TỶ LỆ 80/15/5

Ba màu lấy thẳng từ những hình ảnh gắn với người Việt Nam:

| | Màu | Mã | Lấy từ |
|---|---|---|---|
| ① | **Đỏ cờ** | `#DA251D` | nền lá quốc kỳ |
| ② | **Vàng sao** | `#FFCD00` | ngôi sao năm cánh & bông lúa chín |
| ③ | **Xanh tre** | `#0A1A12` → `#3E7D52` | thân tre già, luỹ tre làng |

### ⚠️ Điều quan trọng nhất: ba màu **không** đứng ngang hàng

```
XANH TRE   ████████████████████████████  ~80%   NỀN
ĐỎ CỜ      █████                          ~15%   NHẤN
VÀNG SAO   █                               ~5%   ĐIỂM XUYẾT
```

- **Xanh tre là NỀN** — toàn bộ dải màu trung tính (nền, bề mặt, viền, chữ phụ)
  đều mang sắc độ xanh tre (hue ~152). Đây là thứ khiến giao diện "có mùi tre"
  mà không cần tô xanh lá lên bất cứ đâu.
- **Đỏ cờ là NHẤN** — nút chính, tab đang chọn, thẻ trận đang đá.
- **Vàng sao là ĐIỂM XUYẾT** — chỉ dùng cho 4 việc: trận LIVE · đội trưởng ·
  danh hiệu/thành tích · hoạ tiết bông lúa.

> 🚫 **Ba màu mạnh chia đều diện tích sẽ thành biển quảng cáo, không phải thiết kế.**
> Tỷ lệ 80/15/5 chính là thứ tạo cảm giác có chủ đích.

---

## 2. QUY TẮC BẤT DI BẤT DỊCH

### ⛔ Không bao giờ viết mã màu thô trong component

```tsx
// ❌ SAI
<View style={{ backgroundColor: '#0A1A12' }} />
<Text style={{ color: 'rgba(255,255,255,0.7)' }} />

// ✅ ĐÚNG
const t = useTheme();
<View style={{ backgroundColor: t.colors.bg }} />
<Text style={{ color: t.static.onDark.textMuted }} />
```

Mọi màu nằm ở [`mobile/src/theme/colors.ts`](../mobile/src/theme/colors.ts).
Đổi nhận diện thương hiệu = sửa một file.

### ⚠️ Nền cố định thì chữ trên nó cũng phải cố định

Đây là lỗi tinh vi nhất và rất dễ lọt qua khâu kiểm thử:

```tsx
// ❌ SAI — hero luôn nền xanh tre SẪM ở cả hai chế độ.
//    Ở chế độ sáng, t.colors.text là xanh đậm -> chữ biến mất.
<HeroBanner><AppText>Đội tuyển Việt Nam</AppText></HeroBanner>

// ✅ ĐÚNG — nền cố định thì dùng staticColors
<HeroBanner>
  <AppText style={{ color: t.static.white }}>Đội tuyển Việt Nam</AppText>
</HeroBanner>
```

Dùng `t.colors.*` cho nền **theo theme**; dùng `t.static.*` cho nền **cố định**
(hero, thẻ trận đang đá, ảnh bìa).

### ⚠️ Không bao giờ truyền tin chỉ bằng màu

Thắng/Hoà/Thua luôn kèm chữ **T** / **H** / **B**, không chỉ tô màu.
Khoảng 8% nam giới bị mù màu đỏ-lục — họ vẫn phải dùng được app.

---

## 3. VÌ SAO CÓ CẢ `gold` LẪN `goldText`?

Vì tương phản đọc được khác nhau giữa hai chế độ:

| Token | Chế độ tối | Chế độ sáng | Dùng cho |
|---|---|---|---|
| `accent` | `#DA251D` | `#DA251D` | **mảng lớn**: nút, nền badge |
| `accentText` | `#FF5F52` (6.0:1) | `#B81811` (7.3:1) | **chữ và icon** |
| `gold` | `#FFCD00` | `#FFCD00` | **mảng lớn** |
| `goldText` | `#FFCD00` (12:1) | `#A87900` | **chữ** |
| `bamboo` | `#3E7D52` | `#2E7048` | hoạ tiết, đường trang trí |
| `bambooText` | `#6FBF8A` (7.4:1) | `#1B5E3A` (6.1:1) | **chữ** |

> 💡 Vàng sao `#FFCD00` đặt làm chữ trên nền sáng chỉ đạt **1.7:1** — hoàn toàn
> không đọc được. Đó là lý do `goldText` tồn tại.

**Quy tắc nhớ nhanh:** tô nền → dùng bản gốc. Viết chữ → dùng bản `*Text`.

---

## 4. BỘ HOẠ TIẾT VIỆT NAM

Nằm ở [`mobile/src/components/decor/`](../mobile/src/components/decor/).
Tất cả vẽ bằng **SVG**, không dùng ảnh PNG: sắc nét ở mọi kích cỡ, nhẹ ~1KB,
và đổi màu được bằng một thuộc tính.

| Component | Ý nghĩa | Dùng ở đâu |
|---|---|---|
| `<VietnamFlag />` | 🇻🇳 bản sắc | huy hiệu app, hero, khoảnh khắc trọng đại |
| `<GoldStar />` | ⭐ nổi bật | đội trưởng, cầu thủ hay nhất, thang đánh giá |
| `<RiceStalk />` | 🌾 **ghi công** | CHỈ dùng cho thành tích, danh hiệu |
| `<RiceWreath />` | 🌾 vòng nguyệt quế | ôm lấy một con số thành tích |
| `<BambooStalk />` | 🎋 sự kế thừa | cột trang trí, hoạ tiết nền |
| `<BambooDivider />` | 🎋 phân cách | thay đường kẻ 1px giữa các mục |
| `<BambooGrove />` | 🎋 chiều sâu | bụi tre mờ làm nền (độ đục ≤ 8%) |
| `<HeroBanner />` | 🖼️ khối đầu màn hình | đã ghép sẵn cả 4 lớp |

### ⛔ Mỗi biểu tượng có MỘT ý nghĩa — dùng đúng chỗ đó

Bông lúa nghĩa là **ghi công**. Rải nó lên màn hình đăng nhập thì nó không còn
nghĩa gì nữa, chỉ còn là hoa văn. Và hoa văn dùng bừa làm giao diện **rẻ đi**.

Trong toàn app, bông lúa chỉ xuất hiện **một chỗ**: ôm lấy thứ hạng FIFA ở tab
Dự đoán. Mỗi lần thấy nó, người dùng hiểu ngay "đây là điều đáng tự hào".

### 📏 Độ mờ hoạ tiết nền: 5-10%

> **Cách kiểm tra nhanh:** lùi ra xa màn hình một mét. Còn **đọc rõ chữ** nhưng
> vẫn **cảm được có hoạ tiết** → đúng mức. Đậm hơn là hoạ tiết tranh chỗ với chữ.

---

## 5. KHỐI HERO — BỐN LỚP

```
┌────────────────────────────────────┐
│ ④ Nội dung: tiêu đề, mô tả         │ ← tương phản cao nhất
│ ③ Vệt cờ đỏ 4px ở cạnh trái        │ ← dấu hiệu nhận diện
│ ② Bụi tre mờ ở đáy (8% độ đục)     │ ← chiều sâu
│ ① Dải xanh tre sẫm                 │ ← nền
└────────────────────────────────────┘
```

```tsx
// Tràn sát mép màn hình — dùng prop `header` của <Screen>
const hero = (
  <HeroBanner minHeight={136}>
    <AppText variant="h2" style={{ color: t.static.white }}>Tiêu đề</AppText>
  </HeroBanner>
);

return <Screen header={hero}>...nội dung có lề...</Screen>;
```

**Biến thể `variant="flag"`** (nền đỏ) chỉ dành cho khoảnh khắc trọng đại —
trận đang đá, vô địch. Đỏ là màu mạnh nhất trong bảng; dùng nhiều thì hết thiêng.

---

---

## 5b. Ô TÌM KIẾM NÀO TỐN TIỀN, Ô NÀO KHÔNG

Trong app có **hai** ô tìm kiếm trông giống nhau nhưng hành xử phải khác hẳn:

| | Tìm cầu thủ (tab Cầu thủ) | Hỏi đáp kho tri thức (tab Dự đoán) |
|---|---|---|
| Gọi tới | bảng `players` | API `/search` + nhúng vector Gemini |
| Chi phí | miễn phí | **tốn 1 lượt quota mỗi lần tìm** |
| Tốc độ | ~30ms | 500-900ms |
| Cách kích hoạt | **debounce 350ms**, tự gọi khi ngừng gõ | **bấm nút / nhấn Enter** |

> ⚠️ **Đây là lý do hai ô không dùng chung một cách làm.**
> Nếu ô hỏi đáp cũng debounce tự gọi, gõ một câu 20 ký tự sẽ tạo ra cả chục
> lượt gọi Gemini — hết quota trong vài phút. Vì vậy `KnowledgeSearch` tách
> `draft` (chữ đang gõ) khỏi `submitted` (câu đã gửi), và React Query chỉ
> chạy khi `submitted` đổi.

**Quy tắc chung:** thao tác nào gọi tới AI thì phải do người dùng **chủ động
kích hoạt**, không bao giờ tự chạy ngầm.

---

## 6. THANG CHỮ & KHOẢNG CÁCH

```
11 — 13 — 15 — 17 — 22 — 28 — 40      (tỷ lệ ~1.25)
```

- Chữ nội dung **không bao giờ nhỏ hơn 15**
- Cỡ 11-13 chỉ cho **nhãn phụ**, luôn kèm màu mờ
- Cỡ 40 chỉ dành cho **một thứ duy nhất**: con số tỷ số trực tiếp
- Mọi con số dùng `tabular` → chữ số cùng bề rộng, không nhảy khi tỷ số đổi

**Phân cấp bằng 3 thứ, không chỉ cỡ chữ:** cỡ + độ đậm + màu.
Làm chữ mờ đi thường hiệu quả hơn thu nhỏ nó lại.

**Khoảng cách tạo phân cấp:** khoảng trắng **giữa** hai khối phải lớn gấp 2-3 lần
khoảng trắng **bên trong** một khối. Đó là cách khoảng trắng tự thể hiện cấu trúc
mà không cần thêm một đường kẻ nào.

---

## 7. CHẾ ĐỘ SÁNG **KHÔNG PHẢI** LÀ BẢN ĐẢO NGƯỢC

| | Chế độ tối | Chế độ sáng |
|---|---|---|
| Nền | `#0A1A12` xanh tre đêm | `#F7F6EF` **giấy dó** (trắng ngả vàng) |
| Chiều sâu | càng nổi càng **SÁNG** + viền 1px | bóng đổ nhìn thấy được |
| Vàng làm chữ | `#FFCD00` dùng thẳng | phải sẫm thành `#A87900` |

> Nền trắng ngả vàng gợi giấy dó, hạt lúa và nắng — ăn khớp với bảng màu.
> Trắng ngả xanh (`#F5F7FA`) là mặc định của mọi app công nghệ, vô hồn.

---

## 8. DANH SÁCH TỰ KIỂM TRƯỚC KHI XONG MỘT MÀN HÌNH

- [ ] Không còn mã màu thô nào trong file (`grep "#[0-9A-Fa-f]\{6\}"`)
- [ ] Chữ trên nền cố định dùng `t.static.*`, không dùng `t.colors.*`
- [ ] Xử lý đủ **4 trạng thái**: đang tải (skeleton) · lỗi · rỗng · có dữ liệu
- [ ] Kiểm tra ở **cả hai** chế độ sáng và tối
- [ ] Vùng chạm tối thiểu **44×44px**
- [ ] Thông tin thắng/thua có **cả chữ**, không chỉ màu
- [ ] Đã đặt `<Seo>` ở đầu màn hình (xem mục dưới)

---

## 9. SEO — MỖI MÀN HÌNH MỘT THẺ `<Seo>`

```tsx
<Seo
  title="Đội hình ra sân"                    // < 35 ký tự, KHÔNG kèm tên app
  description="Sơ đồ chiến thuật và..."      // 150-160 ký tự, PHẢI khác các trang khác
  path="/squad"
/>
```

| Nơi khai báo | Chứa gì |
|---|---|
| `app/+html.tsx` | thẻ **giống nhau ở mọi trang**: charset, viewport, theme-color, manifest, JSON-LD |
| `components/common/Seo.tsx` | thẻ **đổi theo từng trang**: title, description, og:*, canonical |

> 🐛 **Lỗi đã gặp thật:** ban đầu cả hai nơi cùng khai `description` và `canonical`.
> File HTML xuất ra có **hai** thẻ `<title>`, **hai** `description` với nội dung
> khác nhau và **hai** `canonical` trỏ hai địa chỉ. Google gặp cảnh này sẽ tự
> chọn bừa — bạn mất quyền quyết định trang mình hiện ra thế nào.
>
> **Quy tắc rút ra: một thông tin — một nơi khai báo duy nhất.**

Kiểm tra sau khi build:

```bash
cd mobile && npx expo export --platform web
# Mỗi trang phải có ĐÚNG 1 title, 1 description, 1 canonical
grep -c '<title' dist/index.html
```

---

## 10. HAI LỖI THẬT ĐÃ PHÁT HIỆN QUA KIỂM THỬ (đừng lặp lại)

### 🐛 Thẻ trang trí nuốt cú chạm

```tsx
// ❌ Các nút nằm dưới lớp này sẽ bấm không ăn.
//    Cực khó truy ra vì màn hình trông hoàn toàn bình thường.
<View style={{ position: 'absolute', ... }}>

// ✅ Lớp trang trí phải trong suốt với thao tác chạm
<View pointerEvents="none" style={{ position: 'absolute', ... }}>
```

### 🐛 Quên `overflow: 'hidden'` ở khối bo góc

Không có nó, dải màu và hoạ tiết nền tràn ra ngoài phần bo góc, để lộ những
góc vuông nham nhở ở bốn phía.

---

## 11. FILE NÀO Ở ĐÂU

```
mobile/src/
├── theme/
│   ├── colors.ts          ⭐ BA MÀU CHỦ ĐẠO + mọi token màu
│   ├── tokens.ts          thang chữ, khoảng cách, bo góc, bóng đổ
│   └── index.tsx          ThemeProvider + hook useTheme()
├── components/
│   ├── decor/             ⭐ CỜ · BÔNG LÚA · CÂY TRE · HERO
│   └── common/
│       ├── Screen.tsx     khung màn hình (có prop `header` tràn viền)
│       ├── Text.tsx       thang chữ
│       ├── Card.tsx       thẻ + SectionHeader (có mắt tre)
│       └── Seo.tsx        ⭐ thẻ SEO riêng từng màn hình
└── app/
    ├── +html.tsx          ⭐ vỏ HTML bản web — nền tảng SEO
    └── +not-found.tsx     trang 404 có nhận diện riêng
```
