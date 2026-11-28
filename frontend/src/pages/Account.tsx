import { DeleteOutlined, LockOutlined, PlusOutlined, TeamOutlined, UserOutlined } from '@ant-design/icons';
import { Alert, Empty, Form, Input, InputNumber, Modal, Popconfirm, Select, Tabs } from 'antd';
import { useEffect, useState } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { ApiError, api } from '../api';
import { useAuth } from '../auth';
import { GENDER } from '../format';
import { message } from '../notify';
import type { SavedPassenger } from '../types';

const errMsg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);
const GENDER_OPTS = Object.entries(GENDER).map(([value, label]) => ({ value, label }));

/** F03, F04: hồ sơ, đổi mật khẩu, danh sách hành khách hay đi cùng */
export function Account() {
  const { user, ready, requireLogin, refresh } = useAuth();
  const [pax, setPax] = useState<SavedPassenger[]>([]);
  const [editing, setEditing] = useState<Partial<SavedPassenger> | null>(null);
  const [pwErr, setPwErr] = useState<string | null>(null);
  const [profileForm] = Form.useForm();
  const [pwForm] = Form.useForm();
  const [paxForm] = Form.useForm();

  const loadPax = () => api<SavedPassenger[]>('/auth/me/passengers').then(setPax).catch(() => setPax([]));

  useEffect(() => {
    if (user) {
      profileForm.setFieldsValue({ fullName: user.fullName, phone: user.phone });
      loadPax();
    } else if (ready) requireLogin();
  }, [user, ready]);

  useEffect(() => {
    if (!editing) return;
    paxForm.resetFields();
    paxForm.setFieldsValue({ fullName: editing.fullName, phone: editing.phone ?? undefined, gender: editing.gender ?? undefined, age: editing.age ?? undefined });
  }, [editing]);

  if (!user) {
    return (
      <div className="container section">
        <Empty description="Đăng nhập để xem tài khoản">
          <button className="btn-primary" onClick={() => requireLogin()}>
            Đăng nhập
          </button>
        </Empty>
      </div>
    );
  }

  const saveProfile = async (v: { fullName: string; phone: string }) => {
    try {
      await api('/auth/me', { method: 'PATCH', body: v });
      await refresh();
      message.success('Đã lưu hồ sơ');
    } catch (e) {
      message.error(errMsg(e, 'Không lưu được'));
    }
  };

  const changePw = async (v: { currentPassword: string; newPassword: string }) => {
    setPwErr(null);
    try {
      await api('/auth/change-password', { method: 'POST', body: { currentPassword: v.currentPassword, newPassword: v.newPassword } });
      pwForm.resetFields();
      message.success('Đã đổi mật khẩu');
    } catch (e) {
      setPwErr(errMsg(e, 'Không đổi được mật khẩu'));
    }
  };

  const savePax = async (v: { fullName: string; phone?: string; gender?: string; age?: number }) => {
    try {
      const body = { fullName: v.fullName, phone: v.phone || undefined, gender: v.gender || undefined, age: v.age ?? undefined };
      if (editing?.id) await api(`/auth/me/passengers/${editing.id}`, { method: 'PATCH', body });
      else await api('/auth/me/passengers', { method: 'POST', body });
      setEditing(null);
      loadPax();
      message.success('Đã lưu hành khách');
    } catch (e) {
      message.error(errMsg(e, 'Không lưu được'));
    }
  };

  const delPax = async (id: number) => {
    try {
      await api(`/auth/me/passengers/${id}`, { method: 'DELETE' });
      loadPax();
    } catch (e) {
      message.error(errMsg(e, 'Không xóa được'));
    }
  };

  return (
    <>
    <div className="account-banner">
      <div className="container">
        <span className="ab-avatar">{(user.fullName || '?').trim().charAt(0).toUpperCase()}</span>
        <div>
          <h1>{user.fullName}</h1>
          <p>
            {user.email} · {user.phone}
          </p>
        </div>
      </div>
    </div>
    <div className="container section account">
      <Tabs
        tabPosition="left"
        className="account-tabs"
        items={[
          {
            key: 'profile',
            label: <span><UserOutlined /> Hồ sơ cá nhân</span>,
            children: (
              <section className="card">
                <Form form={profileForm} layout="vertical" onFinish={saveProfile} requiredMark={false}>
                  <Form.Item label="Email">
                    <Input id="acc-email" value={user.email} disabled />
                  </Form.Item>
                  <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}>
                    <Input id="acc-name" />
                  </Form.Item>
                  <Form.Item name="phone" label="Số điện thoại" rules={[{ required: true, pattern: /^0\d{9}$/, message: 'Gồm 10 số, bắt đầu bằng 0' }]}>
                    <Input id="acc-phone" />
                  </Form.Item>
                  <button className="btn-primary" type="submit">
                    Lưu hồ sơ
                  </button>
                </Form>
              </section>
            ),
          },
          {
            key: 'password',
            label: <span><LockOutlined /> Đổi mật khẩu</span>,
            forceRender: true,
            children: (
              <section className="card">
                <Form form={pwForm} layout="vertical" onFinish={changePw} requiredMark={false}>
                  <Form.Item name="currentPassword" label="Mật khẩu hiện tại" rules={[{ required: true, message: 'Nhập mật khẩu hiện tại' }]}>
                    <Input.Password id="pw-current" autoComplete="current-password" />
                  </Form.Item>
                  <Form.Item name="newPassword" label="Mật khẩu mới" rules={[{ required: true, min: 8, message: 'Tối thiểu 8 ký tự' }]}>
                    <Input.Password id="pw-new" autoComplete="new-password" />
                  </Form.Item>
                  <Form.Item
                    name="confirm"
                    label="Nhập lại mật khẩu mới"
                    dependencies={['newPassword']}
                    rules={[{ required: true, message: 'Nhập lại mật khẩu' }, ({ getFieldValue }) => ({ validator: (_, v) => (v === getFieldValue('newPassword') ? Promise.resolve() : Promise.reject(new Error('Mật khẩu nhập lại không khớp'))) })]}
                  >
                    <Input.Password id="pw-confirm" autoComplete="new-password" />
                  </Form.Item>
                  {pwErr && <Alert type="error" showIcon message={pwErr} style={{ marginBottom: 12 }} />}
                  <button className="btn-primary" type="submit">
                    Đổi mật khẩu
                  </button>
                </Form>
              </section>
            ),
          },
          {
            key: 'passengers',
            label: <span><TeamOutlined /> Hành khách thường đi</span>,
            children: (
              <section className="card">
                <p className="muted">Lưu thông tin người hay đi cùng để điền nhanh khi đặt vé (tối đa 10 người).</p>
                {!pax.length && <Empty description="Chưa lưu hành khách nào" />}
                <ul className="pax-list">
                  {pax.map((p) => (
                    <li key={p.id}>
                      <div>
                        <b>{p.fullName}</b>
                        <span className="muted">
                          {[p.gender ? GENDER[p.gender] : null, p.age != null ? `${p.age} tuổi` : null, p.phone].filter(Boolean).join(' · ')}
                        </span>
                      </div>
                      <div>
                        <button className="btn-ghost" onClick={() => setEditing(p)}>
                          Sửa
                        </button>
                        <Popconfirm title="Xóa hành khách này?" okText="Xóa" cancelText="Không" onConfirm={() => delPax(p.id)}>
                          <button className="btn-ghost" aria-label={`Xóa ${p.fullName}`}>
                            <DeleteOutlined />
                          </button>
                        </Popconfirm>
                      </div>
                    </li>
                  ))}
                </ul>
                {pax.length < 10 && (
                  <button className="btn-outline" onClick={() => setEditing({})}>
                    <PlusOutlined /> Thêm hành khách
                  </button>
                )}
              </section>
            ),
          },
        ]}
      />
      <Modal open={!!editing} title={editing?.id ? 'Sửa hành khách' : 'Thêm hành khách'} onCancel={() => setEditing(null)} onOk={() => paxForm.submit()} okText="Lưu" cancelText="Hủy" forceRender>
        <Form form={paxForm} layout="vertical" onFinish={savePax} requiredMark={false}>
          <Form.Item name="fullName" label="Họ tên" rules={[{ required: true, min: 2, message: 'Nhập họ tên' }]}>
            <Input id="pax-name" />
          </Form.Item>
          <div className="two-col">
            <Form.Item name="gender" label="Giới tính">
              <Select id="pax-gender" allowClear options={GENDER_OPTS} />
            </Form.Item>
            <Form.Item name="age" label="Tuổi">
              <InputNumber id="pax-age" min={0} max={120} style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="phone" label="Số điện thoại" rules={[{ pattern: /^0\d{9}$/, message: 'Gồm 10 số, bắt đầu bằng 0' }]}>
            <Input id="pax-phone" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
    </>
  );
}

