/**
 * ============================================================================
 * MODULES/AUTH/AUTH.SERVICE.TS — NGHIỆP VỤ XÁC THỰC
 * ============================================================================
 *
 * KIẾN TRÚC 3 LỚP mà ta dùng cho MỌI module:
 *
 *   route      -> khai báo đường dẫn, gắn middleware        (mỏng)
 *   controller -> đọc req, gọi service, trả res             (mỏng)
 *   service    -> TOÀN BỘ logic nghiệp vụ + truy vấn DB     (dày)
 *
 * Vì sao tách? Service KHÔNG biết gì về HTTP (không có req/res). Nhờ vậy
 * ta gọi lại được từ cron job, từ socket, từ file test — không chỉ từ API.
 *
 * ----------------------------------------------------------------------------
 * PHẦN 1: BĂM MẬT KHẨU (HASHING)
 *
 * Database KHÔNG BAO GIỜ lưu mật khẩu gốc. Lưu "chuỗi băm":
 *
 *   "matkhau123"  --bcrypt-->  "$2a$12$N9qo8uLOickgx2ZMRZoMy..."
 *
 * Ba tính chất khiến bcrypt an toàn:
 *   1. MỘT CHIỀU  : từ chuỗi băm không tính ngược lại được mật khẩu.
 *   2. CÓ SALT    : mỗi lần băm sinh một chuỗi ngẫu nhiên (salt) trộn vào,
 *                   nên hai người dùng cùng mật khẩu "123456" vẫn cho ra hai
 *                   chuỗi băm KHÁC NHAU -> vô hiệu hoá "bảng tra sẵn"
 *                   (rainbow table) của hacker.
 *   3. CỐ TÌNH CHẬM: cost 12 nghĩa là lặp 2^12 = 4096 vòng, mất ~250ms.
 *                   Người dùng đợi 0,25 giây thì không sao. Nhưng hacker muốn
 *                   thử 1 tỷ mật khẩu thì mất ~8 năm thay vì vài phút.
 *
 * ----------------------------------------------------------------------------
 * PHẦN 2: HAI LOẠI TOKEN
 *
 *   ACCESS TOKEN  (15 phút) : gửi kèm MỌI request. Ngắn hạn để nếu bị lộ thì
 *                             kẻ xấu chỉ dùng được tối đa 15 phút.
 *   REFRESH TOKEN (7 ngày)  : chỉ dùng để xin access token mới. Lưu trong DB
 *                             (dạng hash) nên có thể THU HỒI bất cứ lúc nào.
 *
 * Nhờ cặp đôi này, người dùng không phải đăng nhập lại mỗi 15 phút, mà ta vẫn
 * kiểm soát được phiên đăng nhập.
 * ============================================================================
 */

import crypto from 'node:crypto';
import bcrypt from 'bcryptjs';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '@/config/env';
import { query, withTransaction } from '@/config/database';
import { AppError } from '@/utils/AppError';
import { logger } from '@/utils/logger';
import type { AuthTokens, JwtPayload, PublicUser, User } from '@/types';

// ---------------------------------------------------------------------------
// HÀM PHỤ TRỢ
// ---------------------------------------------------------------------------

/**
 * Băm refresh token bằng SHA-256 trước khi lưu database.
 *
 * Vì sao KHÔNG dùng bcrypt như mật khẩu?
 *   - Mật khẩu do người dùng đặt, thường ngắn và dễ đoán -> cần bcrypt chậm.
 *   - Refresh token do ta sinh ra, dài và ngẫu nhiên hoàn toàn -> đoán bừa là
 *     bất khả thi, chỉ cần SHA-256 nhanh.
 *   - Quan trọng hơn: bcrypt có salt ngẫu nhiên nên KHÔNG tra cứu được
 *     ("WHERE token_hash = ?" sẽ luôn trượt). SHA-256 cho ra kết quả cố định
 *     -> tra cứu bằng chỉ mục, cực nhanh.
 */
function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Bỏ password_hash trước khi trả dữ liệu ra ngoài */
function toPublicUser(user: User): PublicUser {
  const { password_hash: _removed, ...safe } = user;
  return safe;
}

