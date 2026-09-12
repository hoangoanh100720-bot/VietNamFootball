# ⚽ Đội tuyển Việt Nam

Ứng dụng di động (fullstack) cho người hâm mộ Đội tuyển Bóng đá Quốc gia Việt Nam: giới thiệu & thành tích, tỷ số trực tiếp, đội hình, hồ sơ cầu thủ, thống kê sau trận, điểm cầu thủ và trợ lý AI.

> 📐 Thiết kế kỹ thuật chi tiết: [ARCHITECTURE.md](./ARCHITECTURE.md)
> 🎨 Hệ thống thiết kế giao diện (màu, hoạ tiết, SEO): [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md)

---

## 🚀 CHẠY THỬ TRONG 5 PHÚT

Bạn cần: **Node.js 20.6 trở lên**, khuyến nghị 22 (kiểm tra bằng `node -v`). Không cần cài PostgreSQL, Redis hay Docker.

### Bước 0 — Tạo file `.env` (MỘT file duy nhất cho cả backend và mobile)

```bash
cp .env.example .env          # Windows PowerShell: Copy-Item .env.example .env
```

File `.env` nằm ở **gốc repo**, đã có trong `.gitignore`. Đổi `JWT_SECRET` và `JWT_REFRESH_SECRET` thành chuỗi ngẫu nhiên (`openssl rand -hex 64`). Mobile chỉ đọc các biến `EXPO_PUBLIC_*` trong file này.

### Bước 1 — Khởi động Backend

```bash
cd backend
npm install          # chỉ chạy lần đầu
npm run db:reset     # tạo database + đổ dữ liệu mẫu (chỉ lần đầu)
npm run dev          # khởi động server
```

Thấy dòng này là thành công:

```
VietNamFootball API đã sẵn sàng
   Địa chỉ    : http://localhost:5000/api/v1
   Database   : pglite
```

Mở trình duyệt vào <http://localhost:5000/health> để kiểm tra.

### Bước 2 — Cấu hình địa chỉ IP cho app

⚠️ **Đây là bước người mới hay sai nhất.**

App chạy trên điện thoại nên `localhost` sẽ trỏ vào chính cái điện thoại, không phải máy tính của bạn. Phải dùng địa chỉ IP của máy tính trong mạng nội bộ.

**Tìm IP máy tính:**

| Hệ điều hành | Lệnh | Xem dòng |
|---|---|---|
| Windows | `ipconfig` | `IPv4 Address` |
| macOS | `ipconfig getifaddr en0` | kết quả in ra |
| Linux | `hostname -I` | số đầu tiên |

