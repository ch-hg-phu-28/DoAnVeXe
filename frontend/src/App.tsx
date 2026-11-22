import { useEffect, useState } from 'react';
import { authApi, TOKEN_STORAGE_KEY } from './api/auth';
import { Avatar, LogoMark } from './components/ui';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import { ROLE_LABEL, type UserProfile } from './types/user';

type Tab = 'profile' | 'admin';

export function App() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [activeTab, setActiveTab] = useState<Tab>('profile');
  const [booting, setBooting] = useState(true);

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
        ) : (
          user.role === 'ADMIN' && <AdminUsersPage currentUserId={user.id} />
        )}
      </main>
    </>
  );
}

export default App;
