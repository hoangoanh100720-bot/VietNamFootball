/**
 * ============================================================================
 * SCRIPTS/DEVICES-TEST.MJS — KIỂM THỬ LUỒNG ĐĂNG KÝ THÔNG BÁO
 * ============================================================================
 *
 * Chạy:  node scripts/devices-test.mjs   (server phải đang chạy)
 *
 * Sáu phép thử, mỗi phép kiểm chứng MỘT quyết định thiết kế đã nêu trong
 * devices.service.ts.
 */

const BASE = 'http://127.0.0.1:5000/api/v1';
const EMAIL = 'test@vn.com';
const PASSWORD = 'BongDa2026';

let pass = 0;
let fail = 0;

function check(label, ok, detail = '') {
  console.log(`  ${ok ? '✓' : '✗'} ${label}  ${detail}`);
  ok ? pass++ : fail++;
}

const post = (path, body, token) =>
  fetch(BASE + path, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });

console.log('\n═══ KIỂM THỬ ĐĂNG KÝ THIẾT BỊ NHẬN THÔNG BÁO ═══\n');

const fakeToken = 'ExponentPushToken[' + 'a'.repeat(22) + ']';

// --- 1. Chưa đăng nhập thì phải bị chặn ---
let res = await post('/devices/token', { fcmToken: fakeToken, platform: 'android' });
let json = await res.json();
check('Chưa đăng nhập bị chặn', res.status === 401, `-> ${json.error?.code}`);

// --- 2. Đăng nhập (tạo tài khoản nếu chưa có) ---
res = await post('/auth/login', { email: EMAIL, password: PASSWORD });
json = await res.json();

if (!json.success) {
  res = await post('/auth/register', {
    email: EMAIL,
    password: PASSWORD,
    full_name: 'Nguyen Van A',
  });
  json = await res.json();
}
const accessToken = json.data?.tokens?.accessToken;
check('Đăng nhập lấy được access token', Boolean(accessToken));

// --- 3. Đăng ký thiết bị hợp lệ ---
res = await post('/devices/token', { fcmToken: fakeToken, platform: 'android' }, accessToken);
json = await res.json();
const firstId = json.data?.device?.id;
check(
  'Đăng ký thiết bị thành công',
  res.status === 201 && Boolean(firstId),
  `-> FCM ${json.data?.notifications?.enabled ? 'đã bật' : 'chưa cấu hình (chế độ log)'}`
);

// --- 4. UPSERT: đăng ký lại cùng token phải CẬP NHẬT, không tạo bản ghi mới ---
res = await post('/devices/token', { fcmToken: fakeToken, platform: 'ios' }, accessToken);
json = await res.json();
check(
  'Đăng ký lại cùng token -> cập nhật (không nhân đôi)',
  json.data?.device?.id === firstId,
  `id ${firstId} -> ${json.data?.device?.id}`
);

// --- 5. Danh sách thiết bị KHÔNG được lộ fcm_token ---
res = await fetch(BASE + '/devices', { headers: { Authorization: `Bearer ${accessToken}` } });
json = await res.json();
const firstDevice = json.data?.devices?.[0] ?? {};
check(
  'Danh sách thiết bị không lộ fcm_token',
  !('fcm_token' in firstDevice),
  `${json.data?.devices?.length ?? 0} thiết bị`
);

// --- 6. Token rác phải bị từ chối ---
res = await post('/devices/token', { fcmToken: 'abc', platform: 'android' }, accessToken);
json = await res.json();
check('Token quá ngắn bị từ chối', res.status === 400, `-> ${json.error?.code}`);

// --- 7. Huỷ đăng ký ---
res = await fetch(BASE + '/devices/token', {
  method: 'DELETE',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
  body: JSON.stringify({ fcmToken: fakeToken }),
});
json = await res.json();
check('Huỷ đăng ký thiết bị', json.data?.removed === true);

console.log(`\n═══ KẾT QUẢ: ${pass} đạt, ${fail} lỗi ═══\n`);
process.exit(fail > 0 ? 1 : 0);