Sau đó sửa nhóm 17 trong file `.env` ở **gốc repo**:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.56:5000/api/v1
EXPO_PUBLIC_SOCKET_URL=http://192.168.1.56:5000
```

(thay `192.168.1.56` bằng IP máy bạn)

### Bước 3 — Khởi động App

Mở **cửa sổ terminal thứ hai** (giữ nguyên terminal backend đang chạy):

```bash
cd mobile
npm install          # chỉ chạy lần đầu
npm start
```

Một mã QR sẽ hiện ra. Cài app **Expo Go** trên điện thoại (có trên App Store và Google Play), rồi:

- **Android**: mở Expo Go → Scan QR code
- **iPhone**: mở Camera → quét mã QR

📶 **Điện thoại và máy tính phải dùng chung một mạng Wi-Fi.**

---

## 📁 CẤU TRÚC DỰ ÁN

```
VietNamFootball/
├── ARCHITECTURE.md          # tài liệu thiết kế hệ thống
├── README.md                # file bạn đang đọc
├── .env.example             # mẫu biến môi trường (được commit)
├── .env                     # biến môi trường thật — MỘT file cho cả dự án (KHÔNG commit)
│
├── backend/                 # ===== API SERVER (Node.js + Express) =====
│   ├── src/
│   │   ├── config/          # env, database, gemini — cấu hình tập trung
│   │   ├── modules/         # nghiệp vụ, mỗi thư mục là một tính năng
│   │   │   ├── auth/        #   đăng ký, đăng nhập, JWT
│   │   │   ├── matches/     #   trận đấu, tỷ số, đối đầu
│   │   │   ├── squad/       #   đội hình, sơ đồ, giá trị
│   │   │   ├── players/     #   cầu thủ, HLV
│   │   │   ├── ai/          #   dự đoán bằng Gemini
│   │   │   ├── ranking/     #   bảng xếp hạng FIFA
│   │   │   ├── devices/     #   đăng ký thiết bị nhận thông báo
│   │   │   └── search/      #   ⭐ tìm kiếm lai: vector + từ khoá
│   │   ├── middlewares/     # bảo mật, kiểm tra dữ liệu, xử lý lỗi
│   │   ├── services/        # gemini, socket, crawler, OCR, embedding
│   │   │   └── crawl/       #   ⭐ robots.txt, tải trang lịch sự, bóc nội dung
│   │   ├── cli/             # ⭐ npm run crawl / ocr / index
│   │   ├── jobs/            # cron job + vòng lặp tỷ số trực tiếp
│   │   ├── db/              # migration + dữ liệu mẫu
│   │   └── utils/           # logger, cache, khuôn mẫu phản hồi
│   ├── scripts/             # công cụ kiểm thử
│   └── data/                # database PGlite (KHÔNG commit lên Git)
│
└── mobile/                  # ===== ỨNG DỤNG (React Native + Expo) =====
    ├── public/              # ⭐ robots.txt, sitemap.xml, manifest.json (SEO/PWA)
    ├── app/                 # màn hình — tên file chính là đường dẫn
    │   ├── +html.tsx        #   ⭐ vỏ HTML bản web — nền tảng SEO
    │   ├── +not-found.tsx   #   trang 404 có nhận diện riêng
    │   ├── (auth)/          #   login.tsx, register.tsx
    │   ├── (tabs)/          #   5 tab: Giới thiệu · Trận đấu · Đội hình · Cầu thủ · AI
    │   ├── match/[id].tsx   #   chi tiết trận đấu
    │   └── player/[id].tsx  #   hồ sơ cầu thủ
    └── src/
        ├── theme/           # ⭐ 3 màu chủ đạo: đỏ cờ · vàng sao · xanh tre
        ├── components/decor/ # ⭐ cờ đỏ sao vàng · bông lúa · cây tre
        ├── components/      # thành phần giao diện tái sử dụng
        ├── api/             # gọi backend
        ├── hooks/           # useLiveScore, useCountdown, useDebounce
        ├── services/        # lưu token an toàn, WebSocket
        └── store/           # trạng thái đăng nhập
