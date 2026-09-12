# KIẾN TRÚC HỆ THỐNG — ỨNG DỤNG ĐỘI TUYỂN BÓNG ĐÁ QUỐC GIA VIỆT NAM

> Tài liệu kiến trúc kỹ thuật (Technical Architecture Document)
> Phiên bản: 2.0 — Cập nhật: 11/09/2026
> Tên app hiển thị: **Bóng Đá Việt Nam** (`mobile/app.json` → `expo.name`)

**Thay đổi so với bản 1.0**

- Thêm màn hình mở đầu: Splash có tên app → Giới thiệu đội tuyển (onboarding).
- Thanh tab dưới 5 tab theo kiểu App Store: Trang chủ · Trận đấu · Đội hình · Cầu thủ · Cài đặt.
- Thêm tab **Giới thiệu & Thành tích**, màn **Thông số sau trận**, tab **Cài đặt**.
- **Điểm cầu thủ + thẻ vàng/đỏ hiển thị ngay trên đầu cầu thủ** trong sơ đồ đội hình sau khi trận kết thúc.
- **Hệ thống Theme**: theme theo sự kiện (Tết, 30/4, 2/9, giải đấu…) + theme phản ứng theo kết quả trận ("Đi bão" khi thắng, "Tiếp lửa" khi thua).
- **Giao diện cho người lớn tuổi** (Senior mode).
- Chính sách cập nhật dữ liệu **1 phút/lần** cho trận đấu & đội hình trong khung giờ thi đấu.
- Hồ sơ người dùng: chỉnh sửa, đổi ảnh đại diện, đổi mật khẩu, quên mật khẩu, xoá tài khoản.
- Migration `002_features.sql`: 9 bảng mới + 1 view + mở rộng 4 bảng cũ.
- Dự đoán AI chuyển từ tab riêng vào màn Chi tiết trận (giữ nguyên backend).

---

## 1. TỔNG QUAN

Ứng dụng di động cung cấp thông tin chi tiết, tỷ số trực tiếp, thông số sau trận và nhận định thông minh về Đội tuyển Bóng đá Quốc gia Việt Nam. Toàn bộ dữ liệu được lưu trong hệ quản trị cơ sở dữ liệu **PostgreSQL**; Google Gemini API dùng để phân tích và dự đoán tỷ lệ Thắng / Hòa / Thua.

| Thành phần | Công nghệ |
|---|---|
| Mobile (Frontend) | React Native + Expo SDK (TypeScript), Expo Router |
| Backend API | Node.js + Express (TypeScript) |
| Database (DBMS) | **PostgreSQL** — nguồn dữ liệu duy nhất (single source of truth) |
| Cache | Redis (tỷ số live, theme đang áp dụng, kết quả AI, rate-limit) |
| Realtime | WebSocket (Socket.IO) + polling REST dự phòng |
| Job định kỳ | node-cron (múi giờ `Asia/Ho_Chi_Minh`) |
| Push notification | Firebase Cloud Messaging qua `expo-notifications` |
| Lưu file (ảnh đại diện) | Object storage: Supabase Storage / Cloudinary / S3 |
| AI Engine | Google Gemini API (`gemini-2.5-flash` / `gemini-2.5-pro`) |

---

## 2. PHẠM VI TÍNH NĂNG

### 2.1. Bảng tổng hợp màn hình

| # | Màn hình / Tính năng | Vị trí trong app | API chính | Bảng DB | Trạng thái |
|---|---|---|---|---|---|
| 1 | Splash (tên app) | Khi mở app | `GET /app/bootstrap` | `themes`, `theme_schedules` | 🆕 Mới |
| 2 | Giới thiệu chung đội tuyển (onboarding) | Sau splash, lần đầu mở app | `GET /onboarding/slides` | `onboarding_slides` | 🆕 Mới |
| 3 | Đăng nhập / Đăng ký | `(auth)/` | `/auth/*` | `users`, `refresh_tokens` | ✅ Đã có |
| 4 | Quên mật khẩu | `(auth)/forgot-password` | `/auth/forgot-password`, `/auth/reset-password` | `password_reset_codes` | 🆕 Mới |
| 5 | Tab **Trang chủ** — giới thiệu, thành tích, BXH FIFA | Tab 1 | `/team/profile`, `/team/achievements`, `/ranking/fifa` | `team_profiles`, `achievements`, `fifa_rankings` | 🆕 Mới |
| 6 | Tab **Trận đấu** — đang diễn ra / sắp diễn ra / kết quả | Tab 2 | `/matches/live`, `/matches/upcoming`, `/matches/results` | `matches` | ✅ Mở rộng |
| 7 | Thông tin trong trận (diễn biến, tỷ số live) | Chi tiết trận → "Diễn biến" | `/matches/:id/live` + socket | `match_events` | ✅ Đã có |
| 8 | **Thông số sau trận** | Chi tiết trận → "Thống kê" | `/matches/:id/stats` | `match_stats` | 🆕 Mới |
| 9 | Tab **Đội hình** — sơ đồ ra sân | Tab 3 | `/squad/current` | `lineups`, `lineup_players` | ✅ Đã có |
| 10 | ⭐ **Điểm cầu thủ + thẻ vàng/đỏ trên đầu cầu thủ** | Tab 3 (chế độ "Trận vừa đá") + Chi tiết trận | `/squad/last-match`, `/matches/:id/lineups` | `player_match_stats`, `match_events` | 🆕 Mới |
| 11 | Tab **Cầu thủ** — danh sách + hồ sơ, giá trị | Tab 4 → `player/[id]` | `/players`, `/players/:id` | `players`, `player_clubs` | ✅ Mở rộng |
| 12 | Tab **Cài đặt** | Tab 5 | `/users/me/settings` | `user_settings` | 🆕 Mới |
| 13 | Cài đặt → Thông tin (chỉnh sửa hồ sơ) | `settings/profile` | `PATCH /users/me`, `POST /users/me/avatar` | `users` | 🆕 Mới |
| 14 | ⭐ Cài đặt → Giao diện theo sự kiện (Themes) | `settings/themes` | `/themes`, `/themes/active` | `themes`, `theme_schedules` | 🆕 Mới |
| 15 | ⭐ Cài đặt → Giao diện người lớn tuổi | `settings/display` | `PUT /users/me/settings` | `user_settings` | 🆕 Mới |
| 16 | Dự đoán AI Thắng/Hòa/Thua | Chi tiết trận → "Dự đoán" | `/ai/predict/:matchId` | `ai_predictions` | ✅ Di chuyển |
| 17 | Thông báo đẩy (bàn thắng, đội hình, điểm cầu thủ) | Toàn app | `/devices/token` | `device_tokens`, `user_settings` | ✅ Mở rộng |
| 18 | Trang quản trị nội dung (admin) | Web nội bộ / Postman | `/admin/*` | Toàn bộ bảng nội dung | 🆕 Mới |

### 2.2. Tần suất cập nhật dữ liệu (theo yêu cầu)

| Dữ liệu | Yêu cầu | Cách hiện thực | Chi tiết |
|---|---|---|---|
| Trận đấu | 1 phút/lần | **1 phút/lần** trong khung ngày thi đấu; **12 giây/lần** khi trận đang live (nhanh hơn yêu cầu) | Mục 12.2 |
| Đội hình | 1 phút/lần | **1 phút/lần** từ 90 phút trước giờ bóng lăn tới khi trận kết thúc; ngoài khung 1 lần/ngày | Mục 12.2 |
| Thông tin cầu thủ (giá trị, CLB, chỉ số) | Định kỳ | 1 lần/ngày lúc 01:10 (giá trị chuyển nhượng chỉ đổi vài lần/năm) | Mục 12.1 |
| Điểm cầu thủ & thông số sau trận | Ngay sau trận | Tính ngay khi hết trận (bản tạm), chốt lại sau 15 phút và 60 phút | Mục 12.3 |

> **Vì sao không chạy 1 phút/lần suốt 24 giờ?** Gọi API bóng đá 1.440 lần/ngày cho mỗi loại dữ liệu sẽ vượt hạn mức của gói miễn phí (thường khoảng 100 request/ngày) trong khi 95% thời gian không có gì thay đổi. Job 1 phút vẫn chạy mỗi phút, nhưng **chỉ gọi API ngoài khi đang trong khung giờ thi đấu** — ngoài khung, nó chỉ tốn một câu truy vấn DB rất nhẹ rồi thoát.

---

## 3. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ

```
┌──────────────────────────────────────────────────────────────────────┐
│                     MOBILE APP — "Bóng Đá Việt Nam"                  │
│  Splash ─► Giới thiệu đội tuyển ─► (Đăng nhập | Khách) ─► 5 Tab      │
│  ┌──────────┬──────────┬──────────┬──────────┬──────────┐            │
│  │Trang chủ │ Trận đấu │ Đội hình │ Cầu thủ  │ Cài đặt  │  ◄ tab dưới│
│  └──────────┴──────────┴──────────┴──────────┴──────────┘            │
│  ThemeProvider (màu sáng/tối + theme sự kiện + Senior mode)          │
│  expo-secure-store (JWT) · React Query · Zustand · Socket.IO client  │
└───────────────┬──────────────────────────────┬───────────────────────┘
                │ HTTPS (REST /api/v1)         │ WSS (socket)
┌───────────────▼──────────────────────────────▼───────────────────────┐
│                     BACKEND — Node.js + Express                      │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────┐ │
│ │ Auth     │ │ Users &  │ │ Team &   │ │ Matches  │ │ Squad /      │ │
│ │ JWT,reset│ │ Settings │ │ Achieve. │ │ Stats,   │ │ Players      │ │
│ └──────────┘ └──────────┘ └──────────┘ │ Ratings  │ └──────────────┘ │
│ ┌──────────┐ ┌──────────┐ ┌──────────┐ └──────────┘ ┌──────────────┐ │
│ │ Themes   │ │ AI       │ │ Admin    │              │ Cron + Live  │ │
│ │ resolver │ │ Gemini   │ │ CMS      │              │ Poll (1m/12s)│ │
│ └──────────┘ └──────────┘ └──────────┘              └──────────────┘ │
│ Middleware: helmet · cors · rate-limit · validate(zod) · requireRole │
└──────┬──────────────────┬──────────────────┬─────────────────────────┘
       │                  │                  │
┌──────▼──────┐   ┌───────▼──────┐   ┌───────▼──────────────────────┐
│ PostgreSQL  │   │    Redis     │   │ Dịch vụ ngoài                │
│ (DBMS chính)│   │ cache + RL   │   │ • Football Data API          │
└─────────────┘   └──────────────┘   │ • Google Gemini              │
                                     │ • Firebase Cloud Messaging   │
┌─────────────┐                      │ • Object storage (avatar)    │
│ Object      │◄── ảnh đại diện ─────│ • Dịch vụ gửi email (OTP)    │
│ storage     │                      └──────────────────────────────┘
└─────────────┘
```

---

## 4. KIẾN TRÚC FRONTEND (React Native / Expo)

### 4.1. Luồng mở app: Splash → Giới thiệu đội tuyển → Vào app

