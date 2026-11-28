import { TeamOutlined } from '@ant-design/icons';
import { Input, Result, Select, Switch, Table } from 'antd';
import { useEffect, useState, type ReactNode } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ApiError, api } from '../api';
import { useAuth } from '../auth';
import { SHOW_DEMO_ACCOUNTS } from '../demo';
import { message } from '../notify';
import type { AdminUser, Role } from '../types';

export const errMsg = (e: unknown, d: string) => (e instanceof ApiError ? e.message : d);

// Các mục quản trị. Mục khác (thống kê, chuyến, tuyến, xe, đơn vé, mã giảm giá…) thêm vào đây theo ngày trong bản phân công.
const SECTIONS: { key: string; label: string; icon: ReactNode; el: () => ReactNode }[] = [
  { key: 'nguoi-dung', label: 'Người dùng', icon: <TeamOutlined />, el: () => <UsersPanel /> },
];

/** Trang quản trị: menu bên trái, nội dung bên phải (giao diện theo bản mẫu) */
export function Admin() {
  const { user, ready, requireLogin } = useAuth();
  const [params, setParams] = useSearchParams();
  const cur = SECTIONS.find((s) => s.key === params.get('muc')) ?? SECTIONS[0];
  useEffect(() => {
    if (!user && ready) requireLogin();
  }, [user, ready]);
  if (!user) return <Result status="403" title="Cần đăng nhập quản trị viên" subTitle={SHOW_DEMO_ACCOUNTS ? 'Tài khoản mẫu: admin@example.com / Matkhau@123' : undefined} />;
  if (user.role !== 'ADMIN') return <Result status="403" title="Chỉ quản trị viên được vào trang này" />;
  return (
    <div className="admin">
      <aside className="admin-side" aria-label="Mục quản trị">
        <span className="as-title">Hệ thống quản trị</span>
        {SECTIONS.map((s) => (
          <button key={s.key} className={s.key === cur.key ? 'on' : ''} onClick={() => setParams({ muc: s.key })}>
            {s.icon} <span>{s.label}</span>
          </button>
        ))}
      </aside>
      <section className="admin-main">
        <h1>{cur.label}</h1>
        {cur.el()}
      </section>
    </div>
  );
}

/** F29: danh sách tài khoản, đổi vai trò, khóa/mở khóa */
function UsersPanel() {
  const { user: me } = useAuth();
  const [q, setQ] = useState('');
  const [rows, setRows] = useState<AdminUser[] | null>(null);
  const load = () => api<AdminUser[]>(`/admin/users?q=${encodeURIComponent(q)}`).then(setRows).catch(() => setRows([]));
  useEffect(() => {
    load();
  }, []);
  const update = async (u: AdminUser, body: { role?: Role; isLocked?: boolean }) => {
    try {
      await api(`/admin/users/${u.id}`, { method: 'PATCH', body });
      message.success('Đã cập nhật');
      load();
    } catch (e) {
      message.error(errMsg(e, 'Không cập nhật được'));
    }
  };
  return (
    <div>
      <div className="toolbar">
        <Input.Search id="u-q" placeholder="Tên, email hoặc số điện thoại" value={q} onChange={(e) => setQ(e.target.value)} onSearch={load} style={{ maxWidth: 340 }} enterButton="Tìm" />
      </div>
      <Table
        size="small"
        rowKey="id"
        loading={!rows}
        dataSource={rows ?? []}
        scroll={{ x: true }}
        columns={[
          { title: 'Họ tên', dataIndex: 'fullName' },
          { title: 'Email', dataIndex: 'email' },
          { title: 'SĐT', dataIndex: 'phone' },
          { title: 'Số đơn', render: (_, u) => u._count.bookings, align: 'right' },
          {
            title: 'Vai trò',
            dataIndex: 'role',
            render: (v: Role, u) => (
              <Select
                size="small"
                value={v}
                disabled={u.id === me?.id}
                onChange={(role) => update(u, { role })}
                style={{ width: 130 }}
                aria-label={`Vai trò của ${u.fullName}`}
                options={[
                  { value: 'CUSTOMER', label: 'Khách hàng' },
                  { value: 'STAFF', label: 'Nhân viên' },
                  { value: 'ADMIN', label: 'Quản trị' },
                ]}
              />
            ),
          },
          {
            title: 'Khóa',
            dataIndex: 'isLocked',
            render: (v: boolean, u) => <Switch size="small" checked={v} disabled={u.id === me?.id} onChange={(isLocked) => update(u, { isLocked })} aria-label={`Khóa tài khoản ${u.fullName}`} />,
          },
        ]}
      />
    </div>
  );
}
