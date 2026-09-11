# KIẾN TRÚC HỆ THỐNG — ỨNG DỤNG ĐỘI TUYỂN BÓNG ĐÁ QUỐC GIA VIỆT NAM

> Tài liệu kiến trúc kỹ thuật (Technical Architecture Document)
> Phiên bản: 1.0 — Cập nhật: 09/09/2026

---

## 1. TỔNG QUAN

Ứng dụng di động cung cấp thông tin chi tiết, tỷ số trực tiếp và nhận định thông minh về Đội tuyển Bóng đá Quốc gia Việt Nam, tích hợp Google Gemini API để phân tích dữ liệu lịch sử và dự đoán tỷ lệ Thắng / Hòa / Thua.

| Thành phần | Công nghệ |
|---|---|
| Mobile (Frontend) | React Native + Expo (TypeScript) |
| Backend API | Node.js + Express |
| Database | PostgreSQL (chính) / Firebase (push + realtime phụ trợ) |
| AI Engine | Google Gemini API (`gemini-2.5-flash` / `gemini-2.5-pro`) |
| Realtime | WebSocket (Socket.IO) + Live Polling fallback 10–15s |
| Job định kỳ | node-cron (01:00 hằng ngày) |
| Cache | Redis (tỷ số live, kết quả AI, rate-limit) |

---

## 2. SƠ ĐỒ KIẾN TRÚC TỔNG THỂ

```
┌───────────────────────────────────────────────────────────────┐
│                    MOBILE APP (Expo / RN)                     │
│  Tab 1: Trận Đấu │ Tab 2: Đội Hình │ Tab 3: Cầu Thủ │ Tab 4: AI│
│  - expo-secure-store (JWT)  - React Query  - Socket.IO Client │
└───────────────┬───────────────────────────┬───────────────────┘
                │ HTTPS (REST /api/v1)      │ WSS (socket)
┌───────────────▼───────────────────────────▼───────────────────┐
│                   BACKEND — Node.js + Express                 │
│  ┌─────────────┐ ┌──────────────┐ ┌──────────────────────┐    │
│  │ Auth Module │ │ Match Module │ │ Squad / Player Module│    │
│  │ bcryptjs+JWT│ │ Live Score   │ │ Coach, Value, H2H    │    │
│  └─────────────┘ └──────────────┘ └──────────────────────┘    │
│  ┌─────────────────────┐ ┌───────────────────────────────┐    │
│  │ AI Prediction Module│ │ Cron Scheduler (node-cron 1AM)│    │
│  │  -> Gemini API      │ │  -> Crawler / Sync dữ liệu tĩnh│   │
│  └─────────────────────┘ └───────────────────────────────┘    │
│  Middleware: helmet · cors · rate-limit · validate · logger   │
└──────┬────────────────┬────────────────┬──────────────────────┘
       │                │                │
┌──────▼──────┐  ┌──────▼──────┐  ┌──────▼─────────────────────┐
│ PostgreSQL  │  │   Redis     │  │ External APIs              │
│ (dữ liệu    │  │ (cache live │  │ • Google Gemini            │
│  bền vững)  │  │  + AI + RL) │  │ • Football Data Provider   │
└─────────────┘  └─────────────┘  │ • Transfermarkt (giá trị)  │
                                  │ • FIFA Ranking             │
                                  │ • Firebase Cloud Messaging │
                                  └────────────────────────────┘
```

---

## 3. KIẾN TRÚC FRONTEND (React Native / Expo)

### 3.1. Cấu trúc thư mục