```

---

## 🎓 ĐỌC CODE THEO THỨ TỰ NÀO?

Nếu bạn mới học, đọc theo lộ trình này sẽ dễ hiểu nhất. Mỗi file đều có comment giải thích chi tiết ngay bên trong.

### Backend

| Thứ tự | File | Học được gì |
|---|---|---|
| 1 | `src/config/env.ts` | Kiểm tra cấu hình, nguyên tắc "hỏng thì hỏng sớm" |
| 2 | `src/app.ts` | Middleware là gì, vì sao thứ tự quan trọng |
| 3 | `src/db/migrations/001_init.sql` | Thiết kế cơ sở dữ liệu, khoá ngoại, index |
| 4 | `src/config/database.ts` | Chống SQL Injection, transaction |
| 5 | `src/modules/auth/auth.service.ts` | ⭐ bcrypt, JWT, xoay vòng refresh token |
| 6 | `src/modules/matches/matches.service.ts` | JOIN, tránh lỗi N+1 query |
| 7 | `src/modules/ai/ai.service.ts` | Gọi AI có cache và nhiều lớp dự phòng |
| 8 | `src/services/socket.service.ts` | WebSocket, khái niệm "phòng" |
| 9 | `src/services/notification.service.ts` | Push FCM, dọn token chết, thiết kế "tắt được" |
| 10 | `src/config/geminiKeyPool.ts` | ⭐ Xoay vòng nhiều API key, phạt nghỉ khi 429 |
| 11 | `src/services/embedding.service.ts` | ⭐ Vector ý nghĩa, gộp lô tiết kiệm quota |
| 12 | `src/modules/search/search.service.ts` | ⭐ Tìm kiếm lai: trộn điểm vector + từ khoá |
| 13 | `src/services/crawl/robots.ts` | Cào dữ liệu có đạo đức, luật "khớp dài nhất thắng" |
| 14 | `src/services/crawl/crawler.ts` | Duyệt BFS, ba cái phanh chống crawl vô tận |
| 15 | `src/services/ocr.service.ts` | Đọc ảnh/PDF bằng model đa phương thức |
| 16 | `src/utils/text.ts` | Bỏ dấu tiếng Việt, cắt đoạn có gối đầu |

### Mobile

| Thứ tự | File | Học được gì |
|---|---|---|
| 1 | `src/theme/colors.ts` | ⭐ Design token, tương phản màu, dark mode |
| 2 | `src/components/common/Text.tsx` | Thang chữ, phân cấp thị giác |
| 3 | `app/_layout.tsx` | Định tuyến theo file, thứ tự Provider |
| 4 | `src/api/client.ts` | ⭐ Interceptor, tự làm mới token, hàng đợi |
| 5 | `app/(tabs)/index.tsx` | React Query, xử lý đủ 4 trạng thái |
| 6 | `src/hooks/useLiveScore.ts` | ⭐ WebSocket + polling dự phòng, dọn dẹp effect |
| 7 | `src/components/squad/FormationPitch.tsx` | Định vị bằng %, đảo trục toạ độ |
| 8 | `src/components/ai/PredictionDonut.tsx` | Vẽ biểu đồ vòng bằng SVG |
| 9 | `src/services/notifications.ts` | Xin quyền đúng ngữ cảnh, kênh Android |
| 10 | `src/components/decor/VietnamFlag.tsx` | ⭐ Vẽ ngôi sao 5 cánh bằng toán, tỷ lệ vàng |
| 11 | `src/components/decor/HeroBanner.tsx` | ⭐ Bốn lớp chồng nhau, giữ chữ luôn đọc được |
| 12 | `app/+html.tsx` | ⭐ Vỏ HTML bản web — nền tảng của toàn bộ SEO |
| 13 | `app/(tabs)/intro.tsx` | ⭐ Tab 1: tủ danh hiệu, dòng thời gian, chữ thu gọn |

---

## 🔧 CÁC LỆNH THƯỜNG DÙNG

### Backend

```bash
npm run dev        # chạy dev, tự khởi động lại khi sửa code
npm run build      # biên dịch TypeScript sang JavaScript
npm start          # chạy bản đã build (production)
npm run migrate    # tạo/cập nhật cấu trúc bảng
npm run seed       # đổ lại dữ liệu mẫu
npm run db:reset   # ⚠️ xoá sạch và dựng lại database
npm run db:live -- 45   # bật lại một trận về trạng thái "đang đá" từ phút 45
npm run typecheck  # kiểm tra lỗi kiểu dữ liệu
npm test           # kiểm thử nhanh toàn bộ API (server phải đang chạy)
npm run test:devices    # kiểm thử luồng đăng ký thông báo
npm run test:rating     # ⭐ 44 phép thử engine chấm điểm (KHÔNG cần server)

