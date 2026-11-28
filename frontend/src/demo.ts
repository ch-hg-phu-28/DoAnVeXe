/**
 * Gợi ý tài khoản mẫu chỉ hiện khi mở web trên chính máy chạy (localhost).
 * Mở qua đường hầm/tên miền khác thì ẩn, để không lộ mật khẩu mẫu (kể cả tài khoản quản trị).
 */
export const SHOW_DEMO_ACCOUNTS = typeof window !== 'undefined' && ['localhost', '127.0.0.1'].includes(window.location.hostname);