```
mobile/
├── app/                        # Expo Router (file-based routing)
│   ├── (auth)/
│   │   ├── login.tsx
│   │   └── register.tsx
│   ├── (tabs)/
│   │   ├── _layout.tsx         # Bottom Tab Navigator (4 tab)
│   │   ├── index.tsx           # Tab 1 — Trận Đấu & Live
│   │   ├── squad.tsx           # Tab 2 — Đội Hình
│   │   ├── players.tsx         # Tab 3 — Cầu Thủ & HLV
│   │   └── ai.tsx              # Tab 4 — AI Dự Đoán & BXH
│   ├── match/[id].tsx          # Chi tiết trận + H2H
│   ├── player/[id].tsx         # Chi tiết cầu thủ
│   └── _layout.tsx             # Root layout + AuthProvider
├── src/
│   ├── api/                    # axios instance + endpoints
│   │   ├── client.ts           # baseURL, interceptor gắn JWT, refresh token
│   │   ├── matches.api.ts
│   │   ├── squad.api.ts
│   │   ├── players.api.ts
│   │   └── ai.api.ts
│   ├── components/
│   │   ├── common/             # Button, Card, Loading, ErrorState
│   │   ├── match/              # LiveScoreCard, FixtureItem, H2HTable
│   │   ├── squad/              # FormationPitch (sơ đồ sân), BenchList
│   │   └── ai/                 # PredictionDonut, FifaRankTable
│   ├── hooks/
│   │   ├── useAuth.ts
│   │   ├── useLiveScore.ts     # WebSocket + polling fallback
│   │   └── useCountdown.ts
│   ├── store/                  # Zustand (auth, settings)
│   ├── services/
│   │   ├── secureStore.ts      # expo-secure-store wrapper
│   │   └── socket.ts           # Socket.IO client
│   ├── types/                  # TypeScript interfaces dùng chung
│   ├── theme/                  # màu sắc, typography, spacing
│   └── utils/                  # formatDate, formatCurrency (giá trị €)
├── assets/
├── app.json / eas.json
└── .env                        # biến EXPO_PUBLIC_*
```

### 3.2. Chiến lược dữ liệu phía client

| Loại dữ liệu | Cơ chế | Thời gian sống |
|---|---|---|
| Tỷ số live | WebSocket `score:update`; fallback polling 10–15s | Realtime |
| Lịch thi đấu | React Query, `staleTime` 5 phút | 5 phút |
| Đội hình / Cầu thủ | React Query + AsyncStorage persist | 24 giờ |
| Dự đoán AI | React Query | Đến khi trận bắt đầu |
| BXH FIFA | React Query | 24 giờ |

---

## 4. KIẾN TRÚC BACKEND (Node.js + Express)

### 4.1. Cấu trúc thư mục

```
backend/
├── src/
│   ├── config/
│   │   ├── env.ts              # load & validate biến môi trường
│   │   ├── database.ts         # Pool PostgreSQL / Prisma client
│   │   ├── redis.ts
│   │   └── gemini.ts           # khởi tạo Google Gemini SDK
│   ├── modules/
│   │   ├── auth/               # controller · service · route · validator
│   │   ├── matches/            # fixtures, live, H2H
│   │   ├── squad/              # đội hình, sơ đồ, dự bị, tổng giá trị
│   │   ├── players/            # cầu thủ, HLV, lịch sử CLB
│   │   ├── ai/                 # sinh dự đoán + nhận định
│   │   └── ranking/            # BXH FIFA
│   ├── middlewares/
│   │   ├── auth.middleware.ts      # xác thực JWT
│   │   ├── error.middleware.ts     # xử lý lỗi tập trung
│   │   ├── rateLimit.middleware.ts
│   │   └── validate.middleware.ts  # zod / joi
│   ├── jobs/
│   │   ├── scheduler.ts        # đăng ký toàn bộ cron
│   │   ├── syncSquad.job.ts    # 01:00 — cào đội hình
│   │   ├── syncPlayers.job.ts  # 01:10 — cào cầu thủ & giá trị
│   │   ├── syncFixtures.job.ts # 01:20 — lịch thi đấu
│   │   ├── syncRanking.job.ts  # 01:30 — BXH FIFA
│   │   └── livePoll.job.ts     # chạy khi có trận đang diễn ra
│   ├── services/
│   │   ├── crawler.service.ts  # axios + cheerio
│   │   ├── gemini.service.ts   # build prompt · gọi API · parse JSON
│   │   └── socket.service.ts   # phát sự kiện realtime
│   ├── db/
│   │   ├── migrations/
│   │   └── seeds/
│   ├── utils/                  # logger, apiResponse, cache
│   ├── app.ts
│   └── server.ts               # HTTP + Socket.IO
├── tests/
└── .env
```

### 4.2. Danh sách API chính (`/api/v1`)