/** F02: quên mật khẩu – gửi link đặt lại qua email */
export function ForgotPassword() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const submit = async (v: { email: string }) => {
    setLoading(true);
    try {
      await api('/auth/forgot-password', { method: 'POST', body: v });
      setSent(true);
    } catch (e) {
      message.error(errMsg(e, 'Không gửi được yêu cầu'));
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="container section narrow">
      <h1>Quên mật khẩu</h1>
      <section className="card">
        {sent ? (
          <Alert
            type="success"
            showIcon
            message="Nếu email có trong hệ thống, chúng tôi đã gửi link đặt lại mật khẩu (hiệu lực 30 phút)."
            description="Máy chưa cấu hình SMTP thì đường dẫn đặt lại được in ra log của backend."
          />
        ) : (
          <Form layout="vertical" onFinish={submit} requiredMark={false}>
            <Form.Item name="email" label="Email đã đăng ký" rules={[{ required: true, type: 'email', message: 'Nhập email hợp lệ' }]}>
              <Input id="forgot-email" autoComplete="email" />
            </Form.Item>
            <button className="btn-primary" type="submit" disabled={loading}>
              {loading ? 'Đang gửi…' : 'Gửi link đặt lại'}
            </button>
          </Form>
        )}
      </section>
    </div>
  );
}

