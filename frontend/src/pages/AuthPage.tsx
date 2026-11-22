import { useState, type FormEvent } from 'react';
import { authApi, TOKEN_STORAGE_KEY } from '../api/auth';
import { EyeIcon, LogoMark } from '../components/ui';
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
  const [showPw, setShowPw] = useState(false);
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

  const isLogin = mode === 'login';

  return (
    <div className="auth">
      <aside className="auth-side">
        <div className="brand">
          <LogoMark />
          Đặt vé xe
        </div>

        <div className="auth-pitch">
          <h1>Chọn ghế, giữ chỗ, đi ngay.</h1>
          <p>Tìm chuyến xe khách, giữ ghế trong vài phút và nhận vé điện tử qua email.</p>

          <div className="ticket" aria-hidden="true">
            <div className="ticket-main">
              <div className="ticket-route">
                <span>TP. Hồ Chí Minh</span>
                <span>→</span>
                <span>Đà Lạt</span>
              </div>
              <div className="ticket-meta">
                <span>
                  Khởi hành<b>22:30</b>
                </span>
                <span>
                  Ngày<b>22/11</b>
                </span>
                <span>
                  Loại xe<b>Giường nằm</b>
                </span>
              </div>
            </div>
            <div className="ticket-stub">
              <div>
                Ghế<b>A12</b>
              </div>
            </div>
          </div>
        </div>

        <div className="road" aria-hidden="true" />
      </aside>

      <main className="auth-main">
        <div className="auth-card">
          <div>
            <h2>{isLogin ? 'Chào mừng trở lại' : 'Tạo tài khoản mới'}</h2>
            <p className="sub">
              {isLogin ? 'Đăng nhập để xem và quản lý vé của bạn.' : 'Chỉ mất một phút để bắt đầu đặt vé.'}
            </p>
          </div>

          <div className="seg" role="tablist" aria-label="Chế độ">
            <button
              type="button"
              role="tab"
              aria-selected={isLogin}
              onClick={() => {
                setMode('login');
                setError(null);
              }}
            >
              Đăng nhập
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={!isLogin}
              onClick={() => {
                setMode('register');
                setError(null);
              }}
            >
              Đăng ký
            </button>
          </div>

          {isLogin && (
            <div className="chips">
              <span>Dùng thử:</span>
              <button type="button" className="chip" onClick={() => fillSample('khach@example.com')}>
                Khách hàng
              </button>
              <button type="button" className="chip" onClick={() => fillSample('admin@example.com')}>
                Quản trị viên
              </button>
            </div>
          )}

          <form className="form" onSubmit={handleSubmit}>
            {!isLogin && (
              <>
                <div className="field">
                  <label htmlFor="fullName">
                    Họ tên<small>2–100 ký tự</small>
                  </label>
                  <input
                    id="fullName"
                    className="input"
                    type="text"
                    autoComplete="name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="phone">
                    Số điện thoại<small>10 số, bắt đầu bằng 0</small>
                  </label>
                  <input
                    id="phone"
                    className="input"
                    type="tel"
                    autoComplete="tel"
                    placeholder="0912345678"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </>
            )}

            <div className="field">
              <label htmlFor="email">Email</label>
              <input
                id="email"
                className="input"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="field">
              <label htmlFor="password">
                Mật khẩu<small>tối thiểu 8 ký tự</small>
              </label>
              <div className="input-wrap">
                <input
                  id="password"
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  autoComplete={isLogin ? 'current-password' : 'new-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="input-toggle"
                  aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                  onClick={() => setShowPw((v) => !v)}
                >
                  <EyeIcon off={showPw} />
                </button>
              </div>
            </div>

            {error && (
              <p className="alert alert-error" role="alert">
                {error}
              </p>
            )}

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Đang xử lý…' : isLogin ? 'Đăng nhập' : 'Tạo tài khoản'}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