# --- Cào dữ liệu & tìm kiếm AI ---
npm run crawl -- <url>  # cào một trang web vào kho tri thức (xem mục nâng cao)
npm run ocr -- <file>   # đọc chữ trong ảnh/PDF bằng Gemini
npm run index           # nhúng vector cho các đoạn còn thiếu
```

> ⚠️ `db:reset`, `db:seed`, `db:live` đều cần **tắt server trước** (`Ctrl + C`).
> PGlite chỉ cho phép một tiến trình mở database cùng lúc — đó là bản chất của
> cơ sở dữ liệu nhúng, và cũng là một lý do production phải dùng PostgreSQL thật.

### Mobile

```bash
npm start          # khởi động Expo, hiện mã QR
npm run start:clear# khởi động và xoá cache (khi gặp lỗi lạ)
npm run android    # mở thẳng trên máy ảo Android
npm run ios        # mở thẳng trên máy ảo iOS (chỉ macOS)
npm run typecheck  # kiểm tra lỗi kiểu dữ liệu
```

---

## 🩺 XỬ LÝ SỰ CỐ THƯỜNG GẶP

<details>
<summary><b>App báo "Không kết nối được máy chủ"</b></summary>

Kiểm tra lần lượt:

1. Backend đã chạy chưa? → mở <http://localhost:5000/health> trên máy tính
2. `EXPO_PUBLIC_API_URL` trong `.env` ở gốc repo đã đúng IP máy tính chưa? (không phải `localhost`)
3. Điện thoại và máy tính có chung Wi-Fi không?
4. Tường lửa Windows có chặn cổng 5000 không? Thử lệnh sau trong PowerShell chạy bằng quyền Admin:

```powershell
New-NetFirewallRule -DisplayName "VNFootball API" -Direction Inbound -LocalPort 5000 -Protocol TCP -Action Allow
```

5. Sau khi sửa `.env`, **phải khởi động lại Expo** bằng `npm run start:clear` (biến môi trường được nhúng lúc khởi động).
</details>

<details>
<summary><b>Backend báo "KHÔNG MỞ ĐƯỢC DATABASE PGLITE" / "Aborted()"</b></summary>

Nguyên nhân: lần chạy trước bị tắt cưỡng chế (Task Manager, `kill -9`, mất điện) làm hỏng dữ liệu.

```bash
cd backend
npm run db:reset
```

**Phòng tránh:** luôn tắt server bằng `Ctrl + C` — khi đó server sẽ đóng database tử tế.
</details>

<details>
<summary><b>Backend báo "address already in use :::5000"</b></summary>

Đã có tiến trình khác chiếm cổng 5000.

```powershell
# Windows — tìm và tắt
netstat -ano | findstr :5000
taskkill /PID <số_PID> /F
```

Hoặc đổi sang cổng khác trong `.env` ở gốc repo: `PORT=5001` (nhớ sửa cả `EXPO_PUBLIC_API_URL` và `EXPO_PUBLIC_SOCKET_URL` trong cùng file).
</details>

<details>
<summary><b>Tỷ số trực tiếp không tự nhảy</b></summary>

1. Trong `.env` phải có `LIVE_SIMULATION=true` và `LIVE_POLLING_ENABLED=true`
2. Trận trong dữ liệu mẫu sẽ kết thúc ở phút 90. Chạy `npm run seed` để tạo lại trận đang đá.
3. Kiểm tra WebSocket bằng: `node scripts/socket-test.mjs`
</details>

<details>
<summary><b>Expo báo lỗi lạ sau khi cài thêm thư viện</b></summary>

```bash
cd mobile
npm run start:clear
```

Vẫn lỗi thì xoá cache sâu hơn:

```bash
rm -rf node_modules .expo
npm install
npm run start:clear
```
</details>

---

## 🔑 BẬT CÁC TÍNH NĂNG NÂNG CAO

### Dự đoán bằng AI thật (Google Gemini)

Mặc định app dùng **mô hình thống kê Elo** — hoạt động tốt, không tốn tiền, dựa trên điểm FIFA, phong độ và lợi thế sân nhà.

Muốn dùng AI thật để có bài phân tích chuyên sâu:

1. Lấy API key miễn phí tại <https://aistudio.google.com/apikey>
2. Điền vào `.env` ở gốc repo:
   ```env
   GEMINI_API_KEY=khoá_của_bạn
   ```
3. Khởi động lại backend

🔐 **Key này chỉ nằm ở backend, KHÔNG BAO GIỜ đưa vào app.** Mọi thứ nhúng trong app đều có thể bị đọc ra.

### Dữ liệu bóng đá thật

Hiện dữ liệu đến từ `npm run seed` (dữ liệu mẫu). Muốn lấy dữ liệu thật:

1. Đăng ký tại <https://www.api-football.com/> (có gói miễn phí)
2. Điền `FOOTBALL_API_KEY` vào `.env`, đặt `CRON_ENABLED=true` và `LIVE_SIMULATION=false`
3. Hoàn thiện phần gọi API trong `backend/src/services/crawler.service.ts` (khung đã dựng sẵn kèm chú thích)

### 🔑 Nhiều Gemini API key xoay vòng (chống hết quota)

Gói miễn phí của Gemini giới hạn theo **phút** và theo **ngày**. Khi crawl hoặc OCR hàng trăm trang, một key sẽ hết lượt rất nhanh. Hệ thống giải quyết bằng một "hồ key" xoay vòng.

Điền nhiều key vào `.env` ở gốc repo, ngăn bằng **dấu phẩy, không khoảng trắng**:

```env
GEMINI_API_KEYS=key_thu_nhat,key_thu_hai,key_thu_ba
GEMINI_KEY_COOLDOWN_MS=60000
```

Cách hoạt động (mã nguồn: `backend/src/config/geminiKeyPool.ts`):

| Lớp | Cơ chế |
|---|---|
| 1. Xoay vòng | Mỗi lượt gọi lấy key kế tiếp theo vòng tròn → tải rải đều |
| 2. Phạt nghỉ | Key dính lỗi 429 bị cho nghỉ 60 giây, hệ thống tự chuyển key khác |
| 3. Thử lại | Hết key khả dụng → tự lùi về phương án dự phòng, **không sập app** |

**Hồ key phân biệt ba loại lỗi — đây là điểm quan trọng nhất:**

| Lỗi | Nghĩa là gì | Hồ key làm gì |
|---|---|---|
| **429** `RESOURCE_EXHAUSTED` | tạm hết lượt, lát nữa lại được | cho key nghỉ 60s → **đổi key, thử lại** |
| **403** `PERMISSION_DENIED`<br>**401** `UNAUTHENTICATED` | key hoặc dự án bị chặn, **chờ không hết** | **loại key khỏi hồ** → đổi key, thử lại |
| lỗi khác (404 sai model, mất mạng, 500) | đổi key cũng không cứu được | dừng ngay, không đốt thêm lượt gọi |

> 🐛 **Vì sao phải tách loại thứ hai ra?** Một key hỏng vĩnh viễn mà bị xếp chung
> với "lỗi khác" sẽ khiến cứ mỗi lần con trỏ xoay vòng chạm vào nó là **cả lời
> gọi đó thất bại**, dù các key còn lại vẫn khoẻ. Với 3 key thì cứ 3 request
> hỏng 1, mà log chỉ báo chung chung nên rất khó lần ra.
>
> Đã kiểm chứng thật: thêm một key bị Google chặn vào hồ 3 key rồi gọi 6 lượt →
> key hỏng bị loại ngay lần chạm đầu, **6/6 lượt vẫn thành công**.

**Khi một key bị loại, log in ra hướng dẫn cụ thể:**

```
[Gemini] Key AQ.Ab8…B-Ig BỊ LOẠI khỏi hồ — 403 Your project has been denied access
    Đây KHÔNG phải hết quota, chờ bao lâu cũng không khỏi. Cần kiểm tra:
      1. Dự án Google Cloud của key có bị chặn / đình chỉ không?
      2. Đã bật Generative Language API cho dự án đó chưa?
      3. Key có bị dán thiếu ký tự vào .env không?
    Còn lại 2/3 key dùng được.
