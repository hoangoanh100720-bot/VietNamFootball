# ⚽ Ứng dụng Đội tuyển Bóng đá Quốc gia Việt Nam

Ứng dụng di động fullstack: tỷ số trực tiếp, đội hình, hồ sơ cầu thủ và dự đoán kết quả bằng AI.

> 📐 Thiết kế kỹ thuật chi tiết: xem [ARCHITECTURE.md](./ARCHITECTURE.md)

---

## 🚀 CHẠY THỬ TRONG 5 PHÚT

Bạn cần: **Node.js 18 trở lên** (kiểm tra bằng `node -v`). Không cần cài PostgreSQL, Redis hay Docker.

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

Sau đó sửa file `mobile/.env`:

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
│   │   │   └── devices/     #   đăng ký thiết bị nhận thông báo
│   │   ├── middlewares/     # bảo mật, kiểm tra dữ liệu, xử lý lỗi
│   │   ├── services/        # gemini, socket, crawler
│   │   ├── jobs/            # cron job + vòng lặp tỷ số trực tiếp
│   │   ├── db/              # migration + dữ liệu mẫu
│   │   └── utils/           # logger, cache, khuôn mẫu phản hồi
│   ├── scripts/             # công cụ kiểm thử
│   └── data/                # database PGlite (KHÔNG commit lên Git)
│
└── mobile/                  # ===== ỨNG DỤNG (React Native + Expo) =====
    ├── app/                 # màn hình — tên file chính là đường dẫn
    │   ├── (auth)/          #   login.tsx, register.tsx
    │   ├── (tabs)/          #   4 tab chính
    │   ├── match/[id].tsx   #   chi tiết trận đấu
    │   └── player/[id].tsx  #   hồ sơ cầu thủ
    └── src/
        ├── theme/           # ⭐ màu sắc, cỡ chữ, khoảng cách (design tokens)
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
2. `EXPO_PUBLIC_API_URL` trong `mobile/.env` đã đúng IP máy tính chưa? (không phải `localhost`)
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

Hoặc đổi sang cổng khác trong `backend/.env`: `PORT=5001` (nhớ sửa cả `mobile/.env`).
</details>

<details>
<summary><b>Tỷ số trực tiếp không tự nhảy</b></summary>

1. Trong `backend/.env` phải có `LIVE_SIMULATION=true` và `LIVE_POLLING_ENABLED=true`
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
2. Điền vào `backend/.env`:
   ```env
   GEMINI_API_KEY=khoá_của_bạn
   ```
3. Khởi động lại backend

🔐 **Key này chỉ nằm ở backend, KHÔNG BAO GIỜ đưa vào app.** Mọi thứ nhúng trong app đều có thể bị đọc ra.

### Dữ liệu bóng đá thật

Hiện dữ liệu đến từ `npm run seed` (dữ liệu mẫu). Muốn lấy dữ liệu thật:

1. Đăng ký tại <https://www.api-football.com/> (có gói miễn phí)
2. Điền `FOOTBALL_API_KEY` vào `backend/.env`, đặt `CRON_ENABLED=true` và `LIVE_SIMULATION=false`
3. Hoàn thiện phần gọi API trong `backend/src/services/crawler.service.ts` (khung đã dựng sẵn kèm chú thích)

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
3. Điền vào `backend/.env` từ ba trường trong file JSON đó:

```env
FCM_ENABLED=true
FIREBASE_PROJECT_ID=ten-du-an
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxx@ten-du-an.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIE...\n-----END PRIVATE KEY-----\n"
```

⚠️ `FIREBASE_PRIVATE_KEY` **phải để trong dấu nháy kép và giữ nguyên các ký tự `\n`** — code sẽ tự chuyển thành xuống dòng thật. Đây là lỗi phổ biến nhất khi cấu hình Firebase.

Chưa cấu hình thì backend vẫn chạy bình thường, chỉ ghi log `[PUSH - chế độ mô phỏng]` thay vì gửi thật — bạn kiểm thử được toàn bộ luồng nghiệp vụ trước.

### Chuyển sang PostgreSQL thật

Khi triển khai lên máy chủ, đổi trong `backend/.env`:

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
| Database: 14 bảng + migration + dữ liệu mẫu | ✅ |
| Auth: bcrypt, JWT, xoay vòng refresh token | ✅ |
| API: trận đấu, đội hình, cầu thủ, HLV, BXH | ✅ |
| AI: Gemini + mô hình thống kê dự phòng | ✅ |
| Realtime: Socket.IO + polling dự phòng | ✅ |
| Cron job: 5 tác vụ định kỳ | ✅ khung sẵn sàng |
| Mobile: hệ thống thiết kế + 4 tab + 2 màn chi tiết | ✅ |
| Mobile: đăng nhập / đăng ký | ✅ |
| Thông báo bàn thắng: backend + đăng ký thiết bị | ✅ |
| Thông báo trong app (local notification) | ✅ chạy được cả trên Expo Go |
| Crawler dữ liệu thật | ⏳ cần API key |
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