/** Chuyển "15m", "7d" thành số giây */
function parseDuration(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value);
  if (!match) return 900; // mặc định 15 phút
  const amount = Number(match[1]);
  const unitSeconds = { s: 1, m: 60, h: 3600, d: 86400 }[match[2] as 's' | 'm' | 'h' | 'd'];
  return amount * unitSeconds;
}

/** Tạo cặp access + refresh token cho một người dùng */
function signTokens(user: Pick<User, 'id' | 'email' | 'role'>): AuthTokens {
  const payload: JwtPayload = { sub: user.id, email: user.email, role: user.role };

  const accessToken = jwt.sign(payload, env.JWT_SECRET, {
    expiresIn: env.JWT_EXPIRES_IN,
  } as SignOptions);

  // Refresh token dùng KHOÁ BÍ MẬT KHÁC với access token.
  // Nếu một khoá bị lộ, kẻ tấn công cũng không giả mạo được loại token kia.
  const refreshToken = jwt.sign(
    { sub: user.id, jti: crypto.randomUUID() }, // jti = mã định danh duy nhất
    env.JWT_REFRESH_SECRET,
    { expiresIn: env.JWT_REFRESH_EXPIRES_IN } as SignOptions
  );

  return { accessToken, refreshToken, expiresIn: parseDuration(env.JWT_EXPIRES_IN) };
}

/** Lưu refresh token (đã băm) vào database */
async function storeRefreshToken(userId: number, token: string, userAgent?: string) {
  const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN) * 1000);
  await query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
     VALUES ($1, $2, $3, $4)`,
    [userId, hashToken(token), expiresAt, userAgent?.slice(0, 255) ?? null]
  );
}

// ---------------------------------------------------------------------------
// NGHIỆP VỤ CHÍNH
// ---------------------------------------------------------------------------

/**
 * ĐĂNG KÝ
 */
export async function register(input: {
  email: string;
  password: string;
  full_name: string;
  userAgent?: string;
}): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  // Chuẩn hoá email: "  Nam@Gmail.COM " -> "nam@gmail.com"
  // Không làm bước này thì một người đăng ký được nhiều tài khoản trùng nhau.
  const email = input.email.trim().toLowerCase();

  const existing = await query<{ id: number }>('SELECT id FROM users WHERE email = $1', [email]);
  if (existing.rowCount > 0) {
    throw AppError.conflict('Email này đã được đăng ký', 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);

  // Dùng transaction: tạo user và tạo token phải cùng thành công hoặc cùng huỷ
  return withTransaction(async (tx) => {
    const { rows } = await tx.query<User>(
      `INSERT INTO users (email, password_hash, full_name)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [email, passwordHash, input.full_name.trim()]
    );
    const user = rows[0]!;
    const tokens = signTokens(user);

    const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN) * 1000);
    await tx.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [user.id, hashToken(tokens.refreshToken), expiresAt, input.userAgent?.slice(0, 255) ?? null]
    );

    logger.info('Người dùng mới đăng ký', { userId: user.id });
    return { user: toPublicUser(user), tokens };
  });
}

/**
 * ĐĂNG NHẬP
 */
export async function login(input: {
  email: string;
  password: string;
  userAgent?: string;
}): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  const email = input.email.trim().toLowerCase();

  const { rows } = await query<User>('SELECT * FROM users WHERE email = $1', [email]);
  const user = rows[0];

  /**
   * ⚠️ BẢO MẬT: thông báo lỗi PHẢI giống hệt nhau cho hai trường hợp
   * "email không tồn tại" và "sai mật khẩu".
   *
   * Nếu trả "Email không tồn tại", kẻ tấn công có thể dò xem ai đã đăng ký
   * (gọi là user enumeration). Ta chỉ nói chung chung.
   */
  const invalidMessage = 'Email hoặc mật khẩu không đúng';

  if (!user) {
    // Vẫn băm một chuỗi giả để thời gian phản hồi tương đương trường hợp
    // có user. Nếu không, hacker đo thời gian phản hồi cũng đoán được
    // email nào tồn tại (gọi là timing attack).
    await bcrypt.hash(input.password, env.BCRYPT_SALT_ROUNDS);
    throw AppError.unauthorized(invalidMessage);
  }

  const ok = await bcrypt.compare(input.password, user.password_hash);
  if (!ok) throw AppError.unauthorized(invalidMessage);

  const tokens = signTokens(user);
  await storeRefreshToken(user.id, tokens.refreshToken, input.userAgent);

  logger.info('Đăng nhập thành công', { userId: user.id });
  return { user: toPublicUser(user), tokens };
}