```

Xem tình trạng các key bất cứ lúc nào:

```bash
curl http://localhost:5000/api/v1/ai/status
```

> ⚠️ **Quota tính theo DỰ ÁN Google Cloud, không theo key.** Tạo 5 key trong cùng một tài khoản thì vẫn chỉ có **một** hạn mức. Muốn nhân quota thật sự, mỗi key phải thuộc một **tài khoản Google khác nhau**. Lấy key miễn phí tại <https://aistudio.google.com/apikey>.

> ⚠️ **Về tên model Gemini.** Google cho model cũ nghỉ hưu khá nhanh. Nếu log báo:
>
> ```
> 404 This model models/gemini-X is no longer available to new users.
> Please update your code to use models/gemini-Y
> ```
>
> thì chỉ cần đổi `GEMINI_MODEL` và `OCR_MODEL` trong `.env` sang tên model mà
> thông báo lỗi gợi ý — **không phải sửa một dòng code nào**. Tính tới 12/09/2026,
> dự án đang dùng `gemini-3.6-flash`.
>
> 💡 Hồ key đã phân biệt sẵn hai loại lỗi: lỗi **hết quota (429)** thì đổi key rồi thử
> lại, còn lỗi **sai tên model (404)** thì dừng ngay — vì đổi key cũng không cứu được,
> thử tiếp chỉ đốt thêm lượt gọi vô ích.

### 🕷️ Cào dữ liệu (crawl) + OCR bằng Gemini

```bash
cd backend

