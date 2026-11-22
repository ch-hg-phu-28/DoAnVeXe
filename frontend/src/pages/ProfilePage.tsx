import { useEffect, useState, type FormEvent } from 'react';
import { authApi } from '../api/auth';
import { Avatar } from '../components/ui';
import { ROLE_LABEL, type UserProfile } from '../types/user';

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
    <>
      <div className="page-head">
        <h1>Hồ sơ của bạn</h1>
        <p>Cập nhật thông tin liên hệ và mật khẩu đăng nhập.</p>
      </div>

      <div className="panel split">
        <section>
          <div className="profile-id">
            <Avatar name={user.fullName} size="lg" />
            <div>
              <div className="profile-name">{user.fullName}</div>
              <div className="muted">{user.email}</div>
              <span className="badge">{ROLE_LABEL[user.role]}</span>
            </div>
          </div>

          <h2 className="section-title">Thông tin liên hệ</h2>
          <p className="section-sub">Email dùng để đăng nhập nên không thể thay đổi.</p>

          <form className="form" onSubmit={handleUpdateProfile}>
            <div className="field">
              <label htmlFor="pf-name">Họ tên</label>
              <input
                id="pf-name"
                className="input"
                type="text"
                autoComplete="name"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pf-phone">
                Số điện thoại<small>10 số, bắt đầu bằng 0</small>
              </label>
              <input
                id="pf-phone"
                className="input"
                type="tel"
                autoComplete="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>

            {profileErr && (
              <p className="alert alert-error" role="alert">
                {profileErr}
              </p>
            )}
            {profileMsg && (
              <p className="alert alert-ok" role="status">
                {profileMsg}
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={savingProfile}>
              {savingProfile ? 'Đang lưu…' : 'Lưu thay đổi'}
            </button>
          </form>
        </section>

        <section>
          <h2 className="section-title">Đổi mật khẩu</h2>
          <p className="section-sub">Nhập mật khẩu hiện tại để xác nhận trước khi đặt mật khẩu mới.</p>

          <form className="form" onSubmit={handleChangePassword}>
            <div className="field">
              <label htmlFor="pw-current">Mật khẩu hiện tại</label>
              <input
                id="pw-current"
                className="input"
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                required
              />
            </div>
            <div className="field">
              <label htmlFor="pw-new">
                Mật khẩu mới<small>tối thiểu 8 ký tự</small>
              </label>
              <input
                id="pw-new"
                className="input"
                type="password"
                autoComplete="new-password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
            </div>

            {pwErr && (
              <p className="alert alert-error" role="alert">
                {pwErr}
              </p>
            )}
            {pwMsg && (
              <p className="alert alert-ok" role="status">
                {pwMsg}
              </p>
            )}

            <button type="submit" className="btn btn-primary" disabled={savingPw}>
              {savingPw ? 'Đang đổi…' : 'Đổi mật khẩu'}
            </button>
          </form>
        </section>
      </div>
    </>
  );
}