export function ResetPassword() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const { openLogin } = useAuth();
  const token = params.get('token') ?? '';
  const [error, setError] = useState<string | null>(null);
  const submit = async (v: { password: string }) => {
    setError(null);
    try {
      await api('/auth/reset-password', { method: 'POST', body: { token, password: v.password } });
      message.success('Đã đặt lại mật khẩu. Mời bạn đăng nhập.');
      nav('/');
      openLogin();
    } catch (e) {
      setError(errMsg(e, 'Không đặt lại được mật khẩu'));
    }
  };
  if (!token) return <div className="container section narrow"><Alert type="warning" showIcon message="Link không hợp lệ" description={<Link to="/quen-mat-khau">Gửi lại link</Link>} /></div>;
  return (
    <div className="container section narrow">
      <h1>Đặt lại mật khẩu</h1>
      <section className="card">
        <Form layout="vertical" onFinish={submit} requiredMark={false}>
          <Form.Item name="password" label="Mật khẩu mới" rules={[{ required: true, min: 8, message: 'Tối thiểu 8 ký tự' }]}>
            <Input.Password id="reset-password" autoComplete="new-password" />
          </Form.Item>
          {error && <Alert type="error" showIcon message={error} style={{ marginBottom: 12 }} />}
          <button className="btn-primary" type="submit">
            Đặt lại mật khẩu
          </button>
        </Form>
      </section>
    </div>
  );
}
