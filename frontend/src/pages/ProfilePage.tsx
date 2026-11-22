import { useEffect, useState, type FormEvent } from 'react';
import { authApi } from '../api/auth';
import type { UserProfile } from '../types/user';

interface ProfilePageProps {
  user: UserProfile;
  onUserUpdated: (user: UserProfile) => void;
}

export function ProfilePage({ user, onUserUpdated }: ProfilePageProps) {
  const [fullName, setFullName] = useState(user.fullName);
  const [phone, setPhone] = useState(user.phone);
  const [profileMsg, setProfileMsg] = useState<string | null>(null);
  const [profileErr, setProfileErr] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [pwMsg, setPwMsg] = useState<string | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  useEffect(() => {
    setFullName(user.fullName);
    setPhone(user.phone);
  }, [user]);

  async function handleUpdateProfile(e: FormEvent) {
    e.preventDefault();
    setProfileMsg(null);
    setProfileErr(null);
    setSavingProfile(true);
    try {
      const updated = await authApi.updateProfile({ fullName, phone });
      onUserUpdated({ ...user, ...updated });
      setProfileMsg('Đã cập nhật hồ sơ thành công.');
    } catch (err) {
      setProfileErr(err instanceof Error ? err.message : 'Cập nhật hồ sơ thất bại');
    } finally {
      setSavingProfile(false);
    }
  }

  async function handleChangePassword(e: FormEvent) {
    e.preventDefault();
    setPwMsg(null);
    setPwErr(null);
    setSavingPw(true);
    try {
      const res = await authApi.changePassword({ currentPassword, newPassword });
      setPwMsg(res.message || 'Đã đổi mật khẩu.');
      setCurrentPassword('');
      setNewPassword('');
    } catch (err) {
      setPwErr(err instanceof Error ? err.message : 'Đổi mật khẩu thất bại');
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <div style={{ display: 'grid', gap: 24, maxWidth: 600 }}>
      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h3>Thông tin tài khoản (F03)</h3>
        <p><strong>Email:</strong> {user.email} (không thể thay đổi)</p>
        <p><strong>Vai trò:</strong> {user.role}</p>

        <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Họ tên
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </label>
          <label>
            Số điện thoại
            <input
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </label>

          {profileErr && <p style={{ color: 'crimson', margin: 0 }}>{profileErr}</p>}
          {profileMsg && <p style={{ color: 'seagreen', margin: 0 }}>{profileMsg}</p>}

          <button type="submit" disabled={savingProfile} style={{ padding: 10 }}>
            {savingProfile ? 'Đang lưu...' : 'Lưu thay đổi hồ sơ'}
          </button>
        </form>
      </section>

      <section style={{ padding: 16, border: '1px solid #ddd', borderRadius: 8 }}>
        <h3>Đổi mật khẩu</h3>
        <form onSubmit={handleChangePassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <label>
            Mật khẩu hiện tại
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </label>
          <label>
            Mật khẩu mới (tối thiểu 8 ký tự)
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              style={{ width: '100%', padding: 8, marginTop: 4 }}
            />
          </label>

          {pwErr && <p style={{ color: 'crimson', margin: 0 }}>{pwErr}</p>}
          {pwMsg && <p style={{ color: 'seagreen', margin: 0 }}>{pwMsg}</p>}

          <button type="submit" disabled={savingPw} style={{ padding: 10 }}>
            {savingPw ? 'Đang đổi...' : 'Đổi mật khẩu'}
          </button>
        </form>
      </section>
    </div>
  );
}