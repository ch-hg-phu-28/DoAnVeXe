import { useState, type FormEvent } from 'react';
import { authApi } from '../api/auth';
import { EyeIcon, LogoMark } from '../components/ui';

/** F02: trang mở từ đường dẫn trong email, dạng /dat-lai-mat-khau?token=... */
export function ResetPasswordPage({ onDone }: { onDone: () => void }) {
  const token = new URLSearchParams(window.location.search).get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) return setError('Mật khẩu tối thiểu 8 ký tự');
    if (password !== confirm) return setError('Hai lần nhập mật khẩu không khớp');
    setLoading(true);
    try {
      const res = await authApi.resetPassword({ token, password });
      setDone(res.message || 'Đã đặt mật khẩu mới. Bạn có thể đăng nhập.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Không đặt lại được mật khẩu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth auth-single">
      <main className="auth-main">
        <div className="auth-card">
          <div className="brand brand-dark">
            <LogoMark />
            Đặt vé xe
          </div>
          <div>
            <h2>Đặt lại mật khẩu</h2>
            <p className="sub">Đường dẫn chỉ dùng được 1 lần và có hạn 30 phút.</p>
          </div>

          {!token ? (
            <p className="alert alert-error" role="alert">
              Đường dẫn không có mã đặt lại mật khẩu. Hãy mở lại đường dẫn trong email hoặc gửi yêu cầu mới.
            </p>
          ) : done ? (
            <p className="alert alert-ok" role="status">
              {done}
            </p>
          ) : (
            <form className="form" onSubmit={handleSubmit}>
              <div className="field">
                <label htmlFor="rs-password">
                  Mật khẩu mới<small>tối thiểu 8 ký tự</small>
                </label>
                <div className="input-wrap">
                  <input
                    id="rs-password"
                    className="input"
                    type={showPw ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button type="button" className="input-toggle" aria-label={showPw ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'} onClick={() => setShowPw((v) => !v)}>
                    <EyeIcon off={showPw} />
                  </button>
                </div>
              </div>
              <div className="field">
                <label htmlFor="rs-confirm">Nhập lại mật khẩu mới</label>
                <input
                  id="rs-confirm"
                  className="input"
                  type={showPw ? 'text' : 'password'}
                  autoComplete="new-password"
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  required
                />
              </div>
              {error && (
                <p className="alert alert-error" role="alert">
                  {error}
                </p>
              )}
              <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
                {loading ? 'Đang lưu…' : 'Đặt mật khẩu mới'}
              </button>
            </form>
          )}

          <button type="button" className="btn btn-ghost btn-block" onClick={onDone}>
            Về trang đăng nhập
          </button>
        </div>
      </main>
    </div>
  );
}