| Method | Endpoint | Auth | Mô tả |
|---|---|---|---|
| POST | `/auth/register` | – | Đăng ký (bcryptjs hash + salt) |
| POST | `/auth/login` | – | Đăng nhập → access + refresh token |
| POST | `/auth/refresh` | – | Cấp lại access token |
| POST | `/auth/logout` | ✔ | Thu hồi refresh token |
| GET | `/matches/latest` | – | Trận gần nhất / đang diễn ra |
| GET | `/matches/upcoming` | – | Lịch thi đấu sắp tới (phân trang) |
| GET | `/matches/:id` | – | Chi tiết trận đấu |
| GET | `/matches/:id/live` | – | Tỷ số + sự kiện realtime |
| GET | `/matches/:id/h2h` | – | Lịch sử đối đầu |
| GET | `/squad/current` | – | Đội hình ra sân + dự bị + sơ đồ |
| GET | `/squad/value` | – | Tổng giá trị đội hình |
| GET | `/players` | – | Danh sách cầu thủ |
| GET | `/players/:id` | – | Quê quán, tuổi, chiều cao, vị trí, số áo, giá trị |
| GET | `/players/:id/clubs` | – | Lịch sử thi đấu CLB |
| GET | `/coach` | – | Thông tin HLV trưởng |
| GET | `/ai/predict/:matchId` | – | % Thắng/Hòa/Thua + nhận định |
| GET | `/ranking/fifa` | – | BXH FIFA |
| POST | `/devices/token` | ✔ | Đăng ký FCM token nhận thông báo |

### 4.3. Sự kiện WebSocket

| Sự kiện | Hướng | Payload |
|---|---|---|
| `match:subscribe` | client → server | `{ matchId }` |
| `score:update` | server → client | `{ matchId, home, away, minute }` |
| `match:event` | server → client | `{ type: goal/card/sub, player, minute }` |
| `match:finished` | server → client | `{ matchId, finalScore }` |

---

## 5. THIẾT KẾ CƠ SỞ DỮ LIỆU (PostgreSQL)

```
users(id, email UNIQUE, password_hash, full_name, avatar_url,
      role, created_at, updated_at)

refresh_tokens(id, user_id -> users, token_hash, expires_at, revoked_at)

teams(id, name, country, logo_url, fifa_code)

coaches(id, team_id -> teams, full_name, nationality, birth_date,
        photo_url, start_date, contract_end)

players(id, team_id -> teams, full_name, birth_date, hometown,
        height_cm, weight_kg, position, shirt_number,
        market_value_eur, photo_url, caps, goals, updated_at)

player_clubs(id, player_id -> players, club_name, club_logo,
             from_date, to_date, apps, goals)

matches(id, competition, home_team_id -> teams, away_team_id -> teams,
        kickoff_at, venue, status[scheduled|live|finished],
        home_score, away_score, minute, round, updated_at)

match_events(id, match_id -> matches, minute, type, player_id -> players,
             detail)

lineups(id, match_id -> matches, team_id -> teams, formation, updated_at)

lineup_players(id, lineup_id -> lineups, player_id -> players,
               is_starting, position_x, position_y, shirt_number)

h2h_records(id, team_a_id, team_b_id, match_id -> matches, result, played_at)

ai_predictions(id, match_id -> matches UNIQUE, win_pct, draw_pct,
               lose_pct, analysis_text, model_version,
               generated_at, expires_at)

fifa_rankings(id, team_id -> teams, rank, points, snapshot_date)

device_tokens(id, user_id -> users, fcm_token, platform, created_at)
```

**Index quan trọng:** `matches(kickoff_at)`, `matches(status)`, `players(team_id)`, `ai_predictions(match_id)`, `fifa_rankings(snapshot_date)`.

---

## 6. TÍCH HỢP AI — GOOGLE GEMINI

### 6.1. Luồng xử lý

```
Client GET /ai/predict/:matchId
        │
        ▼
 Redis cache hit? ──yes──► Trả kết quả (TTL 6h hoặc tới giờ bóng lăn)
        │ no
        ▼
 Truy vấn PostgreSQL:
   • Phong độ 5–10 trận gần nhất của 2 đội
   • Lịch sử đối đầu (H2H)
   • Đội hình dự kiến, chấn thương, treo giò
   • BXH FIFA & chênh lệch điểm
   • Sân nhà/sân khách, tính chất giải đấu
        │
        ▼
 gemini.service.buildPrompt() -> gọi Gemini API
   (responseMimeType: application/json + responseSchema)
        │
        ▼
 Parse & validate JSON -> tổng % phải bằng 100
        │
        ▼
 Lưu bảng ai_predictions + set Redis cache -> trả về client
```

### 6.2. Schema kết quả AI

```json
{
  "win_pct": 45,
  "draw_pct": 30,
  "lose_pct": 25,
  "analysis_text": "Đoạn nhận định chuyên sâu 150-250 từ...",
  "key_factors": ["Lợi thế sân nhà", "Vắng trụ cột hàng thủ"],
  "predicted_score": "2-1",
  "confidence": "medium"
}
```

### 6.3. Nguyên tắc an toàn & chi phí