```
 Người dùng chạm icon
        │
        ▼
┌──────────────────────┐  (1) SPLASH GỐC — expo-splash-screen
│   [logo]             │      Ảnh tĩnh, nền #0B1220, hiện trong lúc JS đang tải.
└──────────┬───────────┘      Giữ lại bằng SplashScreen.preventAutoHideAsync()
           ▼
┌──────────────────────┐  (2) BRAND SPLASH — component <BrandSplash />
│      ★ (sao vàng)    │      • Tên app "BÓNG ĐÁ VIỆT NAM" + khẩu hiệu
│  BÓNG ĐÁ VIỆT NAM    │        "Tự hào Sao Vàng"
│  Tự hào Sao Vàng     │      • Hoạt ảnh: ngôi sao phóng to + chữ hiện dần (opacity/transform)
│  ▂▂▂▂ (thanh tải)    │      • Song song chạy bootstrap (bên dưới)
└──────────┬───────────┘      • Tối thiểu 1,2 giây, tối đa 2,5 giây rồi đi tiếp dù chưa xong
           │
           │   Chạy song song khi splash hiển thị:
           │     a. authStore.bootstrap()  — khôi phục phiên từ secure-store
           │     b. GET /app/bootstrap     — theme đang áp dụng, trận live, phiên bản
           │     c. settingsStore.hydrate()— chế độ hiển thị, theme người dùng chọn
           ▼
   Đã xem giới thiệu phiên bản hiện tại?  (AsyncStorage: onboarding_seen_version)
        │ chưa                                    │ rồi
        ▼                                         │
┌──────────────────────┐  (3) GIỚI THIỆU CHUNG    │
│ Slide 1: Đội tuyển   │      VỀ ĐỘI TUYỂN        │
│ Slide 2: Thành tích  │      (app/onboarding.tsx)│
│ Slide 3: HLV & ĐH    │                          │
│ Slide 4: Bắt đầu     │                          │
│  • • • ○   [Bỏ qua]  │                          │
└──────────┬───────────┘                          │
           ▼                                      ▼
   Có phiên đăng nhập?  ──── có ────►  (tabs) — Tab Trang chủ
        │ không
        ▼
   (auth)/login   ── nút "Xem không cần đăng nhập" ──►  (tabs) chế độ khách
```

**Nội dung 4 slide giới thiệu** (lấy từ `GET /onboarding/slides`, có bản dự phòng đóng gói sẵn trong app để dùng khi mất mạng):

| Slide | Tiêu đề | Nội dung | Hình |
|---|---|---|---|
| 1 | Những chiến binh Sao Vàng | Biệt danh, liên đoàn quản lý (VFF), sân nhà Mỹ Đình, liên đoàn châu lục (AFC/AFF) | Ảnh toàn đội |
| 2 | Hành trình vinh quang | 3 lần vô địch Đông Nam Á (2008, 2018, 2024), 2 lần vào tứ kết Asian Cup (2007, 2019) | Cúp + dòng thời gian |
| 3 | Ban huấn luyện & đội hình | HLV trưởng, số cầu thủ, tổng giá trị đội hình | Ảnh HLV |
| 4 | Sẵn sàng cổ vũ! | Nút **Bắt đầu**, kèm lựa chọn nhanh **"Dùng chữ to, dễ đọc"** (bật Senior mode ngay) | Cờ đỏ sao vàng |

Quy tắc:

- Có nút **Bỏ qua** ở mọi slide; vuốt ngang **và** nút "Tiếp" (không bắt người dùng chỉ vuốt).
- Khi admin đổi nội dung, backend tăng `version` → app hiện lại giới thiệu một lần.
- Tôn trọng "Giảm chuyển động" của hệ điều hành (`AccessibilityInfo.isReduceMotionEnabled`): tắt hoạt ảnh splash, chuyển slide không trượt.
- Xem lại được bất cứ lúc nào: Cài đặt → "Giới thiệu đội tuyển".

### 4.2. Thanh tab dưới kiểu App Store

```
┌──────────────────────────────────────────────────────────────────┐
│                          (nội dung tab)                          │
├────────────┬────────────┬────────────┬────────────┬──────────────┤
│    🛡️      │   ⚽ •     │    ▦       │    👥      │     ⚙️       │
│ Trang chủ  │ Trận đấu   │ Đội hình   │ Cầu thủ    │  Cài đặt     │
└────────────┴────────────┴────────────┴────────────┴──────────────┘
   đang chọn: icon tô đặc + màu nhấn + chữ đậm      • = chấm đỏ khi có trận LIVE
```

| Tab | Route | Icon (Ionicons, chọn / thường) | Nội dung |
|---|---|---|---|
| 1. Trang chủ | `(tabs)/index` | `shield` / `shield-outline` | Giới thiệu, thành tích, BXH FIFA, trận tiếp theo |
| 2. Trận đấu | `(tabs)/matches` | `football` / `football-outline` | Đang diễn ra · Sắp diễn ra · Kết quả |
| 3. Đội hình | `(tabs)/squad` | `grid` / `grid-outline` | Sơ đồ ra sân, điểm cầu thủ sau trận |
| 4. Cầu thủ | `(tabs)/players` | `people` / `people-outline` | Danh sách, tìm kiếm, lọc theo vị trí |
| 5. Cài đặt | `(tabs)/settings` | `settings` / `settings-outline` | Hồ sơ, theme, hiển thị, thông báo |

Đặc điểm "giống App Store":

1. **Icon + nhãn chữ bên dưới**, 5 tab chia đều chiều ngang, vùng chạm cả ô tab (≥ 44×44 pt; Senior mode ≥ 56 pt).
2. **Nền mờ trong suốt** (iOS: `expo-blur` `BlurView` làm `tabBarBackground`; Android: nền `surface` đặc + viền trên 1px).
3. **Tiêu đề lớn** ở đầu mỗi tab (Large Title 28–34pt), thu nhỏ khi cuộn — giống "Today / Apps" của App Store.
4. **Chạm lại tab đang mở → cuộn lên đầu** (`useScrollToTop` của React Navigation).
5. **Rung nhẹ khi chuyển tab** (`expo-haptics` `selectionAsync`).
6. **Chấm đỏ trên tab Trận đấu** khi có trận đang live (`tabBarBadge` rỗng + `tabBarBadgeStyle`).
7. Thanh tab luôn hiển thị, **không ẩn khi cuộn** — người lớn tuổi không phải "tìm lại" thanh điều hướng.
8. ⚠️ **Không ghi đè `height`/`paddingBottom` của `tabBarStyle`** (bài học ở `mobile/app/(tabs)/_layout.tsx`): muốn tab to hơn thì tăng `tabBarIconStyle.height` + `tabBarLabelStyle.fontSize/lineHeight`, để thư viện tự tính chiều cao.

Senior mode dùng bố cục tab riêng (mục 7.3): **3 tab to** — Trận đấu · Đội hình · Cài đặt; các tab còn lại ẩn bằng `href: null`.

### 4.3. Cấu trúc thư mục

```
mobile/
├── app/                              # Expo Router (định tuyến theo file)
│   ├── _layout.tsx                   # Providers + <BrandSplash/> + điều hướng lần đầu
│   ├── onboarding.tsx                # 🆕 Giới thiệu chung về đội tuyển
│   ├── (auth)/
│   │   ├── _layout.tsx
│   │   ├── login.tsx
│   │   ├── register.tsx
│   │   └── forgot-password.tsx       # 🆕 Nhập email → nhập mã OTP → mật khẩu mới
│   ├── (tabs)/
│   │   ├── _layout.tsx               # 🔄 5 tab kiểu App Store (3 tab khi Senior mode)
│   │   ├── index.tsx                 # 🆕 Tab 1 — Trang chủ: Giới thiệu & Thành tích
│   │   ├── matches.tsx               # 🔄 Tab 2 — Trận đấu (chuyển từ index.tsx cũ)
│   │   ├── squad.tsx                 # 🔄 Tab 3 — Đội hình + điểm cầu thủ sau trận
│   │   ├── players.tsx               # Tab 4 — Cầu thủ
│   │   └── settings.tsx              # 🆕 Tab 5 — Cài đặt
│   ├── match/[id].tsx                # 🔄 Chi tiết trận: 5 tab con (mục 5.2)
│   ├── player/[id].tsx               # Hồ sơ cầu thủ
│   ├── achievements.tsx              # 🆕 Toàn bộ dòng thời gian thành tích
│   └── settings/
│       ├── profile.tsx               # 🆕 Chỉnh sửa hồ sơ
│       ├── password.tsx              # 🆕 Đổi mật khẩu
│       ├── themes.tsx                # 🆕 Chọn theme theo sự kiện
│       ├── display.tsx               # 🆕 Sáng/Tối + Giao diện người lớn tuổi
│       ├── notifications.tsx         # 🆕 Bật/tắt từng loại thông báo
│       └── delete-account.tsx        # 🆕 Xoá tài khoản (yêu cầu của App Store/Google Play)
│   # ❌ (tabs)/ai.tsx bị bỏ: dự đoán AI chuyển vào match/[id], BXH FIFA chuyển vào Trang chủ
├── src/
│   ├── api/                          # axios instance + endpoints (thêm team, themes, users)
│   ├── components/
│   │   ├── common/                   # AppText, Button, Card, States, Screen, LargeTitleHeader 🆕
│   │   ├── brand/                    # 🆕 BrandSplash, OnboardingSlide, PageDots
│   │   ├── home/                     # 🆕 TeamHero, TrophyCabinet, AchievementTimeline, NextMatchCard
│   │   ├── match/                    # LiveScoreCard, FixtureItem, EventTimeline 🆕, StatCompareBar 🆕
│   │   ├── squad/                    # FormationPitch 🔄, RatingBadge 🆕, CardBadge 🆕, BenchList
│   │   ├── ai/                       # PredictionDonut, FifaRankTable
│   │   ├── settings/                 # 🆕 SettingsRow, ThemeCard, AvatarPicker, DisplayModeSwitch
│   │   └── effects/                  # 🆕 Fireworks, FallingBlossoms, Confetti (theme sự kiện)
│   ├── hooks/
│   │   ├── useLiveScore.ts           # WebSocket + polling dự phòng
│   │   ├── useMatchdayRefetch.ts     # 🆕 Bật refetch 60s trong khung ngày thi đấu
│   │   ├── useActiveTheme.ts         # 🆕 Lấy theme từ server + lắng nghe theme:changed
│   │   └── useSpeakScore.ts          # 🆕 Đọc to tỷ số (expo-speech, vi-VN)
│   ├── store/
│   │   ├── authStore.ts
│   │   └── settingsStore.ts          # 🆕 Zustand + persist: theme, colorScheme, displayMode
│   ├── theme/
│   │   ├── colors.ts                 # 🔄 Thêm token rating*/card*
│   │   ├── tokens.ts                 # 🔄 Thêm bảng tỷ lệ Senior mode
│   │   ├── themes.ts                 # 🆕 Gộp palette gốc + ghi đè của theme sự kiện
│   │   └── index.tsx                 # 🔄 ThemeProvider nhận colorScheme + eventTheme + displayMode
│   └── ...
└── assets/
    ├── splash-icon.png
    └── onboarding/                   # 🆕 Ảnh dự phòng cho 4 slide giới thiệu
```

### 4.4. Chiến lược dữ liệu phía client

| Loại dữ liệu | Cơ chế | Làm mới |
|---|---|---|
| Tỷ số live, sự kiện trận | WebSocket `score:update`, `match:event`; mất socket > 20 giây → polling `/matches/:id/live` mỗi 15 giây | Realtime |
| Danh sách trận (live/sắp tới) | React Query; **`refetchInterval: 60_000` trong khung ngày thi đấu** (`useMatchdayRefetch`), ngoài khung `staleTime` 5 phút | **1 phút** / 5 phút |
| Đội hình | React Query; **`refetchInterval: 60_000` từ T−90′ tới khi hết trận** + socket `lineup:announced` | **1 phút** / 24 giờ |
| Điểm cầu thủ & thông số sau trận | React Query + socket `match:ratings`, `match:stats` | Khi server phát sự kiện |
| Cầu thủ, thành tích, giới thiệu | React Query + persist AsyncStorage | 24 giờ |
| Theme đang áp dụng | `GET /themes/active` lúc mở app + socket `theme:changed` | Khi đổi |
| Cài đặt người dùng | Zustand persist (máy) + đồng bộ `PUT /users/me/settings` khi đã đăng nhập | Khi đổi |
| Dự đoán AI | React Query | Tới giờ bóng lăn |

