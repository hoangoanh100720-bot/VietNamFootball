#!/usr/bin/env bash
# ============================================================================
# DEPLOY.SH — DỰNG ĐỒ ÁN LÊN VPS, CHẠY SONG SONG VỚI WEB SẴN CÓ
# ============================================================================
#
# Dùng: bash /var/www/bongda/deploy.sh
#
# Script này CHỈ THÊM, không sửa bất cứ file nào của website đang chạy.
# Mọi bước đụng tới nginx đều kiểm tra cú pháp trước khi nạp lại — sai là
# dừng ngay chứ không nạp, vì nạp nginx lỗi sẽ làm SẬP CẢ web đang chạy.
# ============================================================================

set -euo pipefail

DOMAIN="bongda.oanh.online"
APP_DIR="/var/www/bongda"
PM2_NAME="bongda-api"
NGINX_CONF="/etc/nginx/sites-available/$DOMAIN"

say()  { printf '\n\033[1;36m==> %s\033[0m\n' "$1"; }
ok()   { printf '\033[1;32m    OK: %s\033[0m\n' "$1"; }
die()  { printf '\n\033[1;31m!!! DỪNG: %s\033[0m\n\n' "$1" >&2; exit 1; }

# ---------------------------------------------------------------------------
# 1. KIỂM TRA ĐIỀU KIỆN
# ---------------------------------------------------------------------------
say "1/8  Kiểm tra điều kiện"

[ -f "$APP_DIR/backend/dist/server.js" ] || die "Không thấy $APP_DIR/backend/dist/server.js — bạn đã git clone đúng chỗ chưa?"
[ -f "$APP_DIR/mobile/dist/index.html" ] || die "Không thấy $APP_DIR/mobile/dist/index.html — bản web chưa được đẩy lên git."
command -v node >/dev/null || die "Chưa cài Node.js. Chạy: curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash - && sudo apt install -y nodejs"
command -v nginx >/dev/null || die "Chưa cài nginx."
ok "Node $(node -v), nginx có sẵn, mã nguồn đầy đủ"

# Nhớ lại web cũ đang trả gì, để cuối script so sánh xem có làm hỏng không
OLD_SITE_BEFORE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://oanh.online || echo "000")
ok "Web hiện có đang trả mã $OLD_SITE_BEFORE (sẽ kiểm tra lại ở cuối)"

# ---------------------------------------------------------------------------
# 2. CHỌN CỔNG CÒN TRỐNG
# ---------------------------------------------------------------------------
say "2/8  Tìm cổng còn trống cho backend"

PORT=""
for p in 5050 5060 5070 5080; do
  if ! ss -tln 2>/dev/null | grep -q ":$p "; then PORT=$p; break; fi
done
[ -n "$PORT" ] || die "Cả 5050/5060/5070/5080 đều bận. Báo lại để chọn cổng khác."
ok "Dùng cổng $PORT"

# ---------------------------------------------------------------------------
# 3. CÀI THƯ VIỆN
# ---------------------------------------------------------------------------
say "3/8  Cài thư viện backend (1-3 phút)"

cd "$APP_DIR/backend"
npm install --omit=dev --no-audit --no-fund
ok "Đã cài xong"

# ---------------------------------------------------------------------------
# 4. TẠO FILE .ENV
# ---------------------------------------------------------------------------
say "4/8  Tạo file cấu hình .env"

if [ -f "$APP_DIR/backend/.env" ]; then
  ok "Đã có .env từ trước — giữ nguyên, không ghi đè"
else
  [ -f "$APP_DIR/.env.example" ] || die "Không thấy .env.example trong repo."
  cp "$APP_DIR/.env.example" "$APP_DIR/backend/.env"

  JWT1=$(openssl rand -hex 64)
  JWT2=$(openssl rand -hex 64)

  sed -i \
    -e "s|^NODE_ENV=.*|NODE_ENV=production|" \
    -e "s|^PORT=.*|PORT=$PORT|" \
    -e "s|^DB_DRIVER=.*|DB_DRIVER=pglite|" \
    -e "s|^PGLITE_DATA_DIR=.*|PGLITE_DATA_DIR=./data/pgdata|" \
    -e "s|^CORS_ORIGIN=.*|CORS_ORIGIN=https://$DOMAIN|" \
    -e "s|^SOCKET_CORS_ORIGIN=.*|SOCKET_CORS_ORIGIN=https://$DOMAIN|" \
    -e "s|^JWT_SECRET=.*|JWT_SECRET=$JWT1|" \
    -e "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=$JWT2|" \
    "$APP_DIR/backend/.env"

  chmod 600 "$APP_DIR/backend/.env"
  ok "Đã tạo .env, sinh mới 2 khóa JWT, đặt quyền 600 (chỉ bạn đọc được)"

  printf '\n    Dán GEMINI_API_KEY vào đây (bỏ trống rồi Enter nếu muốn điền sau): '
  read -r GKEY || GKEY=""
  if [ -n "$GKEY" ]; then
    sed -i "s|^GEMINI_API_KEY=.*|GEMINI_API_KEY=$GKEY|" "$APP_DIR/backend/.env"
    ok "Đã ghi GEMINI_API_KEY"
  else
    ok "Bỏ qua — trợ lý AI sẽ chạy bằng mô hình thống kê dự phòng"
  fi