/**
 * LÀM MỚI TOKEN (Refresh Token Rotation)
 *
 * "Rotation" = mỗi lần dùng refresh token, ta HUỶ nó và cấp cái mới.
 * Vì sao? Nếu kẻ xấu trộm được refresh token:
 *   - Hắn dùng trước  -> token cũ bị huỷ, người dùng thật bị đăng xuất
 *                        -> phát hiện được bất thường.
 *   - Người dùng dùng trước -> token của hắn thành vô hiệu.
 * Dù thế nào, thiệt hại cũng bị chặn lại.
 */
export async function refresh(
  refreshToken: string,
  userAgent?: string
): Promise<{ user: PublicUser; tokens: AuthTokens }> {
  // Bước 1: chữ ký JWT có hợp lệ và còn hạn không?
  let decoded: { sub: number };
  try {
    decoded = jwt.verify(refreshToken, env.JWT_REFRESH_SECRET) as unknown as { sub: number };
  } catch {
    throw AppError.unauthorized('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại');
  }

  const tokenHash = hashToken(refreshToken);

  // Bước 2: token này có trong database, chưa bị thu hồi, chưa hết hạn?
  const { rows } = await query<{ id: number; user_id: number }>(
    `SELECT id, user_id FROM refresh_tokens
     WHERE token_hash = $1 AND revoked_at IS NULL AND expires_at > NOW()`,
    [tokenHash]
  );
  const stored = rows[0];

  if (!stored) {
    // Chữ ký hợp lệ nhưng DB không có -> token đã bị dùng rồi hoặc đã thu hồi.
    // Đây là dấu hiệu ĐÁNG NGỜ: có thể token bị đánh cắp và tái sử dụng.
    // Biện pháp mạnh tay: thu hồi TẤT CẢ phiên của người dùng này.
    logger.warn('Phát hiện refresh token bị tái sử dụng — thu hồi toàn bộ phiên', {
      userId: decoded.sub,
    });
    await query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = $1 AND revoked_at IS NULL', [
      decoded.sub,
    ]);
    throw AppError.unauthorized('Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại');
  }

  const userRes = await query<User>('SELECT * FROM users WHERE id = $1', [stored.user_id]);
  const user = userRes.rows[0];
  if (!user) throw AppError.unauthorized('Tài khoản không còn tồn tại');

  // Bước 3: huỷ token cũ, cấp cặp token mới
  const tokens = signTokens(user);
  await withTransaction(async (tx) => {
    await tx.query('UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = $1', [stored.id]);
    const expiresAt = new Date(Date.now() + parseDuration(env.JWT_REFRESH_EXPIRES_IN) * 1000);
    await tx.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, expires_at, user_agent)
       VALUES ($1, $2, $3, $4)`,
      [user.id, hashToken(tokens.refreshToken), expiresAt, userAgent?.slice(0, 255) ?? null]
    );
  });

  return { user: toPublicUser(user), tokens };
}

/**
 * ĐĂNG XUẤT — thu hồi refresh token hiện tại
 */
export async function logout(refreshToken: string, userId: number): Promise<void> {
  await query(
    `UPDATE refresh_tokens SET revoked_at = NOW()
     WHERE token_hash = $1 AND user_id = $2 AND revoked_at IS NULL`,
    [hashToken(refreshToken), userId]
  );
  logger.info('Đăng xuất', { userId });
}

/** Lấy hồ sơ người dùng đang đăng nhập */
export async function getProfile(userId: number): Promise<PublicUser> {
  const { rows } = await query<User>('SELECT * FROM users WHERE id = $1', [userId]);
  const user = rows[0];
  if (!user) throw AppError.notFound('Không tìm thấy người dùng');
  return toPublicUser(user);
}

/**
 * Dọn refresh token đã hết hạn — cron job 02:00 sẽ gọi hàm này.
 * Không dọn thì bảng phình to vô hạn.
 */
export async function cleanupExpiredTokens(): Promise<number> {
  const { rowCount } = await query(
    `DELETE FROM refresh_tokens
     WHERE expires_at < NOW() OR (revoked_at IS NOT NULL AND revoked_at < NOW() - INTERVAL '7 days')`
  );
  return rowCount;
}