> `refetchInterval` tự dừng khi app chạy nền (`refetchIntervalInBackground: false`) → không tốn pin và dữ liệu di động.

---

## 5. ĐẶC TẢ MÀN HÌNH

### 5.1. Tab 1 — Trang chủ: Giới thiệu & Thành tích

```
┌───────────────────────────────────┐
│ Trang chủ                  (large)│
│ ┌───────────────────────────────┐ │  TeamHero: logo, biệt danh,
│ │ [logo] ĐT Việt Nam            │ │  hạng FIFA + mũi tên tăng/giảm
│ │ Những chiến binh Sao Vàng     │ │
│ │ FIFA #xx ▲2   AFC · AFF       │ │
│ └───────────────────────────────┘ │
│ ┌ TRẬN TIẾP THEO ───────────────┐ │  NextMatchCard: đếm ngược,
│ │ VIE vs THA · 19:30 T7 · Mỹ Đình│ │  kênh phát sóng, chạm → chi tiết
│ │ ⏱ 2 ngày 04:12  📺 VTV5       │ │  (đang live → hiện tỷ số đỏ)
│ └───────────────────────────────┘ │
│ GIỚI THIỆU                  Xem thêm│  intro_text 3 dòng, mở rộng được
│ TỦ DANH HIỆU                       │  TrophyCabinet: 🏆×3 Vô địch ĐNA
│ [🏆 3] [🥈 x] [⭐ Tứ kết Asian Cup] │  🥈 Á quân · ⭐ thành tích châu lục
│ DÒNG THỜI GIAN            Tất cả › │  AchievementTimeline (5 mục mới nhất)
│ ● 2024  Vô địch ASEAN Cup          │  → app/achievements.tsx
│ ● 2019  Tứ kết Asian Cup           │
│ ● 2018  Vô địch AFF Cup            │
│ BẢNG XẾP HẠNG FIFA        Tất cả › │  FifaRankTable (chuyển từ tab AI cũ)
│ BAN HUẤN LUYỆN                     │  Thẻ HLV trưởng → coaches
└───────────────────────────────────┘
```

Lọc thành tích theo loại: `champion` · `runner_up` · `third_place` · `semi_final` · `quarter_final` · `group_stage` · `qualified`.

### 5.2. Tab 2 — Trận đấu và màn Chi tiết trận

**Tab Trận đấu** có thanh chọn phân đoạn (segmented control) ở đầu:

| Phân đoạn | Nguồn | Hiển thị |
|---|---|---|
| **Đang diễn ra** | `GET /matches/live` + socket | `LiveScoreCard` nền gradient đỏ, phút thi đấu nhấp nháy, sự kiện mới nhất |
| **Sắp diễn ra** | `GET /matches/upcoming` | `FixtureItem`: giờ (giờ VN), sân, giải, kênh phát sóng, đếm ngược khi < 24 giờ |
| **Kết quả** | `GET /matches/results` | Tỷ số, nhãn T/H/B (chữ + màu), chạm → Chi tiết trận ở tab "Thống kê" |

Không có trận live → phân đoạn "Đang diễn ra" tự ẩn và mở mặc định "Sắp diễn ra".

**Màn `match/[id]`** — phần đầu là bảng tỷ số, bên dưới là 5 tab con cuộn ngang:

```
┌───────────────────────────────────┐
│  VIE  2 – 1  THA     Hết giờ      │
│  Tiến Linh 23' 67'   Supachok 55' │
├─────┬────────┬───────────┬────┬───┤
│Diễn │Thống kê│Đội hình & │Đối │Dự │
│biến │        │   điểm    │đầu │đoán│
└─────┴────────┴───────────┴────┴───┘
```

| Tab con | API | Nội dung |
|---|---|---|
| **Diễn biến** | `/matches/:id/live` + socket | `EventTimeline`: ⚽ bàn thắng (kèm kiến tạo), 🟨 🟥 thẻ, 🔁 thay người, VAR — theo phút |
| **Thống kê** (thông số sau trận) | `/matches/:id/stats` | `StatCompareBar` hai phía: kiểm soát bóng %, dứt điểm, trúng đích, xG, phạt góc, việt vị, phạm lỗi, thẻ vàng, thẻ đỏ, cứu thua, số đường chuyền, chuyền chính xác % |
| **Đội hình & điểm** | `/matches/:id/lineups` | Sơ đồ 2 đội với điểm + thẻ trên đầu (mục 5.3) |
| **Đối đầu** | `/matches/:id/h2h` | Tổng T/H/B + 10 trận gần nhất |
| **Dự đoán** | `/ai/predict/:matchId` | `PredictionDonut` + nhận định; chỉ hiện với trận chưa đá |

Mặc định mở: trận live → "Diễn biến"; trận đã kết thúc → "Thống kê"; trận sắp đá → "Dự đoán".

### 5.3. ⭐ Tab 3 — Đội hình: điểm cầu thủ + thẻ vàng/đỏ ngay trên đầu

Thanh chọn phân đoạn ở đầu tab:

- **Đội hình dự kiến** — `GET /squad/current` (như hiện tại).
- **Trận vừa đá: VIE 2–1 THA** — `GET /squad/last-match`. Phân đoạn này **tự được chọn trong 48 giờ sau khi trận kết thúc**, và có chấm đỏ "Mới".

```
                 ┌─────┐
                 │ 8.4★│  ◄ RatingBadge: điểm 1 chữ số thập phân,
                 └─────┘     ★ = cầu thủ xuất sắc nhất trận (MOTM)
                  ⚽⚽        ◄ số bàn thắng (tối đa hiện 3, sau đó "⚽×4")
                 ╭───╮ ▮     ◄ CardBadge: 🟨 thẻ vàng / 🟥 thẻ đỏ / 🟨🟥 2 thẻ vàng
                 │ 9 │ C     ◄ áo số (màu theo tuyến) + băng đội trưởng
                 ╰───╯ ↓67'  ◄ bị thay ra phút 67
               Tiến Linh     ◄ tên rút gọn
```

**Quy tắc hiển thị**

| Thành phần | Quy tắc |
|---|---|
| Vị trí RatingBadge | Ghim **phía trên đầu** áo số, căn giữa theo trục x; `top = -(chiều cao badge + 4)` |
| Kích thước | Standard: badge 32×18, chữ 11pt đậm, `tabular-nums`. Senior: 44×24, chữ 15pt |
| Màu theo thang điểm (luôn kèm con số, không truyền tin chỉ bằng màu) | ≥ 8.0 `ratingExcellent` · 7.0–7.9 `ratingGood` · 6.0–6.9 `ratingAverage` · < 6.0 `ratingPoor` |
| MOTM | Badge nền `gold`, thêm ★, cỡ lớn hơn 1 bậc |
| Chưa đủ 10 phút thi đấu | Hiện "–" thay vì điểm (quá ít dữ liệu để chấm) |
| Thẻ vàng | Hình chữ nhật đứng 8×11 màu `cardYellow`, góc trên-phải của áo |
| Thẻ đỏ trực tiếp | Hình chữ nhật `cardRed`; áo số mờ 50% (cầu thủ đã rời sân) |
| 2 thẻ vàng → đỏ | Hai thẻ chồng lệch nhau: vàng phía sau, đỏ phía trước |
| Thay người | Cầu thủ bị thay ra: mũi tên ↓ + phút. Cầu thủ vào sân hiện ở `BenchList` bên dưới sơ đồ, **cũng có điểm và thẻ** |
| Chạm vào cầu thủ | Bottom sheet: điểm, số phút, bàn, kiến tạo, dứt điểm, chuyền chính xác, tắc bóng, thẻ kèm phút → nút "Xem hồ sơ" |
| Trạng thái điểm | `ratings_status = provisional` → dòng chú thích "Điểm tạm tính — chốt sau 60 phút"; `final` → ẩn chú thích |
| Nguồn điểm | `rating_source = computed` → chú thích nhỏ "Điểm do hệ thống tính" (mục 9.4) |

**Hoạt ảnh khi điểm vừa về** (socket `match:ratings`): các badge lần lượt hiện từ thủ môn lên tiền đạo, mỗi badge trễ 40ms, phóng 0.6 → 1.0 (chỉ dùng transform + opacity). Bỏ hoạt ảnh khi bật "Giảm chuyển động".

**Thông báo đẩy**: "⭐ Điểm cầu thủ trận VIE 2–1 THA đã có — Tiến Linh 8.4 xuất sắc nhất trận" → mở thẳng Tab Đội hình ở phân đoạn "Trận vừa đá".

### 5.4. Tab 4 — Cầu thủ

- Danh sách: tìm theo tên (debounce 300ms), lọc GK/DF/MF/FW, sắp xếp theo giá trị · số trận · bàn thắng.
- Mỗi hàng: ảnh, tên, số áo, vị trí, CLB, **giá trị chuyển nhượng** (€), **điểm trung bình 5 trận ĐTQG gần nhất**.
- Hồ sơ `player/[id]`: quê quán, tuổi, chiều cao, cân nặng, chân thuận, CLB hiện tại, giá trị, số trận/bàn cho ĐTQG, lịch sử CLB, **biểu đồ điểm 10 trận gần nhất** (`GET /players/:id/ratings`), **thống kê thẻ phạt** (cảnh báo nguy cơ treo giò khi đã có 1 thẻ vàng trong giải).

### 5.5. Tab 5 — Cài đặt

```
┌───────────────────────────────────┐
│ Cài đặt                           │
│ ┌───────────────────────────────┐ │
│ │ [avatar] Nguyễn Văn A       › │ │  → settings/profile (khách: nút Đăng nhập)
│ │ a@gmail.com                   │ │
│ └───────────────────────────────┘ │
│ TÀI KHOẢN                         │
│  Thông tin cá nhân              › │  → settings/profile
│  Đổi mật khẩu                   › │  → settings/password
│ GIAO DIỆN                         │
│  Theme theo sự kiện   Tự động   › │  → settings/themes
│  Sáng / Tối           Hệ thống  › │  → settings/display
│  Giao diện người lớn tuổi   [ ○ ] │  bật/tắt ngay tại chỗ
│ THÔNG BÁO                       › │  → settings/notifications
│ KHÁC                              │
│  Giới thiệu đội tuyển           › │  → onboarding (xem lại)
│  Điều khoản · Quyền riêng tư    › │
│  Đăng xuất                        │
│  Xoá tài khoản                  › │  chữ đỏ, → settings/delete-account
│ Phiên bản 2.0.0                   │
└───────────────────────────────────┘
```

**Chỉnh sửa hồ sơ** (`settings/profile`)

| Trường | Ràng buộc | Ghi chú |
|---|---|---|
| Ảnh đại diện | JPG/PNG/WebP, ≤ 5MB trước khi nén | `expo-image-picker` → cắt vuông → nén 512×512 WebP ở client → `POST /users/me/avatar` |
| Họ tên | 2–120 ký tự | Bắt buộc |
| Tên hiển thị | 2–40 ký tự | Tuỳ chọn |
| Ngày sinh | Tuổi 6–120 | Tuỳ chọn |
| Tỉnh/thành | Chọn từ danh sách 34 tỉnh thành | Tuỳ chọn |
| Cầu thủ yêu thích | Chọn từ danh sách cầu thủ | Tuỳ chọn |
| Email | Chỉ đọc | Đổi email để giai đoạn sau |

