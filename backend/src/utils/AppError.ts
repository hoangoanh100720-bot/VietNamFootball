/**
 * ============================================================================
 * UTILS/APPERROR.TS — LỚP LỖI CÓ CHỦ ĐÍCH
 * ============================================================================
 *
 * Phân biệt 2 loại lỗi:
 *   1. Lỗi CÓ CHỦ ĐÍCH (operational): "email đã tồn tại", "không tìm thấy trận"
 *      -> ta chủ động ném ra, biết trước, trả về cho client thông báo rõ ràng.
 *   2. Lỗi BẤT NGỜ (programmer error): đọc thuộc tính của undefined, DB sập...
 *      -> KHÔNG được để lộ chi tiết ra ngoài (hacker đọc được cấu trúc hệ thống).
 *
 * AppError đại diện cho loại 1. Middleware xử lý lỗi sẽ dựa vào cờ
 * isOperational để quyết định trả thông báo thật hay câu chung chung.
 */

export class AppError extends Error {
  public readonly statusCode: number;   // Mã HTTP: 400, 401, 404, 409...
  public readonly code: string;         // Mã nội bộ: EMAIL_TAKEN — app mobile dựa vào đây
  public readonly isOperational: boolean;
  public readonly details?: unknown;    // Chi tiết thêm (vd: danh sách trường sai)

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message);
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = true;
    this.details = details;
    Error.captureStackTrace(this, this.constructor);
  }

  // ----- Các lối tắt cho những lỗi hay gặp -----

  /** 400 — client gửi dữ liệu sai */
  static badRequest(message: string, details?: unknown) {
    return new AppError(400, 'BAD_REQUEST', message, details);
  }
  /** 401 — chưa đăng nhập / token hỏng */
  static unauthorized(message = 'Bạn cần đăng nhập để tiếp tục') {
    return new AppError(401, 'UNAUTHORIZED', message);
  }
  /** 403 — đã đăng nhập nhưng không đủ quyền */
  static forbidden(message = 'Bạn không có quyền thực hiện thao tác này') {
    return new AppError(403, 'FORBIDDEN', message);
  }
  /** 404 — không tìm thấy tài nguyên */
  static notFound(message = 'Không tìm thấy dữ liệu') {
    return new AppError(404, 'NOT_FOUND', message);
  }
  /** 409 — xung đột dữ liệu (email trùng, đăng ký 2 lần) */
  static conflict(message: string, code = 'CONFLICT') {
    return new AppError(409, code, message);
  }
  /** 422 — đúng định dạng nhưng sai nghiệp vụ */
  static unprocessable(message: string, details?: unknown) {
    return new AppError(422, 'UNPROCESSABLE', message, details);
  }
  /**
   * 429 — vượt hạn mức sử dụng.
   *
   * Khác với rate limit theo IP (do middleware lo): mã này dành cho hạn mức
   * theo TÀI KHOẢN, ví dụ số token AI mỗi người mỗi ngày.
   *
   * 💡 App nên hiển thị thông điệp này NGUYÊN VĂN cho người dùng — nó nói rõ
   * khi nào họ dùng lại được, thay vì một dòng "lỗi 429" vô nghĩa.
   */
  static tooManyRequests(message = 'Bạn đã dùng hết lượt cho phép, vui lòng thử lại sau') {
    return new AppError(429, 'TOO_MANY_REQUESTS', message);
  }

  /** 503 — dịch vụ ngoài (Gemini, Football API) đang lỗi */
  static serviceUnavailable(message = 'Dịch vụ tạm thời không khả dụng') {
    return new AppError(503, 'SERVICE_UNAVAILABLE', message);
  }
}
