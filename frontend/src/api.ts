// Gọi backend. Backend luôn trả { success, data } hoặc { success: false, error: { code, message } }.

/** Địa chỉ API: đặt VITE_API_URL khi backend chạy cổng khác (ví dụ http://localhost:3001/api) */
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';
const TOKEN_KEY = 'access_token';

export class ApiError extends Error {
  code: string;
  status: number;
  details?: unknown;

  constructor(code: string, message: string, status: number, details?: unknown) {
    super(message);
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token: string | null) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* trình duyệt chặn lưu trữ: bỏ qua */
  }
}

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body === undefined ? undefined : JSON.stringify(opts.body),
    });
  } catch {
    throw new ApiError('NETWORK', 'Không kết nối được máy chủ. Kiểm tra backend đã chạy chưa.', 0);
  }

  let json: { success?: boolean; data?: T; error?: { code: string; message: string; details?: unknown } } | null = null;
  try {
    json = await res.json();
  } catch {
    /* phản hồi không phải JSON */
  }
  if (!res.ok || !json?.success) {
    const e = json?.error;
    throw new ApiError(e?.code ?? 'NETWORK', e?.message ?? `Lỗi máy chủ (${res.status})`, res.status, e?.details);
  }
  return json.data as T;
}