Nút "Lưu" chỉ sáng khi có thay đổi; rời màn khi chưa lưu → hộp thoại xác nhận.

**Thông báo** (`settings/notifications`): bàn thắng · bắt đầu trận / nhắc trước 1 giờ · công bố đội hình · điểm cầu thủ sau trận · kết quả chung cuộc · theme sự kiện mới.

**Xoá tài khoản**: nhập lại mật khẩu → xác nhận 2 bước → xoá vĩnh viễn (CASCADE: token, thiết bị, cài đặt, ảnh đại diện).

---

## 6. ⭐ HỆ THỐNG THEME (GIAO DIỆN THEO SỰ KIỆN)

### 6.1. Bốn lớp chồng lên nhau

```
  Lớp 4  Senior mode        → phóng cỡ chữ, khoảng cách, vùng chạm   (độc lập với màu)
  Lớp 3  Theme phản ứng     → "Đi bão" (thắng) / "Tiếp lửa" (thua)   ưu tiên 80–100
  Lớp 2  Theme sự kiện      → Tết, 30/4, 2/9, ASEAN Cup, SEA Games    ưu tiên 50
  Lớp 1  Bảng màu gốc       → darkColors / lightColors (colors.ts)    ưu tiên 0
         └─ chọn theo Sáng / Tối / Theo hệ thống
```

**Theme chỉ được ghi đè một nhóm token nhất định** (danh sách trắng):

| Được ghi đè | Không bao giờ ghi đè |
|---|---|
| `accent`, `accentText`, `accentSoft`, `accentFg`, `gold`, `goldSoft`, `pitch`, `pitchStripe`, `staticColors.liveGradient`, `staticColors.heroGradient` + tài nguyên (banner, hiệu ứng, lời chào, ảnh splash) | `bg`, `surface*`, `text*`, `border*`, `win/draw/lose`, `rating*`, `card*` |

→ Dù admin chọn màu kiểu gì, **chữ vẫn luôn đọc được** và ý nghĩa Thắng/Hòa/Thua, thẻ vàng/đỏ không bị đổi.

### 6.2. Danh mục theme

| Mã (`code`) | Tên | Loại (`kind`) | Khi nào | Màu nhấn | Hiệu ứng / tài nguyên |
|---|---|---|---|---|---|
| `default` | Đỏ cờ | `default` | Mặc định | `#DA251D` | — |
| `tet` | Tết Nguyên Đán | `event` | ~7 ngày trước tới 7 ngày sau mùng 1 | Đỏ son + vàng kim | Hoa mai rơi, banner "Chúc mừng năm mới", lì xì trên splash |
| `reunification` | Thống nhất 30/4 | `event` | 28/4 – 1/5 | Đỏ cờ | Cờ đỏ sao vàng tung bay trên banner |
| `national-day` | Quốc khánh 2/9 | `event` | 31/8 – 3/9 | Đỏ cờ + vàng sao | Pháo hoa nhẹ khi mở app lần đầu trong ngày |
| `asean-cup` | Mùa ASEAN Cup | `event` | Suốt giải | Đỏ + xanh navy | Banner lịch thi đấu (chỉ dùng màu, **không dùng logo giải** vì bản quyền) |
| `sea-games` | Mùa SEA Games | `event` | Suốt giải bóng đá nam | Đỏ + vàng | Banner đếm ngược |
| `victory` | Đi bão | `result_win` | 24 giờ sau khi VN **thắng** (72 giờ nếu vô địch) | Đỏ rực + vàng | Pháo hoa + confetti khi mở app, lời chào "VIỆT NAM VÔ ĐỊCH!" |
| `keep-fire` | Tiếp lửa | `result_lose` | 12 giờ sau khi VN **thua** | Navy dịu | Lời động viên "Luôn bên nhau, Việt Nam ơi!", không hiệu ứng |
| *(hòa)* | — | — | Không đổi theme | — | — |

### 6.3. Thuật toán chọn theme (backend `themes.service.resolveActive`)

```
resolveActive(user?):
  prefs = user ? user_settings : cài đặt gửi từ máy (chế độ khách)

  if prefs.theme_mode == 'off'    → return 'default'
  if prefs.theme_mode == 'fixed'  → return prefs.fixed_theme_id  (nếu theme còn is_active)

  // theme_mode == 'auto'
  SELECT t.* FROM theme_schedules s JOIN themes t ON t.id = s.theme_id
  WHERE now() >= s.start_at AND now() < s.end_at AND t.is_active
  ORDER BY s.priority DESC, s.start_at DESC
  LIMIT 1
  → không có dòng nào → 'default'
```

- Kết quả tuỳ theo lịch được cache Redis key `theme:active` (TTL = thời điểm lịch gần nhất bắt đầu/kết thúc, tối đa 5 phút).
- Theme phản ứng được **tạo tự động**: khi `livePoll` phát hiện trận của VN chuyển `finished`, backend `INSERT theme_schedules (source='auto_result', match_id, priority=80 hoặc 100 nếu là trận chung kết)`, xoá cache và phát socket `theme:changed` tới **mọi** client.
- Người dùng chọn chế độ "Cố định" vẫn thấy bảng màu mình chọn, không bị "Đi bão" ghi đè.

### 6.4. Phía app

```ts
// src/theme/themes.ts — gộp palette (giản lược)
export function buildPalette(base: ColorPalette, override?: ThemeOverride): ColorPalette {
  if (!override) return base;
  const safe = pick(override, THEMABLE_KEYS);      // chỉ lấy token nằm trong danh sách trắng
  return { ...base, ...safe };
}
```

- `ThemeProvider` nhận thêm `eventTheme` (từ `useActiveTheme`) và `displayMode` (từ `settingsStore`); `useTheme()` giữ nguyên chữ ký → **mọi component hiện có tự đổi theo theme mà không cần sửa** (lợi ích của quy tắc "không dùng mã màu thô").
- Palette từ server gồm cả bản sáng (`palette_light`) và bản tối (`palette_dark`); thiếu khoá nào thì lấy của bảng gốc.
- Hiệu ứng (`components/effects/*`) chỉ chạy **một lần mỗi phiên mở app**, tối đa 3 giây, lớp phủ `pointerEvents="none"` (không chặn chạm), tắt khi bật "Giảm chuyển động" hoặc Senior mode.
- Màn `settings/themes`: lưới thẻ xem trước (mini mockup màu nhấn + banner) · 3 lựa chọn **Tự động theo sự kiện** (mặc định) / **Cố định một theme** / **Tắt**.

### 6.5. Kiểm soát chất lượng theme (khi admin tạo theme)

- Validate bằng zod: mọi màu là HEX hợp lệ, có đủ `palette_light` + `palette_dark`.
- **Kiểm tra độ tương phản ở backend**: `accentText` trên `bg` ≥ 4.5:1 và `accentFg` trên `accent` ≥ 4.5:1 cho cả hai chế độ — không đạt thì từ chối lưu (trả lỗi 422 kèm tỷ lệ đo được).
- Tài nguyên ảnh ≤ 300KB, tải trước (prefetch bằng `expo-image`) khi lịch còn 24 giờ nữa mới bắt đầu.

---

## 7. ⭐ GIAO DIỆN CHO NGƯỜI LỚN TUỔI (SENIOR MODE)

### 7.1. Mục tiêu

Ông bà, cha mẹ là những người hâm mộ trung thành nhưng thường thấy app bóng đá **chữ nhỏ, quá nhiều số liệu, nhiều thao tác vuốt**. Senior mode ưu tiên đúng 3 câu hỏi: **Mấy giờ đá? Xem kênh nào? Tỷ số bao nhiêu?**

Cách bật: Cài đặt → "Giao diện người lớn tuổi"; slide cuối phần giới thiệu ("Dùng chữ to, dễ đọc"); hoặc app **gợi ý bật** khi phát hiện cỡ chữ hệ thống ≥ 130% (`PixelRatio.getFontScale()`).

### 7.2. Thông số thiết kế

| Hạng mục | Tiêu chuẩn | Người lớn tuổi |
|---|---|---|
| Chữ nội dung (`fontSize.base`) | 15 | **20** |
| Chữ nhỏ nhất cho phép | 11 | **16** (bỏ hẳn cỡ xs/sm) |
| Tỷ số live (`fontSize.display`) | 40 | **56** |
| Nhãn tab | 11 | **15** |
| Icon tab | 22 | **30** |
| Vùng chạm tối thiểu | 44 pt | **56 pt** |
| Khoảng cách (`spacing`) | ×1 | **×1.25** |
| Màu chữ | `text` / `textMuted` / `textFaint` | Chỉ `text` và `textMuted` (bỏ `textFaint` — độ tương phản thấp) |
| Viền | `border` | `borderStrong` (tách khối rõ hơn) |
| Số tab | 5 | **3**: Trận đấu · Đội hình · Cài đặt |
| Cử chỉ | Vuốt ngang, kéo làm mới | **Mọi thao tác đều có nút bấm**; kéo làm mới vẫn giữ nhưng có thêm nút "Tải lại" |
| Hiệu ứng theme | Có | Tắt (chỉ đổi màu) |
| Cỡ chữ hệ thống (`maxFontSizeMultiplier`) | Giới hạn 1.3 để không vỡ bố cục | Giới hạn 1.6 (bố cục đã thiết kế cho chữ to) |

Hiện thực: `tokens.ts` xuất thêm `seniorScale`; `ThemeProvider` nhân các token với hệ số khi `displayMode === 'senior'` và thêm cờ `t.isSenior`. Component chỉ đọc token như cũ → không phải viết lại giao diện.

### 7.3. Màn hình chính rút gọn (Tab "Trận đấu" ở Senior mode)

```
┌───────────────────────────────────┐
│  TRẬN TIẾP THEO                   │
│  Việt Nam  –  Thái Lan            │  chữ 24, không viết tắt tên đội
│  19 giờ 30, Thứ Bảy 20/9          │  giờ viết đầy đủ bằng chữ
│  📺 Kênh VTV5 và FPT Play         │  kênh phát sóng nổi bật
│  [ 🔔  NHẮC TÔI TRƯỚC GIỜ ĐÁ ]     │  nút cao 56pt, rộng cả màn
├───────────────────────────────────┤
│  ĐANG ĐÁ — Phút 67                │  (chỉ hiện khi có trận live)
│  VIỆT NAM   2 – 1   THÁI LAN      │  tỷ số cỡ 56
│  [ 🔊  ĐỌC TỶ SỐ ]                 │  expo-speech, giọng vi-VN
├───────────────────────────────────┤
│  KẾT QUẢ GẦN NHẤT                 │
│  Việt Nam thắng Indonesia 3 – 0   │  câu hoàn chỉnh, có chữ "thắng/hoà/thua"
└───────────────────────────────────┘
```

### 7.4. Tính năng hỗ trợ riêng

- **Đọc to tỷ số** (`useSpeakScore`): "Phút 67, Việt Nam 2, Thái Lan 1. Tiến Linh vừa ghi bàn." Tuỳ chọn tự đọc khi có bàn thắng lúc app đang mở.
- **Thông báo rõ nghĩa**: "Việt Nam ghi bàn! Tỷ số 2–1, phút 67" thay vì "⚽ VIE 2-1 THA 67'".
- **Âm thanh + rung mạnh** khi có bàn thắng (tuỳ chọn).
- **Hộp thoại xác nhận** cho mọi thao tác quan trọng (đăng xuất, xoá).
- **Đội hình ở Senior mode**: sơ đồ sân vẫn giữ, nhưng chỉ hiện tên + điểm (bỏ bàn thắng và mũi tên thay người khỏi sơ đồ, đưa xuống danh sách bên dưới) để đỡ rối.

