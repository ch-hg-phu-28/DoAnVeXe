import { useEffect, useState } from 'react';
import { authApi, TOKEN_STORAGE_KEY } from './api/auth';
import { Avatar, LogoMark } from './components/ui';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AuthPage } from './pages/AuthPage';
import { PassengersPage } from './pages/PassengersPage';
import { ProfilePage } from './pages/ProfilePage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { ROLE_LABEL, type UserProfile } from './types/user';

type Tab = 'profile' | 'passengers' | 'admin';

/** Đường dẫn trong email quên mật khẩu (F02) */
const RESET_PATH = '/dat-lai-mat-khau';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [booting, setBooting] = useState(true);
  const [resetting, setResetting] = useState(() => window.location.pathname === RESET_PATH);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!token) {
      setBooting(false);
      return;
    }

    authApi
      .getMe()
      .then((me) => setUser(me))
      .catch(() => {
        localStorage.removeItem(TOKEN_STORAGE_KEY);
        setUser(null);
      })
      .finally(() => setBooting(false));
  }, []);

  function handleLogout() {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setUser(null);
    setActiveTab('profile');
  }

  if (resetting) {
    return (
      <ResetPasswordPage
        onDone={() => {
          window.history.replaceState(null, '', '/');
          setResetting(false);
        }}
      />
    );
  }

  if (booting) {
    return <div className="boot">Đang kiểm tra phiên đăng nhập…</div>;
  }

  if (!user) {
    return (
      <AuthPage
        onSuccess={(loggedInUser) => {
          setUser(loggedInUser);
          setActiveTab('profile');
        }}
      />
    );
  }

  return (
    <>
      <header className="topbar">
        <div className="topbar-in">
          <div className="brand">
            <LogoMark />
            Đặt vé xe
          </div>

          <nav className="nav" aria-label="Điều hướng chính">
            <button
              type="button"
              aria-current={activeTab === 'profile' ? 'page' : undefined}
              onClick={() => setActiveTab('profile')}
            >
              Hồ sơ <small>F03</small>
            </button>
            <button
              type="button"
              aria-current={activeTab === 'passengers' ? 'page' : undefined}
              onClick={() => setActiveTab('passengers')}
            >
              Hành khách thường đi <small>F04</small>
            </button>
            {user.role === 'ADMIN' && (
              <button
                type="button"
                aria-current={activeTab === 'admin' ? 'page' : undefined}
                onClick={() => setActiveTab('admin')}
              >
                Người dùng <small>F29</small>
              </button>
            )}
          </nav>

          <div className="me">
            <Avatar name={user.fullName} />
            <div className="me-text">
              <div className="me-name">{user.fullName}</div>
              <div className="me-role">{ROLE_LABEL[user.role]}</div>
            </div>
            <button type="button" className="btn btn-sm btn-onbrand" onClick={handleLogout}>
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="page">
        {activeTab === 'profile' ? (
          <ProfilePage user={user} onUserUpdated={setUser} />
        ) : activeTab === 'passengers' ? (
          <PassengersPage />
        ) : (
          user.role === 'ADMIN' && <AdminUsersPage currentUserId={user.id} />
        )}
      </main>
    </>
  );
}

export default App;