- API key **chỉ nằm ở backend**, không bao giờ gửi xuống app.
- Rate limit riêng cho nhóm endpoint `/ai/*` (mặc định 20 request/giờ/user).
- Cache kết quả để tránh gọi lại Gemini cho cùng một trận.
- Retry tối đa 3 lần với exponential backoff; nếu thất bại trả bản dự đoán cũ (nếu có).
- Ghi `model_version` để truy vết chất lượng dự đoán theo từng phiên bản model.

---

## 7. BẢO MẬT

| Lớp | Biện pháp |
|---|---|
| Mật khẩu | `bcryptjs` hash kèm salt (cost 10–12), không lưu plaintext |
| Phiên đăng nhập | `jsonwebtoken` — Access token 15 phút, Refresh token 7 ngày (lưu hash trong DB, có thể thu hồi) |
| Lưu trữ trên máy | `expo-secure-store` (Keychain iOS / Keystore Android) — không dùng AsyncStorage cho token |
| Truyền tải | HTTPS bắt buộc; WSS cho socket |
| HTTP headers | `helmet` |
| CORS | Whitelist domain qua biến môi trường |
| Chống brute-force | `express-rate-limit` — 5 lần đăng nhập sai / 15 phút / IP |
| Validate input | `zod` ở mọi route; chặn SQL Injection bằng parameterized query |
| Secrets | Toàn bộ trong `.env`, `.env` nằm trong `.gitignore` |
| Logging | `winston` — không log mật khẩu, token, API key |

---

## 8. LUỒNG CẬP NHẬT DỮ LIỆU

### 8.1. Dữ liệu tĩnh — Cron Job (node-cron)

| Thời điểm | Job | Nội dung |
|---|---|---|
| 01:00 | `syncSquad` | Đội hình, sơ đồ chiến thuật, danh sách dự bị |
| 01:10 | `syncPlayers` | Thông số cầu thủ, giá trị chuyển nhượng, lịch sử CLB |
| 01:20 | `syncFixtures` | Lịch thi đấu sắp tới, kết quả trận đã đấu |
| 01:30 | `syncRanking` | BXH FIFA |
| 02:00 | `cleanup` | Xoá refresh token hết hạn, dọn cache cũ |

Mỗi job ghi log trạng thái (`success`/`fail`, số bản ghi), retry 3 lần, gửi cảnh báo nếu thất bại liên tiếp. Múi giờ cố định `Asia/Ho_Chi_Minh`.

### 8.2. Dữ liệu Realtime

```
Trận đấu chuyển sang status = live
        │
        ▼
livePoll.job kích hoạt (setInterval 10–15s)
        │
   Gọi Football Data API -> so sánh với DB
        │
   Có thay đổi? ──► UPDATE matches + INSERT match_events
        │                    │
        │                    ▼
        │        Socket.IO emit tới room match:{id}
        │                    │
        │                    ▼
        │        FCM push khi có bàn thắng
        ▼
Trận kết thúc -> dừng polling, emit match:finished
```

App phía client ưu tiên WebSocket; nếu socket mất kết nối quá 20s sẽ tự chuyển sang polling REST `/matches/:id/live` mỗi 15s.

---

## 9. TRIỂN KHAI (DEPLOYMENT)

| Thành phần | Môi trường đề xuất |
|---|---|
| Backend API | Railway / Render / VPS + PM2, sau Nginx reverse proxy |
| PostgreSQL | Supabase / Neon / RDS (bật auto-backup hằng ngày) |
| Redis | Upstash / Redis Cloud |
| Mobile build | EAS Build → TestFlight (iOS) + Google Play Internal Testing |
| CI/CD | GitHub Actions: lint → test → build → deploy |
| Giám sát | Sentry (crash) + Winston/Logtail (log) + uptime check |

Ba môi trường tách biệt: `development` · `staging` · `production`, mỗi môi trường một bộ `.env` và một database riêng.

---

## 10. LỘ TRÌNH PHÁT TRIỂN GỢI Ý

| Giai đoạn | Nội dung |
|---|---|
| 1 | Khởi tạo repo, schema DB, module Auth (bcryptjs + JWT + secure-store) |
| 2 | Tab Trận Đấu: lịch thi đấu, chi tiết, H2H (dữ liệu tĩnh) |
| 3 | Crawler + Cron Job 01:00 cho đội hình, cầu thủ, BXH |
| 4 | Tab Đội Hình & Tab Cầu Thủ/HLV |
| 5 | Realtime: Socket.IO + live polling + push thông báo bàn thắng |
| 6 | Tích hợp Gemini: dự đoán %, nhận định chuyên sâu, cache |
| 7 | Tối ưu, kiểm thử, rà soát bảo mật, build EAS và phát hành |
