const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

interface ApiEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
}

export async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('access_token');

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const rawText = await response.text();
  let parsed: unknown = null;

  if (rawText) {
    try {
      parsed = JSON.parse(rawText);
    } catch {
      parsed = rawText;
    }
  }

  if (!response.ok) {
    if (parsed && typeof parsed === 'object') {
      const errObj = parsed as {
        message?: string | string[];
        error?: { message?: string; code?: string };
      };
      const msg =
        errObj.error?.message ||
        (Array.isArray(errObj.message) ? errObj.message.join(', ') : errObj.message) ||
        `HTTP Error ${response.status}`;
      throw new Error(msg);
    }
    throw new Error(
      typeof parsed === 'string' && parsed ? parsed : `HTTP Error ${response.status}`
    );
  }

  if (parsed && typeof parsed === 'object' && 'data' in parsed) {
    return (parsed as ApiEnvelope<T>).data as T;
  }

  return parsed as T;
}