# Cào một trang, tối đa 20 trang, sâu 1 lớp
npm run crawl -- https://vff.org.vn/ --max-pages=20 --max-depth=1

# Cào nhanh, KHÔNG tốn quota (bỏ làm sạch bằng AI và bỏ nhúng vector)
npm run crawl -- https://vff.org.vn/ --no-ai --no-embed

# Chỉ đi vào link chứa "bong-da"
npm run crawl -- https://bao.vn --pattern=bong-da

# Đọc chữ trong ảnh/PDF rồi in ra màn hình
npm run ocr -- ./bang-xep-hang.png --hint="bảng xếp hạng vòng loại World Cup"

# Đọc chữ rồi LƯU LUÔN vào kho tri thức để AI tra cứu được
npm run ocr -- ./bien-ban-tran-dau.pdf --save

# Nhúng vector cho các đoạn còn thiếu
npm run index
```

> 💡 **Mẹo tiết kiệm quota — quy trình 2 bước:**
> `npm run crawl -- <url> --no-embed` (cào nhanh) → xem nội dung có dùng được không → `npm run index` (mới bỏ quota ra nhúng).

**Cào có đạo đức — bật sẵn theo mặc định:**

| Biến trong `.env` | Mặc định | Ý nghĩa |
|---|---|---|
| `CRAWLER_RESPECT_ROBOTS` | `true` | Đọc và **tuân thủ** `/robots.txt` của website |
| `CRAWLER_DELAY_MS` | `1500` | Nghỉ giữa hai request tới cùng một tên miền |
| `CRAWLER_MAX_PAGES` | `50` | Trần số trang, chống crawl vô tận |
| `CRAWLER_MAX_DEPTH` | `2` | Trần độ sâu tính từ URL gốc |

⚖️ Chỉ đặt `CRAWLER_RESPECT_ROBOTS=false` khi cào website **của chính bạn**.

**Tối ưu quan trọng nhất:** mỗi tài liệu được băm nội dung (`content_hash`). Crawl lại mà trang không đổi → **bỏ qua hoàn toàn**, không tốn một lượt gọi API nào.

### 🔍 Tìm kiếm AI trên PostgreSQL (hybrid search)

Tìm kiếm **lai** hai cách, trộn điểm 70/30:

- **Vector (70%)** — hiểu ý nghĩa: hỏi *"ai đá tiền đạo?"* vẫn tìm ra đoạn nói về tiền đạo dù trong bài không hề có chữ "ai đá"
- **Từ khoá (30%)** — khớp chính xác tên riêng và con số, kể cả khi gõ **không dấu**: `tien linh` vẫn ra `Tiến Linh`

```bash
curl "http://localhost:5000/api/v1/search?q=doi+tuyen+quoc+gia&limit=5&debug=true"
curl "http://localhost:5000/api/v1/search/stats"
```

Chạy được trên **cả hai** loại database:

| `DB_DRIVER` | Cách so sánh vector | Tốc độ |
|---|---|---|
| `pglite` (mặc định) | Tính cosine bằng JavaScript | Đủ nhanh tới vài nghìn đoạn |
| `postgres` | Toán tử `<=>` của pgvector + index HNSW | Rất nhanh, không giới hạn |

Không cần sửa một dòng code nào khi đổi — chỉ đổi `DB_DRIVER` rồi `npm run migrate`.

> 🛟 **Không có key Gemini thì sao?** Tìm kiếm tự lùi về chế độ khớp từ khoá thuần. Kém thông minh hơn, nhưng **không bao giờ chết hẳn**.

### 🌐 Bản web & SEO

Ngoài iOS/Android, dự án xuất được thành **website tĩnh** — đây chính là cửa ngõ
để người ta tìm thấy app qua Google.

```bash
cd mobile
npm run web            # chạy thử bản web trên máy
npx expo export --platform web   # xuất ra thư mục dist/
```

Đã làm sẵn đầy đủ:

| Hạng mục | Nơi cấu hình |
|---|---|
| `lang="vi"`, viewport, theme-color, JSON-LD (Schema.org) | `mobile/app/+html.tsx` |
| Title + description + Open Graph + canonical **riêng từng trang** | `mobile/src/components/common/Seo.tsx` |
| robots.txt · sitemap.xml · manifest.json (PWA) | `mobile/public/` |
| Trang 404 có nhận diện riêng, kèm `noindex` | `mobile/app/+not-found.tsx` |
| Render tĩnh từng đường dẫn (`web.output: "static"`) | `mobile/app.json` |

> ⚠️ **Trước khi triển khai thật, đổi tên miền ở 4 chỗ:**
> `mobile/app/+html.tsx` (`SITE_URL`) · `mobile/src/components/common/Seo.tsx` (`SITE_URL`) ·
> `mobile/public/robots.txt` (dòng `Sitemap:`) · `mobile/public/sitemap.xml` (mọi thẻ `<loc>`).

**Kiểm tra nhanh sau khi build** — mỗi trang phải có **đúng 1** thẻ mỗi loại:

```bash
grep -c '<title'            mobile/dist/index.html   # phải là 1
grep -c 'name="description"' mobile/dist/index.html  # phải là 1
grep -c 'rel="canonical"'   mobile/dist/index.html   # phải là 1
```

> 🐛 Hai thẻ `description` với nội dung khác nhau, hoặc hai `canonical` trỏ hai
> địa chỉ, sẽ khiến Google tự chọn bừa — bạn mất quyền quyết định trang mình
> hiện ra thế nào. Chi tiết: [docs/DESIGN-SYSTEM.md](./docs/DESIGN-SYSTEM.md#9-seo--mỗi-màn-hình-một-thẻ-seo).

### Thông báo bàn thắng khi app đã đóng

App hiện có **hai lớp thông báo**:

| Lớp | Hoạt động khi | Cần gì | Trạng thái |
|---|---|---|---|
| Trong app (local) | App đang mở hoặc vừa chuyển nền | Không cần gì | ✅ chạy ngay trên Expo Go |
| Đẩy từ xa (FCM) | App **đã đóng hẳn**, máy đang khoá | Firebase + development build | ⏳ cần cấu hình |

⚠️ **Quan trọng:** từ SDK 53, **Expo Go không nhận được thông báo đẩy từ xa nữa.** Muốn dùng lớp thứ hai, bạn phải tạo bản build riêng:

```bash
cd mobile
npx expo install expo-dev-client
npx eas login          # cần tài khoản Expo miễn phí
npx eas init           # sinh projectId, tự ghi vào app.json
npx eas build --profile development --platform android
```

Sau đó cấu hình Firebase ở backend:

1. Tạo dự án tại <https://console.firebase.google.com>
2. Vào **Project Settings → Service accounts → Generate new private key** (tải về file JSON)
3. Điền vào `.env` từ ba trường trong file JSON đó:

```env
FCM_ENABLED=true
FIREBASE_PROJECT_ID=ten-du-an
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@ten-du-an.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

