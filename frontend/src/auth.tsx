import { SHOW_DEMO_ACCOUNTS } from './demo';
import { CarOutlined, LockOutlined, MailOutlined } from '@ant-design/icons';
import { Alert, Form, Input, Modal, Tabs } from 'antd';
import { message } from './notify';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ApiError, api, getToken, setToken } from './api';
import type { User } from './types';

interface AuthCtx {
  user: User | null;
  ready: boolean;
  logout: () => void;
  /** Trả về true nếu đã đăng nhập; nếu chưa thì mở hộp đăng nhập, đăng nhập xong sẽ gọi `then` */
  requireLogin: (then?: () => void) => boolean;
  openLogin: () => void;
  /** Tải lại thông tin người dùng sau khi sửa hồ sơ */
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx | null>(null);

export const useAuth = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth phải nằm trong AuthProvider');
  return c;
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [open, setOpen] = useState(false);
  const pending = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!getToken()) {
      setReady(true);
      return;
    }
    api<User>('/auth/me')
      .then(setUser)
      .catch(() => setToken(null))
      .finally(() => setReady(true));
  }, []);

  const onLoggedIn = (u: User, token: string) => {
    setToken(token);
    setUser(u);
    setOpen(false);
    message.success(`Xin chào ${u.fullName}`);
    const fn = pending.current;
    pending.current = null;
    fn?.();
  };

  const requireLogin = useCallback(
    (then?: () => void) => {
      if (user) return true;
      pending.current = then ?? null;
      setOpen(true);
      return false;
    },
    [user],
  );

  const logout = () => {
    setToken(null);
    setUser(null);
    message.info('Đã đăng xuất');
  };

  return (
    <Ctx.Provider value={{ user, ready, logout, requireLogin, openLogin: () => setOpen(true), refresh: () => api<User>('/auth/me').then(setUser) }}>
      {children}
      <LoginModal open={open} onClose={() => setOpen(false)} onLoggedIn={onLoggedIn} />
    </Ctx.Provider>
  );
}

function LoginModal({ open, onClose, onLoggedIn }: { open: boolean; onClose: () => void; onLoggedIn: (u: User, t: string) => void }) {
  const [tab, setTab] = useState('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (path: string, values: Record<string, string>) => {
    setLoading(true);
    setError(null);
    try {
      const r = await api<{ accessToken: string; user: User }>(path, { method: 'POST', body: values });
      onLoggedIn(r.user, r.accessToken);
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onCancel={onClose} footer={null} width={460} destroyOnHidden className="auth-modal" title={null}>
      <div className="auth-head">
        <span className="ph-icon">
          <CarOutlined />
        </span>
        <h2>
          Chào mừng bạn đến với <span>ĐặtVéXe</span>
        </h2>
        <p className="muted">Đăng nhập để quản lý vé và đặt vé nhanh hơn.</p>
      </div>
      <Tabs
        className="auth-tabs"
        centered
        activeKey={tab}
        onChange={(k) => {
          setTab(k);
          setError(null);
        }}
        items={[
          {
            key: 'login',
            label: 'Đăng nhập',
            children: (
              <Form layout="vertical" onFinish={(v) => submit('/auth/login', v)} requiredMark={false}>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
                  <Input id="login-email" autoComplete="email" size="large" prefix={<MailOutlined />} placeholder="ten@email.com" />
                </Form.Item>
                <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, message: 'Nhập mật khẩu' }]}>
                  <Input.Password id="login-password" autoComplete="current-password" size="large" prefix={<LockOutlined />} placeholder="Nhập mật khẩu" />
                </Form.Item>
                {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
                <button className="btn-primary btn-block" type="submit" disabled={loading}>
                  {loading ? 'Đang đăng nhập…' : 'Đăng nhập'}
                </button>
                <p className="hint">
                  <Link to="/quen-mat-khau" onClick={onClose}>
                    Quên mật khẩu?
                  </Link>
                </p>
                {SHOW_DEMO_ACCOUNTS && <p className="hint">Tài khoản mẫu (mật khẩu Matkhau@123): khach@example.com · staff@example.com · admin@example.com</p>}
              </Form>
            ),
          },
          {
            key: 'register',
            label: 'Đăng ký',
            children: (
              <Form layout="vertical" onFinish={(v) => submit('/auth/register', v)} requiredMark={false}>
                <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}>
                  <Input id="reg-name" autoComplete="name" />
                </Form.Item>
                <Form.Item name="email" label="Email" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
                  <Input id="reg-email" autoComplete="email" />
                </Form.Item>
                <Form.Item
                  name="phone"
                  label="Số điện thoại"
                  rules={[{ required: true, pattern: /^0\d{9}$/, message: 'Gồm 10 số, bắt đầu bằng 0' }]}
                >
                  <Input id="reg-phone" autoComplete="tel" />
                </Form.Item>
                <Form.Item name="password" label="Mật khẩu" rules={[{ required: true, min: 8, message: 'Tối thiểu 8 ký tự' }]}>
                  <Input.Password id="reg-password" autoComplete="new-password" />
                </Form.Item>
                {error && <Alert type="error" message={error} showIcon style={{ marginBottom: 12 }} />}
                <button className="btn-primary btn-block" type="submit" disabled={loading}>
                  {loading ? 'Đang tạo tài khoản…' : 'Tạo tài khoản'}
                </button>
              </Form>
            ),
          },
        ]}
      />
    </Modal>
  );
}