---

## 8. KIẾN TRÚC BACKEND (Node.js + Express)

### 8.1. Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/                     # env.ts · database.ts · redis · gemini.ts · storage.ts 🆕 · mailer.ts 🆕
│   ├── modules/
│   │   ├── auth/                   # 🔄 + forgot/reset/đổi mật khẩu, xoá tài khoản
│   │   ├── users/                  # 🆕 hồ sơ, ảnh đại diện, cài đặt người dùng
│   │   ├── app/                    # 🆕 /app/bootstrap, /onboarding/slides
│   │   ├── team/                   # 🆕 giới thiệu đội tuyển, thành tích
│   │   ├── matches/                # 🔄 + /live, /stats, /lineups (điểm + thẻ)
│   │   ├── squad/                  # 🔄 + /last-match
│   │   ├── players/                # 🔄 + /players/:id/ratings
│   │   ├── themes/                 # 🆕 danh mục theme + thuật toán chọn theme
│   │   ├── ranking/                # BXH FIFA
│   │   ├── ai/                     # dự đoán Gemini
│   │   ├── devices/                # FCM token
│   │   └── admin/                  # 🆕 CRUD nội dung: theme, lịch theme, thành tích, slide, điểm
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # requireAuth · optionalAuth 🆕 · requireRole('admin') 🆕
│   │   ├── upload.middleware.ts    # 🆕 multer (bộ nhớ RAM), giới hạn 2MB, kiểm tra magic bytes
│   │   └── ...                     # error · rateLimit · validate · requestLogger
│   ├── jobs/
│   │   ├── scheduler.ts            # 🔄 đăng ký thêm các job mới
│   │   ├── matchdaySync.job.ts     # 🆕 mỗi 1 phút: trận + đội hình (chỉ trong khung thi đấu)
│   │   ├── livePoll.job.ts         # mỗi 12 giây khi có trận live
│   │   ├── finalizeMatch.job.ts    # 🆕 T+0 / T+15′ / T+60′: thống kê + điểm cầu thủ
│   │   └── themeSchedule.job.ts    # 🆕 00:00 hằng ngày: làm mới cache theme, tải trước tài nguyên
│   ├── services/
│   │   ├── crawler.service.ts      # 🔄 + fetchMatchStats, fetchPlayerRatings, fetchLineup
│   │   ├── rating.service.ts       # 🆕 công thức tính điểm dự phòng (mục 9.4)
│   │   ├── contrast.service.ts     # 🆕 đo độ tương phản WCAG cho theme
│   │   ├── notification.service.ts # 🔄 lọc theo user_settings trước khi gửi
│   │   ├── socket.service.ts       # 🔄 + match:ratings, match:stats, lineup:announced, theme:changed
│   │   └── gemini.service.ts
│   └── db/migrations/
│       ├── 001_init.sql
│       └── 002_features.sql        # 🆕 (mục 9.2)
```

### 8.2. Danh sách API (`/api/v1`)

Ký hiệu Auth: `–` công khai · `○` không bắt buộc (đăng nhập thì cá nhân hoá) · `✔` bắt buộc đăng nhập · `A` chỉ admin.

**Xác thực & tài khoản**

| Method | Endpoint | Auth | Body / Query | Mô tả |
|---|---|---|---|---|
| POST | `/auth/register` | – | `{email, password, fullName}` | Đăng ký (bcrypt) ✅ |
| POST | `/auth/login` | – | `{email, password}` | → access + refresh token ✅ |
| POST | `/auth/refresh` | – | `{refreshToken}` | Cấp lại access token ✅ |
| POST | `/auth/logout` | ✔ | `{refreshToken}` | Thu hồi refresh token ✅ |
| GET | `/auth/me` | ✔ | – | Thông tin người dùng hiện tại ✅ |
| POST | `/auth/forgot-password` | – | `{email}` | 🆕 Gửi mã OTP 6 số qua email. **Luôn trả 200** dù email có tồn tại hay không (chống dò tài khoản) |
| POST | `/auth/reset-password` | – | `{email, code, newPassword}` | 🆕 Kiểm tra mã → đổi mật khẩu → thu hồi **mọi** refresh token |
| PATCH | `/auth/password` | ✔ | `{currentPassword, newPassword}` | 🆕 Đổi mật khẩu, thu hồi các phiên khác |
| DELETE | `/auth/account` | ✔ | `{password}` | 🆕 Xoá vĩnh viễn tài khoản + ảnh đại diện trên storage |

**Người dùng & cài đặt**

| Method | Endpoint | Auth | Body | Mô tả |
|---|---|---|---|---|
| PATCH | `/users/me` | ✔ | `{fullName?, displayName?, birthDate?, province?, favoritePlayerId?}` | 🆕 Chỉnh sửa hồ sơ |
| POST | `/users/me/avatar` | ✔ | `multipart/form-data: avatar` | 🆕 Tải ảnh đại diện → trả `avatarUrl` |
| DELETE | `/users/me/avatar` | ✔ | – | 🆕 Xoá ảnh đại diện |
| GET | `/users/me/settings` | ✔ | – | 🆕 Theme, sáng/tối, Senior mode, thông báo |
| PUT | `/users/me/settings` | ✔ | xem ví dụ 8.3 | 🆕 Lưu cài đặt (đồng bộ nhiều máy) |

**Khởi động app & đội tuyển**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/app/bootstrap` | ○ | 🆕 Một lần gọi lúc splash: theme đang áp dụng, trận live, phiên bản giới thiệu, phiên bản app tối thiểu |
| GET | `/onboarding/slides` | – | 🆕 4 slide giới thiệu đội tuyển + `version` |
| GET | `/team/profile` | – | 🆕 Biệt danh, liên đoàn, sân nhà, giới thiệu, thứ hạng FIFA cao nhất |
| GET | `/team/achievements` | – | 🆕 `?result=champion&competition=...` — dòng thời gian thành tích |
| GET | `/coach` | – | HLV trưởng ✅ |
| GET | `/ranking/fifa` | – | BXH FIFA ✅ |

**Trận đấu, đội hình, cầu thủ**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/matches/latest` | – | Trận gần nhất / đang diễn ra ✅ |
| GET | `/matches/live` | – | 🆕 Các trận đang live |
| GET | `/matches/upcoming` | – | Lịch sắp tới (phân trang) ✅ — 🔄 thêm `tvChannels` |
| GET | `/matches/results` | – | Kết quả đã đấu ✅ |
| GET | `/matches/:id` | – | Chi tiết trận ✅ |
| GET | `/matches/:id/live` | – | Tỷ số + sự kiện realtime ✅ |
| GET | `/matches/:id/h2h` | – | Lịch sử đối đầu ✅ |
| GET | `/matches/:id/stats` | – | 🆕 Thông số sau trận của 2 đội |
| GET | `/matches/:id/lineups` | – | 🆕 Đội hình 2 đội + **điểm, thẻ, bàn thắng, thay người** của từng cầu thủ |
| GET | `/squad/current` | – | Đội hình dự kiến ✅ |
| GET | `/squad/last-match` | – | 🆕 Đội hình VN ở trận vừa kết thúc, kèm điểm + thẻ (định dạng giống `/matches/:id/lineups`, chỉ phía VN) |
| GET | `/squad/value` | – | Tổng giá trị đội hình ✅ |
| GET | `/players` | – | Danh sách ✅ — 🔄 thêm `avgRating5` |
| GET | `/players/:id` | – | Hồ sơ ✅ |
| GET | `/players/:id/clubs` | – | Lịch sử CLB ✅ |
| GET | `/players/:id/ratings` | – | 🆕 `?limit=10` — điểm các trận gần nhất (biểu đồ phong độ) |
| GET | `/ai/predict/:matchId` | – | Dự đoán Thắng/Hòa/Thua ✅ |
| GET | `/ai/status` | – | Trạng thái AI ✅ |

**Theme & thiết bị**

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| GET | `/themes` | – | 🆕 Danh mục theme cho màn chọn theme (bỏ qua theme `result_*`) |
| GET | `/themes/active` | ○ | 🆕 Theme đang áp dụng theo thuật toán 6.3. Có `ETag` → app gửi `If-None-Match`, không đổi thì nhận 304 |
| POST | `/devices/token` | ✔ | Đăng ký FCM token ✅ |
| DELETE | `/devices/token` | ✔ | Huỷ token ✅ |
| GET | `/devices` | ✔ | Danh sách thiết bị ✅ |

**Quản trị (admin)** — tất cả `A`, đều ghi log người sửa

| Method | Endpoint | Mô tả |
|---|---|---|
| GET/POST | `/admin/themes` | Danh sách / tạo theme (kiểm tra độ tương phản 6.5) |
| PUT/DELETE | `/admin/themes/:id` | Sửa / tắt theme (`is_active=false`, không xoá cứng) |
| GET/POST | `/admin/theme-schedules` | Lịch áp dụng theme |
| DELETE | `/admin/theme-schedules/:id` | Huỷ lịch (kể cả lịch "Đi bão" tự tạo) |
| PUT | `/admin/team-profile` | Sửa giới thiệu đội tuyển |
| POST/PUT/DELETE | `/admin/achievements[/:id]` | Quản lý thành tích |
| POST/PUT/DELETE | `/admin/onboarding-slides[/:id]` | Quản lý slide giới thiệu (tự tăng `version`) |
| PUT | `/admin/matches/:id/ratings` | Sửa tay điểm cầu thủ (`rating_source='manual'`) |
| PUT | `/admin/matches/:id/stats` | Nhập tay thông số trận khi nguồn dữ liệu thiếu |
| POST | `/admin/notifications` | Gửi thông báo đẩy thủ công |

### 8.3. Ví dụ dữ liệu trả về

Mọi phản hồi dùng khuôn chung `{ success, data, error?, meta? }` (`utils/apiResponse.ts`).

**`GET /app/bootstrap`**

```json
{
  "success": true,
  "data": {
    "theme": {
      "code": "victory",
      "name": "Đi bão",
      "kind": "result_win",
      "paletteLight": { "accent": "#D0121B", "accentText": "#B80F17", "gold": "#B88700" },
      "paletteDark":  { "accent": "#E3241B", "accentText": "#FF5A4F", "gold": "#FFCD00" },
      "assets": { "effect": "fireworks", "greeting": "VIỆT NAM CHIẾN THẮNG!", "bannerUrl": "https://.../victory.webp" },
      "endsAt": "2026-09-21T12:30:00Z"
    },
    "liveMatchId": null,
    "onboardingVersion": 3,
    "minAppVersion": "2.0.0",
    "serverTime": "2026-09-20T15:02:11Z"
  }
}
```

**`GET /matches/:id/lineups`** (dùng cho sơ đồ có điểm + thẻ)

```json
{
  "success": true,
  "data": {
    "matchId": 42,
    "status": "finished",
    "ratingsStatus": "final",
    "ratingSource": "provider",
    "motmPlayerId": 9,
    "teams": [
      {
        "teamId": 1, "fifaCode": "VIE", "formation": "3-4-3",
        "starters": [
          {
            "playerId": 9, "fullName": "Nguyễn Tiến Linh", "shortName": "Tiến Linh",
            "shirtNumber": 22, "position": "FW", "positionX": 50, "positionY": 88,
            "isCaptain": false,
            "rating": 8.4, "isMotm": true, "minutesPlayed": 67,
            "goals": 2, "assists": 0,
            "cards": [ { "type": "yellow_card", "minute": 41 } ],
            "subbedOutAt": 67, "subbedInAt": null
          }
        ],
        "bench": [
          {
            "playerId": 17, "fullName": "Nguyễn Văn Toàn", "shirtNumber": 9, "position": "FW",
            "rating": null, "minutesPlayed": 8, "goals": 0, "assists": 0,
            "cards": [], "subbedInAt": 82
          }
        ]
      }
    ]
  }
}
```

`rating: null` + `minutesPlayed < 10` → app hiện "–". `cards[].type` ∈ `yellow_card` · `second_yellow` · `red_card`.

**`PUT /users/me/settings`**

```json
{
  "themeMode": "auto",
  "fixedThemeId": null,
  "colorScheme": "system",
  "displayMode": "senior",
  "ttsEnabled": true,
  "notify": { "goals": true, "kickoff": true, "lineup": true, "ratings": true, "result": true, "themes": false }
}
```

### 8.4. Sự kiện WebSocket

| Sự kiện | Hướng | Room | Payload |
|---|---|---|---|
| `match:subscribe` / `match:unsubscribe` | client → server | – | `{ matchId }` ✅ |
| `score:update` | server → client | `match:{id}` | `{ matchId, home, away, minute }` ✅ |
| `match:event` | server → client | `match:{id}` | `{ type, playerId, minute, detail }` ✅ |
| `match:finished` | server → client | `match:{id}` | `{ matchId, finalScore }` ✅ |
| `lineup:announced` | server → client | `global` | 🆕 `{ matchId, teamId }` — đội hình chính thức vừa công bố |
| `match:stats` | server → client | `match:{id}` | 🆕 `{ matchId, stats: [...] }` |
| `match:ratings` | server → client | `match:{id}` + `global` | 🆕 `{ matchId, status: 'provisional'\|'final', motmPlayerId, players: [{ playerId, rating }] }` |
| `theme:changed` | server → client | `global` | 🆕 `{ code, endsAt }` — app gọi lại `/themes/active` |

Mọi socket tự vào room `global` khi kết nối; room `match:{id}` chỉ vào khi mở màn trận.

---

## 9. THIẾT KẾ CƠ SỞ DỮ LIỆU (PostgreSQL)

### 9.1. Sơ đồ quan hệ

```
users ─┬─< refresh_tokens
       ├─< password_reset_codes          🆕
       ├── user_settings (1-1)           🆕 ──> themes (fixed_theme_id)
       ├─< device_tokens
       └──> players (favorite_player_id) 🆕