⚠️ `FIREBASE_PRIVATE_KEY` **phải để trong dấu nháy kép và giữ nguyên các ký tự `\n`** — code sẽ tự chuyển thành xuống dòng thật. Đây là lỗi phổ biến nhất khi cấu hình Firebase.

Chưa cấu hình thì backend vẫn chạy bình thường, chỉ ghi log `[PUSH - chế độ mô phỏng]` thay vì gửi thật — bạn kiểm thử được toàn bộ luồng nghiệp vụ trước.

### Chuyển sang PostgreSQL thật

Khi triển khai lên máy chủ, đổi trong `.env` (production: bơm cùng tên biến từ Secret Manager thay vì dùng file):

```env
DB_DRIVER=postgres
DATABASE_URL=postgresql://user:pass@host:5432/vnfootball
DB_SSL=true
```

Rồi chạy `npm run migrate`. **Không cần sửa một dòng code nào** — toàn bộ SQL giữ nguyên.

Dịch vụ PostgreSQL miễn phí: [Neon](https://neon.tech), [Supabase](https://supabase.com).

---

## ✅ TRẠNG THÁI HOÀN THÀNH

| Phần | Trạng thái |
|---|---|
| Backend: nền tảng, log, xử lý lỗi | ✅ |
| Database: schema đầy đủ (migration `001`–`005`) + dữ liệu mẫu cho mọi tính năng | ✅ |
| Auth: bcrypt, JWT, xoay vòng refresh token | ✅ |
| API: trận đấu, đội hình, cầu thủ, HLV, BXH | ✅ |
| AI: Gemini + mô hình thống kê dự phòng | ✅ |
| Realtime: Socket.IO + polling dự phòng | ✅ |
| Cron job: 5 tác vụ định kỳ | ✅ khung sẵn sàng |
| Mobile: hệ thống thiết kế + **5 tab** + 2 màn chi tiết | ✅ |
| ⭐ Tab 1 Giới thiệu: hồ sơ đội, tủ danh hiệu, dòng thời gian thành tích | ✅ |
| ⭐ Engine chấm điểm cầu thủ 0–10, **giải thích được từng điểm** | ✅ 44 test |
| ⭐ Điểm + thẻ vàng/đỏ ngay trên đầu cầu thủ ở sơ đồ sân | ✅ |
| ⭐ Giao diện người lớn tuổi (Senior mode) | ✅ |
| Màn hình Cài đặt (mở từ ảnh đại diện góc phải) | ✅ |
| 4 slide giới thiệu khi mở app lần đầu | ✅ |
| Thanh chọn phân đoạn ở Tab Trận đấu & Tab Đội hình | ✅ |
| Mobile: đăng nhập / đăng ký | ✅ |
| Thông báo bàn thắng: backend + đăng ký thiết bị | ✅ |
| Thông báo trong app (local notification) | ✅ chạy được cả trên Expo Go |
| Crawler dữ liệu thật (api-football) | ⏳ cần API key |
| ⭐ Xoay vòng nhiều Gemini key chống hết quota | ✅ |
| ⭐ Crawler web có tuân thủ robots.txt + giãn nhịp | ✅ |
| ⭐ OCR ảnh/PDF bằng Gemini | ✅ |
| ⭐ Tìm kiếm AI lai (vector + từ khoá, có bỏ dấu) | ✅ |
| ⭐ Giao diện hỏi đáp kho tri thức trong tab Dự đoán | ✅ |
| ⭐ Giao diện 3 màu chủ đạo + hoạ tiết cờ/lúa/tre | ✅ |
| ⭐ SEO: meta, Open Graph, JSON-LD, sitemap, PWA | ✅ |
| Thông báo đẩy khi app đã đóng (FCM) | ⏳ cần Firebase + development build |

---

## 📊 KIỂM THỬ

```bash
# Terminal 1: chạy backend
cd backend && npm run dev

# Terminal 2: kiểm thử toàn bộ API (18 phép thử)
cd backend && npm test

# Kiểm thử WebSocket realtime
cd backend && node scripts/socket-test.mjs
```
