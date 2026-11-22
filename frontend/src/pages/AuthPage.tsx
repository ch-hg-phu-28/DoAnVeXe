import { useState, type FormEvent } from 'react';
import { authApi, TOKEN_STORAGE_KEY } from '../api/auth';
import type { UserProfile } from '../types/user';

interface AuthPageProps {
  onSuccess: (user: UserProfile) => void;
}

export function AuthPage({ onSuccess }: AuthPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('khach@example.com');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('Matkhau@123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res =
        mode === 'login'
          ? await authApi.login({ email, password })
          : await authApi.register({ fullName, email, phone, password });

      localStorage.setItem(TOKEN_STORAGE_KEY, res.accessToken);
      onSuccess(res.user);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  }

  function fillSample(sampleEmail: string) {
    setMode('login');
    setEmail(sampleEmail);
    setPassword('Matkhau@123');
    setError(null);
  }

  return (
    <div style={{ maxWidth: 440, margin: '24px auto', padding: 20, border: '1px solid #ddd', borderRadius: 8 }}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
        <button type="button" onClick={() => { setMode('login'); setError(null); }}>
          Đăng nhập
        </button>
        <button type="button" onClick={() => { setMode('register'); setError(null); }}>
          Đăng ký
        </button>
      </div>

      {mode === 'login' && (
        <div style={{ marginBottom: 14, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" onClick={() => fillSample('khach@example.com')}>
            Dùng tài khoản Khách
          </button>
          <button type="button" onClick={() => fillSample('admin@example.com')}>
            Dùng tài khoản Admin
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {mode === 'register' && (
          <>
            <label>
              Họ tên (2–100 ký tự)
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </label>
            <label>
              Số điện thoại (10 số, bắt đầu bằng 0)
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0912345678"
                required
                style={{ width: '100%', padding: 8, marginTop: 4 }}
              />
            </label>
          </>
        )}

        <label>
          Email
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>

        <label>
          Mật khẩu (tối thiểu 8 ký tự)
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: 8, marginTop: 4 }}
          />
        </label>

        {error && <p style={{ color: 'crimson', margin: 0 }}>{error}</p>}

        <button type="submit" disabled={loading} style={{ padding: 10 }}>
          {loading ? 'Đang xử lý...' : mode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
        </button>
      </form>
    </div>
  );
}