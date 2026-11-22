import { useEffect, useState } from 'react';
import { authApi, TOKEN_STORAGE_KEY } from './api/auth';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AuthPage } from './pages/AuthPage';
import { ProfilePage } from './pages/ProfilePage';
import type { UserProfile } from './types/user';

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
    return <div style={{ padding: 24 }}>Đang kiểm tra phiên đăng nhập...</div>;
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
    <div style={{ maxWidth: 960, margin: '24px auto', padding: '0 16px' }}>
      <header
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          paddingBottom: 12,
          marginBottom: 20,
          borderBottom: '1px solid #ddd',
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            style={{ padding: '8px 14px', fontWeight: activeTab === 'profile' ? 'bold' : 'normal' }}
          >
            Hồ sơ & Đổi mật khẩu (F03)
          </button>
          {user.role === 'ADMIN' && (
            <button
              type="button"
              onClick={() => setActiveTab('admin')}
              style={{ padding: '8px 14px', fontWeight: activeTab === 'admin' ? 'bold' : 'normal' }}
            >
              Quản lý người dùng (F29)
            </button>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span>
            <strong>{user.fullName}</strong> ({user.role})
          </span>
          <button type="button" onClick={handleLogout} style={{ padding: '6px 12px' }}>
            Đăng xuất
          </button>
        </div>
      </header>

      {activeTab === 'profile' ? (
        <ProfilePage user={user} onUserUpdated={setUser} />
      ) : (
        user.role === 'ADMIN' && <AdminUsersPage currentUserId={user.id} />
      )}
    </div>
  );
}

export default App;