teams ─┬── team_profiles (1-1)           🆕
       ├─< achievements                  🆕 ──> matches (final_match_id)
       ├─< coaches
       ├─< players ─< player_clubs
       ├─< fifa_rankings
       └─< lineups ─< lineup_players ──> players

matches ─┬─< match_events ──> players (player_id, assist_player_id 🆕)
         ├─< match_stats (mỗi đội 1 dòng)             🆕
         ├─< player_match_stats ──> players           🆕
         ├── ai_predictions (1-1)
         └─< theme_schedules (theme "Đi bão" tự tạo)  🆕

themes ─< theme_schedules                              🆕
onboarding_slides                                      🆕 (bảng độc lập)
```

**Bảng đã có ở `001_init.sql`** (giữ nguyên): `users`, `refresh_tokens`, `teams`, `coaches`, `players`, `player_clubs`, `matches`, `match_events`, `lineups`, `lineup_players`, `h2h_records`, `ai_predictions`, `fifa_rankings`, `device_tokens`.

### 9.2. Migration `002_features.sql`

```sql
-- ===========================================================================
-- MIGRATION 002 — TÍNH NĂNG v2.0
-- Giới thiệu & thành tích · Thông số sau trận · Điểm cầu thủ · Theme
-- Senior mode · Hồ sơ người dùng · Quên mật khẩu
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- A. MỞ RỘNG BẢNG CŨ
-- ---------------------------------------------------------------------------

-- A1. USERS — thêm các trường hồ sơ
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS display_name       VARCHAR(40),
  ADD COLUMN IF NOT EXISTS birth_date         DATE,
  ADD COLUMN IF NOT EXISTS province           VARCHAR(80),
  ADD COLUMN IF NOT EXISTS favorite_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS avatar_key         TEXT,          -- khoá file trên storage, để xoá được
  ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;  -- token cấp trước mốc này bị từ chối

-- A2. MATCHES — kênh phát sóng + trạng thái chốt điểm
ALTER TABLE matches
  ADD COLUMN IF NOT EXISTS tv_channels     JSONB NOT NULL DEFAULT '[]'::jsonb,  -- ["VTV5","FPT Play"]
  ADD COLUMN IF NOT EXISTS is_final        BOOLEAN NOT NULL DEFAULT FALSE,     -- trận chung kết → theme 72h
  ADD COLUMN IF NOT EXISTS finished_at     TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS ratings_status  VARCHAR(12) NOT NULL DEFAULT 'none'
        CHECK (ratings_status IN ('none','provisional','final'));