fi

# ---------------------------------------------------------------------------
# 5. CHẠY BACKEND BẰNG PM2
# ---------------------------------------------------------------------------
say "5/8  Khởi động backend"

command -v pm2 >/dev/null || sudo npm install -g pm2

cd "$APP_DIR/backend"
pm2 delete "$PM2_NAME" 2>/dev/null || true
pm2 start dist/server.js --name "$PM2_NAME"
pm2 save

printf '    Chờ backend khởi động'
for i in $(seq 1 15); do
  printf '.'
  if curl -sf "http://localhost:$PORT/health" >/dev/null 2>&1; then break; fi
  sleep 2
done
printf '\n'

curl -sf "http://localhost:$PORT/health" >/dev/null \
  || die "Backend không phản hồi. Xem lỗi bằng: pm2 logs $PM2_NAME --lines 50"
ok "Backend sống ở cổng $PORT"

# ---------------------------------------------------------------------------
# 6. CẤU HÌNH NGINX
# ---------------------------------------------------------------------------
say "6/8  Tạo cấu hình nginx cho $DOMAIN"

sudo cp -r /etc/nginx/sites-available "$HOME/nginx-backup-$(date +%F-%H%M)"
ok "Đã sao lưu cấu hình nginx vào $HOME/nginx-backup-*"

if grep -rqs "server_name.*$DOMAIN" /etc/nginx/sites-enabled/ 2>/dev/null; then
  ok "Đã có site $DOMAIN từ trước — giữ nguyên cấu hình"
else
  sudo tee "$NGINX_CONF" >/dev/null <<NGINXCONF
server {
    listen 80;
    server_name $DOMAIN;

    root $APP_DIR/mobile/dist;
    index index.html;

    location /api/ {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }

    location /socket.io/ {
        proxy_pass http://127.0.0.1:$PORT;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
    }

    location / {
        try_files \$uri \$uri/ /index.html;
    }
}
NGINXCONF

  sudo ln -sf "$NGINX_CONF" /etc/nginx/sites-enabled/
  ok "Đã tạo $NGINX_CONF"
fi

# ---------------------------------------------------------------------------
# 7. KIỂM TRA CÚ PHÁP RỒI MỚI NẠP — BƯỚC QUAN TRỌNG NHẤT
# ---------------------------------------------------------------------------
say "7/8  Kiểm tra cú pháp nginx trước khi nạp"

if ! sudo nginx -t; then
  sudo rm -f /etc/nginx/sites-enabled/"$DOMAIN"
  die "Cấu hình nginx sai — ĐÃ TỰ GỠ BỎ, web cũ không bị ảnh hưởng. Gửi lỗi ở trên cho mình."
fi
ok "Cú pháp hợp lệ"

sudo systemctl reload nginx
ok "Đã nạp lại nginx"

# ---------------------------------------------------------------------------
# 8. NGHIỆM THU
# ---------------------------------------------------------------------------
say "8/8  Kiểm tra kết quả"

OLD_SITE_AFTER=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 http://oanh.online || echo "000")
NEW_SITE=$(curl -s -o /dev/null -w '%{http_code}' --max-time 10 "http://$DOMAIN" || echo "000")
API_PING=$(curl -s --max-time 10 "http://$DOMAIN/api/v1/ping" || echo "")

printf '\n'
printf '    Web cũ oanh.online      : %s -> %s\n' "$OLD_SITE_BEFORE" "$OLD_SITE_AFTER"
printf '    Đồ án %s : %s\n' "$DOMAIN" "$NEW_SITE"
printf '    API ping                : %s\n' "${API_PING:0:60}"
printf '\n'

if [ "$OLD_SITE_BEFORE" != "$OLD_SITE_AFTER" ]; then
  printf '\033[1;31m!!! CẢNH BÁO: web cũ đổi mã trả về. Khôi phục bằng:\n'
  printf '    sudo rm /etc/nginx/sites-enabled/%s && sudo systemctl reload nginx\033[0m\n\n' "$DOMAIN"
  exit 1
fi

case "$API_PING" in
  *pong*) ok "API trả lời đúng" ;;
  *)      die "API chưa trả lời. Xem: pm2 logs $PM2_NAME --lines 50" ;;
esac

printf '\n\033[1;32m========================================\n'
printf '  XONG. Còn đúng 1 lệnh cuối — bật HTTPS:\n\n'
printf '  sudo certbot --nginx -d %s\n\n' "$DOMAIN"
printf '  (chỉ -d %s, ĐỪNG thêm -d oanh.online)\n' "$DOMAIN"
printf '========================================\033[0m\n\n'