-- A3. MATCH_EVENTS — thêm "thẻ vàng thứ hai" + người kiến tạo
ALTER TABLE match_events DROP CONSTRAINT IF EXISTS match_events_type_check;
ALTER TABLE match_events
  ADD CONSTRAINT match_events_type_check CHECK (type IN (
    'goal','own_goal','penalty','missed_penalty',
    'yellow_card','second_yellow','red_card','substitution','var')),
  ADD COLUMN IF NOT EXISTS assist_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL,
  -- Thay người: player_id = người VÀO, related_player_id = người RA
  ADD COLUMN IF NOT EXISTS related_player_id INTEGER REFERENCES players(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_match_events_player ON match_events(player_id);

-- A4. LINEUPS — mốc công bố đội hình chính thức (để gửi thông báo đúng 1 lần)
ALTER TABLE lineups
  ADD COLUMN IF NOT EXISTS announced_at TIMESTAMPTZ;


-- ---------------------------------------------------------------------------
-- B. HỒ SƠ NGƯỜI DÙNG
-- ---------------------------------------------------------------------------

-- B1. PASSWORD_RESET_CODES — mã OTP quên mật khẩu
CREATE TABLE IF NOT EXISTS password_reset_codes (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  code_hash   VARCHAR(128) NOT NULL,       -- chỉ lưu hash của mã 6 số, giống mật khẩu
  expires_at  TIMESTAMPTZ NOT NULL,        -- 15 phút
  attempts    SMALLINT NOT NULL DEFAULT 0 CHECK (attempts <= 5),  -- nhập sai 5 lần → huỷ mã
  used_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_reset_codes_user ON password_reset_codes(user_id);

-- B2. THEMES (tạo trước vì user_settings tham chiếu tới)
CREATE TABLE IF NOT EXISTS themes (
  id             SERIAL PRIMARY KEY,
  code           VARCHAR(40) NOT NULL UNIQUE,          -- 'tet', 'victory'
  name           VARCHAR(80) NOT NULL,                 -- 'Tết Nguyên Đán'
  kind           VARCHAR(20) NOT NULL
                 CHECK (kind IN ('default','event','result_win','result_lose')),
  -- Chỉ chứa các token nằm trong danh sách trắng (mục 6.1), kiểm tra ở tầng ứng dụng
  palette_light  JSONB NOT NULL DEFAULT '{}'::jsonb,
  palette_dark   JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- { "effect": "fireworks"|"blossoms"|"confetti"|null, "greeting": "...",
  --   "bannerUrl": "...", "splashImageUrl": "..." }
  assets         JSONB NOT NULL DEFAULT '{}'::jsonb,
  preview_url    TEXT,                                 -- ảnh xem trước ở màn chọn theme
  is_selectable  BOOLEAN NOT NULL DEFAULT TRUE,        -- người dùng được chọn "cố định" không
  is_active      BOOLEAN NOT NULL DEFAULT TRUE,        -- tắt thay vì xoá
  created_by     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- B3. USER_SETTINGS — cài đặt giao diện & thông báo (1 dòng / người dùng)
CREATE TABLE IF NOT EXISTS user_settings (
  user_id         INTEGER PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  theme_mode      VARCHAR(10) NOT NULL DEFAULT 'auto'
                  CHECK (theme_mode IN ('auto','fixed','off')),
  fixed_theme_id  INTEGER REFERENCES themes(id) ON DELETE SET NULL,
  color_scheme    VARCHAR(10) NOT NULL DEFAULT 'system'
                  CHECK (color_scheme IN ('system','light','dark')),
  display_mode    VARCHAR(10) NOT NULL DEFAULT 'standard'
                  CHECK (display_mode IN ('standard','senior')),
  tts_enabled     BOOLEAN NOT NULL DEFAULT FALSE,      -- đọc to tỷ số
  notify_goals    BOOLEAN NOT NULL DEFAULT TRUE,
  notify_kickoff  BOOLEAN NOT NULL DEFAULT TRUE,
  notify_lineup   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_ratings  BOOLEAN NOT NULL DEFAULT TRUE,
  notify_result   BOOLEAN NOT NULL DEFAULT TRUE,
  notify_themes   BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- Chọn "cố định" thì bắt buộc phải có theme
  CONSTRAINT chk_fixed_theme CHECK (theme_mode <> 'fixed' OR fixed_theme_id IS NOT NULL)
);

-- B4. THEME_SCHEDULES — lịch áp dụng theme
CREATE TABLE IF NOT EXISTS theme_schedules (
  id          SERIAL PRIMARY KEY,
  theme_id    INTEGER NOT NULL REFERENCES themes(id) ON DELETE CASCADE,
  start_at    TIMESTAMPTZ NOT NULL,
  end_at      TIMESTAMPTZ NOT NULL,
  priority    SMALLINT NOT NULL DEFAULT 50,      -- event 50 · kết quả 80 · vô địch 100
  source      VARCHAR(12) NOT NULL DEFAULT 'manual'
              CHECK (source IN ('manual','auto_result')),
  match_id    INTEGER REFERENCES matches(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_schedule_range CHECK (end_at > start_at),
  -- Theme tự động luôn phải gắn với một trận
  CONSTRAINT chk_auto_has_match CHECK (source <> 'auto_result' OR match_id IS NOT NULL),
  -- Một trận chỉ sinh tối đa một lịch "Đi bão/Tiếp lửa" (chống tạo trùng khi job chạy lại)
  CONSTRAINT uq_schedule_match UNIQUE (match_id)
);
-- Truy vấn "theme nào đang áp dụng lúc này" lọc theo khoảng thời gian
CREATE INDEX IF NOT EXISTS idx_theme_schedules_range ON theme_schedules(start_at, end_at);


-- ---------------------------------------------------------------------------
-- C. GIỚI THIỆU & THÀNH TÍCH
-- ---------------------------------------------------------------------------

-- C1. TEAM_PROFILES — giới thiệu chung đội tuyển (1-1 với teams)
CREATE TABLE IF NOT EXISTS team_profiles (
  team_id            INTEGER PRIMARY KEY REFERENCES teams(id) ON DELETE CASCADE,
  nickname           VARCHAR(120),        -- 'Những chiến binh Sao Vàng'
  federation         VARCHAR(160),        -- 'Liên đoàn Bóng đá Việt Nam (VFF)'
  confederations     JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["AFC","AFF"]
  home_stadium       VARCHAR(160),        -- 'Sân vận động Quốc gia Mỹ Đình'
  intro_text         TEXT NOT NULL,       -- đoạn giới thiệu hiển thị ở Trang chủ
  cover_image_url    TEXT,
  best_fifa_rank     SMALLINT CHECK (best_fifa_rank > 0),
  best_fifa_rank_date DATE,
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- C2. ACHIEVEMENTS — dòng thời gian thành tích
CREATE TABLE IF NOT EXISTS achievements (
  id              SERIAL PRIMARY KEY,
  team_id         INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  competition     VARCHAR(120) NOT NULL,   -- 'AFF Cup', 'Asian Cup'
  edition_year    SMALLINT NOT NULL CHECK (edition_year BETWEEN 1900 AND 2100),
  result          VARCHAR(20) NOT NULL CHECK (result IN (
                    'champion','runner_up','third_place','semi_final',
                    'quarter_final','round_of_16','group_stage','qualified')),
  title           VARCHAR(160) NOT NULL,   -- 'Vô địch AFF Cup 2018'
  description     TEXT,
  host            VARCHAR(120),            -- nước chủ nhà
  image_url       TEXT,
  final_match_id  INTEGER REFERENCES matches(id) ON DELETE SET NULL,
  is_highlight    BOOLEAN NOT NULL DEFAULT FALSE,   -- hiện ở "Tủ danh hiệu" + onboarding
  UNIQUE (team_id, competition, edition_year)
);
CREATE INDEX IF NOT EXISTS idx_achievements_team_year ON achievements(team_id, edition_year DESC);

-- C3. ONBOARDING_SLIDES — nội dung phần "Giới thiệu chung" sau splash
CREATE TABLE IF NOT EXISTS onboarding_slides (
  id          SERIAL PRIMARY KEY,
  sort_order  SMALLINT NOT NULL,
  title       VARCHAR(120) NOT NULL,
  body        TEXT NOT NULL,
  image_url   TEXT,
  version     INTEGER NOT NULL DEFAULT 1,  -- tăng khi admin sửa → app hiện lại giới thiệu
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_onboarding_order ON onboarding_slides(sort_order) WHERE is_active;


-- ---------------------------------------------------------------------------
-- D. THÔNG SỐ SAU TRẬN & ĐIỂM CẦU THỦ
-- ---------------------------------------------------------------------------

-- D1. MATCH_STATS — thống kê cấp đội (mỗi trận 2 dòng: đội nhà, đội khách)
CREATE TABLE IF NOT EXISTS match_stats (
  id                 SERIAL PRIMARY KEY,
  match_id           INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  team_id            INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  possession_pct     SMALLINT CHECK (possession_pct BETWEEN 0 AND 100),
  shots              SMALLINT CHECK (shots >= 0),
  shots_on_target    SMALLINT CHECK (shots_on_target >= 0),
  expected_goals     NUMERIC(4,2) CHECK (expected_goals >= 0),   -- xG, có thể NULL
  corners            SMALLINT CHECK (corners >= 0),
  offsides           SMALLINT CHECK (offsides >= 0),
  fouls              SMALLINT CHECK (fouls >= 0),
  yellow_cards       SMALLINT CHECK (yellow_cards >= 0),
  red_cards          SMALLINT CHECK (red_cards >= 0),
  saves              SMALLINT CHECK (saves >= 0),
  passes             SMALLINT CHECK (passes >= 0),
  pass_accuracy_pct  SMALLINT CHECK (pass_accuracy_pct BETWEEN 0 AND 100),
  source             VARCHAR(10) NOT NULL DEFAULT 'provider'
                     CHECK (source IN ('provider','manual')),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, team_id),                       -- cho phép upsert
  CONSTRAINT chk_on_target CHECK (shots_on_target <= shots)
);

-- D2. PLAYER_MATCH_STATS — điểm + chỉ số cá nhân từng trận
CREATE TABLE IF NOT EXISTS player_match_stats (
  id                 SERIAL PRIMARY KEY,
  match_id           INTEGER NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  player_id          INTEGER NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  team_id            INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  minutes_played     SMALLINT NOT NULL DEFAULT 0 CHECK (minutes_played BETWEEN 0 AND 130),
  -- NUMERIC(3,1): 0.0 – 10.0, đúng 1 chữ số thập phân như hiển thị. NULL = chưa chấm / đá < 10 phút
  rating             NUMERIC(3,1) CHECK (rating BETWEEN 0 AND 10),
  rating_source      VARCHAR(10) CHECK (rating_source IN ('provider','computed','manual')),
  is_motm            BOOLEAN NOT NULL DEFAULT FALSE,
  shots              SMALLINT DEFAULT 0,
  shots_on_target    SMALLINT DEFAULT 0,
  key_passes         SMALLINT DEFAULT 0,
  passes             SMALLINT DEFAULT 0,
  pass_accuracy_pct  SMALLINT CHECK (pass_accuracy_pct BETWEEN 0 AND 100),
  tackles            SMALLINT DEFAULT 0,
  interceptions      SMALLINT DEFAULT 0,
  saves              SMALLINT DEFAULT 0,          -- thủ môn
  goals_conceded     SMALLINT DEFAULT 0,          -- thủ môn
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (match_id, player_id)
);
CREATE INDEX IF NOT EXISTS idx_pms_player ON player_match_stats(player_id, match_id DESC);
-- Mỗi trận chỉ có tối đa 1 cầu thủ xuất sắc nhất
CREATE UNIQUE INDEX IF NOT EXISTS uq_pms_motm ON player_match_stats(match_id) WHERE is_motm;


-- ---------------------------------------------------------------------------
-- E. VIEW TỔNG HỢP CHO SƠ ĐỒ ĐỘI HÌNH (điểm + thẻ + bàn + thay người)
-- ---------------------------------------------------------------------------
-- Thẻ, bàn thắng, thay người lấy từ match_events (NGUỒN DUY NHẤT) — không lưu
-- trùng vào player_match_stats, tránh tình trạng hai nơi lệch nhau.
CREATE OR REPLACE VIEW v_player_match_summary AS
SELECT
  pms.match_id,
  pms.player_id,
  pms.team_id,
  pms.rating,
  pms.rating_source,
  pms.is_motm,
  pms.minutes_played,
  COUNT(*) FILTER (WHERE e.type IN ('goal','penalty') AND e.player_id = pms.player_id)  AS goals,
  COUNT(*) FILTER (WHERE e.type = 'goal' AND e.assist_player_id = pms.player_id)       AS assists,
  COALESCE(
    jsonb_agg(jsonb_build_object('type', e.type, 'minute', e.minute) ORDER BY e.minute)
      FILTER (WHERE e.type IN ('yellow_card','second_yellow','red_card')
              AND e.player_id = pms.player_id),
    '[]'::jsonb)                                                                       AS cards,
  MIN(e.minute) FILTER (WHERE e.type = 'substitution' AND e.player_id = pms.player_id)         AS subbed_in_at,
  MIN(e.minute) FILTER (WHERE e.type = 'substitution' AND e.related_player_id = pms.player_id) AS subbed_out_at
FROM player_match_stats pms
LEFT JOIN match_events e
       ON e.match_id = pms.match_id
      AND (e.player_id = pms.player_id
           OR e.assist_player_id = pms.player_id
           OR e.related_player_id = pms.player_id)
GROUP BY pms.match_id, pms.player_id, pms.team_id, pms.rating,
         pms.rating_source, pms.is_motm, pms.minutes_played;
```

Rollback (`002_features.down.sql`): `DROP VIEW` → `DROP TABLE` theo thứ tự ngược (D2, D1, C3, C2, C1, B4, B3, B2, B1) → `ALTER TABLE ... DROP COLUMN` các cột ở mục A → khôi phục CHECK cũ của `match_events`.

### 9.3. Index quan trọng & dữ liệu mẫu

| Index | Phục vụ truy vấn |
|---|---|
| `matches(kickoff_at)`, `matches(status)` | Lịch thi đấu, trận live, khung ngày thi đấu của job 1 phút |
| `theme_schedules(start_at, end_at)` | Theme đang áp dụng lúc này |
| `player_match_stats(player_id, match_id DESC)` | Biểu đồ phong độ 10 trận, điểm trung bình 5 trận |
| `uq_pms_motm` (partial unique) | Đảm bảo mỗi trận chỉ 1 cầu thủ xuất sắc nhất |
| `achievements(team_id, edition_year DESC)` | Dòng thời gian thành tích |
| `match_events(player_id)` | Tổng hợp thẻ phạt / bàn thắng theo cầu thủ |

Dữ liệu mẫu (`db/seeds/data.ts`) bổ sung:

- `themes`: `default`, `tet`, `reunification`, `national-day`, `asean-cup`, `sea-games`, `victory`, `keep-fire`.
- `theme_schedules`: lịch các ngày lễ của năm hiện tại và năm sau.
- `team_profiles` + `achievements`: vô địch Đông Nam Á 2008 · 2018 · 2024; tứ kết Asian Cup 2007 · 2019 (`is_highlight = true`).
- `onboarding_slides`: 4 slide ở mục 4.1.
- 1 trận đã kết thúc có đủ `match_stats` + `player_match_stats` + thẻ để thử sơ đồ có điểm.

### 9.4. Điểm cầu thủ: nguồn & công thức dự phòng

Thứ tự ưu tiên nguồn điểm: **`manual` (admin sửa) > `provider` (API bóng đá) > `computed` (hệ thống tự tính)**. Job không bao giờ ghi đè điểm `manual`.

Khi API không trả điểm (thường gặp với các trận giao hữu), `rating.service` tính theo công thức minh bạch:

```
điểm = 6.0
     + 1.0 × bàn thắng        + 0.6 × kiến tạo        + 0.3 × đường chuyền quyết định
     + 0.1 × dứt điểm trúng đích + 0.1 × (tắc bóng + cắt bóng)
     + 0.3 × cứu thua (thủ môn)  + 0.5 × giữ sạch lưới (GK/DF, đá ≥ 60′)
     − 0.5 × thẻ vàng         − 1.5 × thẻ đỏ          − 1.0 × phản lưới nhà
     − 0.2 × bàn thua (GK/DF)  + 0.3 nếu đội thắng     − 0.2 nếu đội thua
→ giới hạn trong [3.0, 10.0], làm tròn 1 chữ số thập phân
→ đá < 10 phút: rating = NULL
→ MOTM = điểm cao nhất trận (bằng điểm → ưu tiên cầu thủ đội thắng, rồi nhiều phút hơn)
```

---

## 10. TÍCH HỢP AI — GOOGLE GEMINI

Giữ nguyên backend của bản 1.0; chỉ đổi vị trí hiển thị (tab con "Dự đoán" trong Chi tiết trận).

```
Client GET /ai/predict/:matchId
        │
 Redis cache hit? ──yes──► Trả kết quả (TTL 6h hoặc tới giờ bóng lăn)
        │ no
 Truy vấn PostgreSQL: phong độ 5–10 trận, H2H, đội hình dự kiến, chấn thương/treo giò,
                      BXH FIFA, sân nhà/khách, 🆕 điểm trung bình cầu thủ (player_match_stats)
        │
 gemini.service.buildPrompt() → Gemini (responseMimeType: application/json + responseSchema)
        │
 Parse & validate → tổng % = 100 (CHECK ở DB) → lưu ai_predictions + Redis → trả client
```

```json
{
  "win_pct": 45, "draw_pct": 30, "lose_pct": 25,
  "analysis_text": "Đoạn nhận định 150-250 từ...",
  "key_factors": ["Lợi thế sân nhà", "Vắng trụ cột hàng thủ"],
  "predicted_score": "2-1",
  "confidence": "medium"
}
```

- API key chỉ nằm ở backend · rate limit `/ai/*` 20 request/giờ/user · retry 3 lần (backoff) · ghi `model_version`.
- **Senior mode**: ẩn phần trăm và bài phân tích dài, chỉ hiện một câu tóm tắt ("Việt Nam được đánh giá nhỉnh hơn").

---

## 11. BẢO MẬT

| Lớp | Biện pháp |
|---|---|
| Mật khẩu | `bcryptjs` cost 10–12; mật khẩu tối thiểu 8 ký tự, có chữ và số |
| Phiên đăng nhập | Access token 15 phút, refresh token 7 ngày (lưu hash, thu hồi được). 🆕 Token cấp trước `users.password_changed_at` bị từ chối |
| 🆕 Quên mật khẩu | Mã OTP 6 số ngẫu nhiên (`crypto.randomInt`), **lưu hash**, hết hạn 15 phút, tối đa 5 lần nhập sai, dùng 1 lần; phản hồi giống nhau cho mọi email (chống dò tài khoản); rate limit 3 lần/giờ/email + 10 lần/giờ/IP |
| 🆕 Đổi mật khẩu / xoá tài khoản | Bắt buộc nhập lại mật khẩu hiện tại; đổi xong thu hồi mọi phiên khác |
| 🆕 Tải ảnh đại diện | Tối đa 2MB; kiểm tra **magic bytes** (không tin phần mở rộng tên file); chỉ JPG/PNG/WebP; server nén lại bằng `sharp` (loại bỏ EXIF có toạ độ GPS); tên file ngẫu nhiên UUID |
| 🆕 Phân quyền admin | Middleware `requireRole('admin')`; mọi thao tác `/admin/*` ghi log (ai, lúc nào, sửa gì) |
| 🆕 Theme từ server | Chỉ nhận token trong danh sách trắng, validate HEX, kiểm tra độ tương phản → không thể "chèn" giao diện không đọc được |
| Lưu trữ trên máy | Token trong `expo-secure-store`; AsyncStorage chỉ chứa dữ liệu không nhạy cảm (cài đặt, cache) |
| Truyền tải | HTTPS / WSS bắt buộc ở production |
| HTTP headers · CORS | `helmet` · whitelist domain qua biến môi trường |
| Chống brute-force | 5 lần đăng nhập sai / 15 phút / IP |
| Validate input | `zod` ở mọi route; parameterized query chống SQL Injection |
| Secrets · Logging | Toàn bộ trong `.env` (có trong `.gitignore`); `winston` không log mật khẩu, token, mã OTP, API key |
| 🆕 Quyền riêng tư | Xoá tài khoản xoá luôn dữ liệu cá nhân + ảnh; ngày sinh/tỉnh thành là tuỳ chọn |

---

## 12. LUỒNG CẬP NHẬT DỮ LIỆU

### 12.1. Dữ liệu tĩnh — Cron hằng ngày (node-cron, `Asia/Ho_Chi_Minh`)

| Thời điểm | Job | Nội dung |
|---|---|---|
| 00:00 | `themeSchedule` 🆕 | Làm mới cache `theme:active`, tải trước tài nguyên theme sắp bắt đầu trong 24 giờ |
| 01:00 | `syncSquad` | Đội hình dự kiến, sơ đồ, dự bị |
| 01:10 | `syncPlayers` | **Thông tin cầu thủ: giá trị chuyển nhượng**, CLB, chiều cao, số trận/bàn ĐTQG |
| 01:20 | `syncFixtures` | Lịch thi đấu, kết quả, 🆕 kênh phát sóng |
| 01:30 | `syncRanking` | BXH FIFA |
| 02:00 | `cleanup` | Xoá refresh token hết hạn, 🆕 mã OTP hết hạn, 🆕 lịch theme đã qua > 30 ngày, dọn cache |

Biến môi trường mới: `CRON_THEME_SCHEDULE="0 0 * * *"`, `MATCHDAY_SYNC_ENABLED=true`, `MATCHDAY_WINDOW_BEFORE_MIN=180`, `LINEUP_WINDOW_BEFORE_MIN=90`.

### 12.2. ⭐ Cập nhật 1 phút/lần — `matchdaySync.job` (`* * * * *`)

```
Mỗi phút:
  1. SELECT các trận của VN có kickoff_at trong [now − 3h, now + 3h]
     và status IN ('scheduled','live')                ← dùng idx_matches_kickoff, < 1ms
  2. Không có trận nào → thoát ngay (không gọi API ngoài)   ← 95% thời gian rơi vào đây
  3. Có trận:
     a. TRẬN ĐẤU: gọi API → cập nhật giờ đá, sân, trạng thái (hoãn/huỷ), kênh phát sóng
        → nếu có thay đổi: UPDATE matches, xoá cache, emit tới room match:{id}
        → trận chuyển 'live' → bật livePoll (12 giây/lần)
     b. ĐỘI HÌNH: nếu now ≥ kickoff − 90 phút:
        gọi API lineup → so sánh với lineups/lineup_players
        → lần đầu có đội hình chính thức: set announced_at, emit lineup:announced,
          gửi push "Đội hình ra sân VIE vs THA đã công bố" (1 lần duy nhất nhờ announced_at)
        → có thay đổi (thay người khi live): cập nhật lineup_players
```

| Dữ liệu | Ngoài khung thi đấu | Khung ngày thi đấu (T−3h → T+3h) | Đang live |
|---|---|---|---|
| Trận đấu (giờ, trạng thái, kênh) | 1 lần/ngày (01:20) | **1 phút/lần** | 12 giây/lần (tỷ số, sự kiện) |
| Đội hình | 1 lần/ngày (01:00) | **1 phút/lần** từ T−90′ | **1 phút/lần** (thay người) |
| Thông tin cầu thủ (giá trị…) | 1 lần/ngày (01:10) | Không đổi | Không đổi |

**Ước tính hạn mức API**: 1 trận ≈ 6 giờ × 60 phút × 2 loại dữ liệu ≈ 720 request + live 90′ × 5 request/phút ≈ 450 → **≈ 1.200 request/ngày có trận**, ≈ 5 request/ngày không có trận. Gói miễn phí (~100 request/ngày) chỉ đủ để phát triển → khi phát hành cần gói trả phí, hoặc tăng chu kỳ lên 2–3 phút qua biến môi trường.

### 12.3. Sau khi trận kết thúc — `finalizeMatch.job`

```
livePoll phát hiện status = finished
   │
   ├─► UPDATE matches SET finished_at = now(); emit match:finished; dừng livePoll
   │
   ├─► [T+0]   Lấy thống kê đội + chỉ số cầu thủ
   │            → upsert match_stats, player_match_stats
   │            → thiếu điểm từ API → rating.service tính (rating_source = 'computed')
   │            → ratings_status = 'provisional'; emit match:stats + match:ratings
   │            → push "⭐ Điểm cầu thủ đã có" (người bật notify_ratings)
   │
   ├─► [T+0]   Trận của VN thắng / thua?
   │            → INSERT theme_schedules (victory 24h/72h | keep-fire 12h, source='auto_result')
   │              ON CONFLICT (match_id) DO NOTHING
   │            → xoá cache theme:active; emit theme:changed
   │
   ├─► [T+15′] Lấy lại điểm (nhà cung cấp hay điều chỉnh trong 15–60 phút đầu) → emit match:ratings
   │
   └─► [T+60′] Lần cuối → ratings_status = 'final'; chốt is_motm
               → cập nhật players.caps / players.goals; xoá cache /players, /squad/last-match
```

Lịch T+15′ / T+60′ dùng `setTimeout` trong tiến trình và **ghi vào DB** (`matches.ratings_status`): nếu server khởi động lại, lúc khởi động sẽ quét các trận `finished` có `ratings_status <> 'final'` và chạy bù.

### 12.4. Realtime trong trận

```
matchdaySync thấy trận chuyển 'live' → livePoll.job (mỗi LIVE_POLLING_INTERVAL_MS = 12.000ms)
   → gọi Football Data API → so sánh với DB
   → có thay đổi: UPDATE matches + INSERT match_events → emit room match:{id}
   → bàn thắng / thẻ đỏ: FCM push (lọc theo user_settings.notify_goals)
   → trận kết thúc → 12.3
```

App ưu tiên WebSocket; socket mất kết nối quá 20 giây thì chuyển sang polling REST `/matches/:id/live` mỗi 15 giây.

---

## 13. TRIỂN KHAI (DEPLOYMENT)

| Thành phần | Môi trường đề xuất |
|---|---|
| Backend API | Railway / Render / VPS + PM2 sau Nginx. ⚠️ **Chỉ 1 instance chạy cron/livePoll** (biến `CRON_ENABLED=true` ở đúng 1 máy) để không gọi API trùng lặp |
| PostgreSQL | Supabase / Neon / RDS (bật auto-backup hằng ngày) |
| Redis | Upstash / Redis Cloud; nhiều instance thì dùng `@socket.io/redis-adapter` |
| Ảnh đại diện, tài nguyên theme | Supabase Storage / Cloudinary (có CDN) |
| Gửi email OTP | Resend / SendGrid / Amazon SES |
| Mobile build | EAS Build → TestFlight + Google Play Internal Testing |
| CI/CD | GitHub Actions: lint → test → build → deploy |
| Giám sát | Sentry (crash) + Winston/Logtail (log) + uptime check + cảnh báo job thất bại liên tiếp |

Ba môi trường tách biệt: `development` · `staging` · `production`, mỗi môi trường một `.env` và một database riêng.

---

## 14. LỘ TRÌNH PHÁT TRIỂN

| Giai đoạn | Nội dung | Trạng thái |
|---|---|---|
| 1 | Repo, schema `001`, Auth (bcrypt + JWT + secure-store) | ✅ Xong |
| 2 | Trận đấu: lịch, chi tiết, H2H | ✅ Xong |
| 3 | Crawler + cron 01:00 | ✅ Xong |
| 4 | Tab Đội hình & Cầu thủ/HLV | ✅ Xong |
| 5 | Realtime Socket.IO + live polling + push bàn thắng | ✅ Xong |
| 6 | Gemini: dự đoán + cache | ✅ Xong |
| **7** | **Migration `002` + seed**; module `users`, `team`, `themes`, `app` | 🆕 |
| **8** | **Splash có tên app + Giới thiệu đội tuyển**; **thanh tab 5 tab kiểu App Store**; chuyển `index.tsx` → `matches.tsx`, bỏ tab AI | 🆕 |
| **9** | **Tab Trang chủ** (giới thiệu, thành tích, BXH FIFA) | 🆕 |
| **10** | **Thông số sau trận** + **điểm cầu thủ & thẻ trên sơ đồ** (`match_stats`, `player_match_stats`, `finalizeMatch.job`, `RatingBadge`, `CardBadge`) | 🆕 |
| **11** | **`matchdaySync.job` 1 phút/lần** cho trận đấu & đội hình | 🆕 |
| **12** | **Tab Cài đặt**: hồ sơ, ảnh đại diện, đổi/quên mật khẩu, xoá tài khoản, thông báo | 🆕 |
| **13** | **Hệ thống Theme** (sự kiện + Đi bão/Tiếp lửa) + trang admin theme | 🆕 |
| **14** | **Giao diện người lớn tuổi** (token phóng to, 3 tab, đọc to tỷ số) | 🆕 |
| 15 | Kiểm thử (API, socket, giao diện Senior mode), rà soát bảo mật, build EAS và phát hành | 🆕 |
