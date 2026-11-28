import { CustomerServiceOutlined, DashboardOutlined, FileSearchOutlined, IdcardOutlined, LogoutOutlined, MenuOutlined, SearchOutlined, ShopOutlined, TagsOutlined, UserOutlined } from '@ant-design/icons';
import { Drawer, Dropdown } from 'antd';
import { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';

export function Logo() {
  return (
    <Link to="/" className="logo" aria-label="Trang chủ">
      <svg width="30" height="30" viewBox="0 0 32 32" aria-hidden="true">
        <rect x="3" y="6" width="26" height="18" rx="5" fill="currentColor" />
        <rect x="7" y="10" width="7" height="6" rx="1.5" fill="var(--surface)" />
        <rect x="16" y="10" width="9" height="6" rx="1.5" fill="var(--surface)" />
        <circle cx="10" cy="25" r="3" fill="var(--accent)" />
        <circle cx="22" cy="25" r="3" fill="var(--accent)" />
      </svg>
      <span>
        Đặt<b>VéXe</b>
      </span>
    </Link>
  );
}

export function Header() {
  const { user, openLogin, logout } = useAuth();
  const nav = useNavigate();
  const staff = user?.role === 'STAFF' || user?.role === 'ADMIN';
  const [menu, setMenu] = useState(false);
  const go = (to: string) => {
    setMenu(false);
    nav(to);
  };
  // Menu cho điện thoại (thanh menu ngang bị ẩn ở màn hẹp)
  const mobileLinks = [
    { to: '/', icon: <SearchOutlined />, label: 'Vé xe khách' },
    { to: '/ve-cua-toi', icon: <TagsOutlined />, label: 'Vé của tôi' },
    { to: '/tra-cuu', icon: <FileSearchOutlined />, label: 'Tra cứu vé' },
    { to: '/ho-tro', icon: <CustomerServiceOutlined />, label: 'Hỗ trợ' },
    ...(user ? [{ to: '/tai-khoan', icon: <IdcardOutlined />, label: 'Tài khoản' }] : []),
    ...(staff ? [{ to: '/nhan-vien', icon: <ShopOutlined />, label: 'Quầy nhân viên' }] : []),
    ...(user?.role === 'ADMIN' ? [{ to: '/quan-tri', icon: <DashboardOutlined />, label: 'Trang quản trị' }] : []),
  ];
  return (
    <header className="site-header">
      <div className="container header-inner">
        <button className="menu-btn" aria-label="Mở menu" aria-expanded={menu} onClick={() => setMenu(true)}>
          <MenuOutlined />
        </button>
        <Drawer open={menu} onClose={() => setMenu(false)} placement="left" width={280} title="Menu" className="mobile-menu">
          <nav className="mobile-nav">
            {mobileLinks.map((l) => (
              <NavLink key={l.to} to={l.to} end={l.to === '/'} onClick={(e) => { e.preventDefault(); go(l.to); }}>
                {l.icon} {l.label}
              </NavLink>
            ))}
            {user ? (
              <button className="link" onClick={() => { setMenu(false); logout(); nav('/'); }}>
                <LogoutOutlined /> Đăng xuất
              </button>
            ) : (
              <button className="link" onClick={() => { setMenu(false); openLogin(); }}>
                <UserOutlined /> Đăng nhập / Đăng ký
              </button>
            )}
          </nav>
        </Drawer>
        <Logo />
        <nav className="main-nav">
          <NavLink to="/" end>
            <SearchOutlined /> Vé xe khách
          </NavLink>
          <NavLink to="/ve-cua-toi">
            <TagsOutlined /> Vé của tôi
          </NavLink>
          <NavLink to="/tra-cuu">Tra cứu vé</NavLink>
          <NavLink to="/ho-tro">Hỗ trợ</NavLink>
          {staff && (
            <NavLink to="/nhan-vien">
              <ShopOutlined /> Nhân viên
            </NavLink>
          )}
          {user?.role === 'ADMIN' && (
            <NavLink to="/quan-tri">
              <DashboardOutlined /> Quản trị
            </NavLink>
          )}
        </nav>
        <div className="header-right">
          {user ? (
            <Dropdown
              menu={{
                items: [
                  { key: 'tickets', icon: <TagsOutlined />, label: 'Vé của tôi', onClick: () => nav('/ve-cua-toi') },
                  { key: 'account', icon: <IdcardOutlined />, label: 'Tài khoản', onClick: () => nav('/tai-khoan') },
                  { key: 'support', icon: <CustomerServiceOutlined />, label: 'Hỗ trợ', onClick: () => nav('/ho-tro') },
                  ...(staff ? [{ key: 'staff', icon: <ShopOutlined />, label: 'Quầy nhân viên', onClick: () => nav('/nhan-vien') }] : []),
                  ...(user.role === 'ADMIN' ? [{ key: 'admin', icon: <DashboardOutlined />, label: 'Trang quản trị', onClick: () => nav('/quan-tri') }] : []),
                  { type: 'divider' as const },
                  {
                    key: 'logout',
                    icon: <LogoutOutlined />,
                    label: 'Đăng xuất',
                    onClick: () => {
                      logout();
                      nav('/');
                    },
                  },
                ],
              }}
            >
              <button className="btn-ghost">
                <UserOutlined /> <span className="user-name">{user.fullName}</span>
              </button>
            </Dropdown>
          ) : (
            <button className="btn-ghost" onClick={openLogin}>
              <UserOutlined /> <span className="hide-sm">Đăng nhập / Đăng ký</span>
              <span className="show-sm">Đăng nhập</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}

const FOOTER_ROUTES: [string, string][] = [
  ['TP. Hồ Chí Minh', 'Đà Lạt'],
  ['TP. Hồ Chí Minh', 'Nha Trang'],
  ['TP. Hồ Chí Minh', 'Vũng Tàu'],
  ['TP. Hồ Chí Minh', 'Cần Thơ'],
  ['Hà Nội', 'Sa Pa'],
  ['Hà Nội', 'Hải Phòng'],
];

export function Footer() {
  return (
    <footer className="site-footer">
      <div className="container footer-inner footer-4">
        <div>
          <Logo />
          <p>Đồ án môn Quản lý dự án CNTT · Website đặt vé xe khách liên tỉnh có chọn ghế, tích hợp Chatbot AI.</p>
          <p className="f-note">Dữ liệu tuyến, giờ chạy, giá vé và nhà xe là dữ liệu mẫu. Thanh toán đang ở chế độ giả lập.</p>
        </div>
        <div>
          <h4>Tuyến phổ biến</h4>
          <ul className="f-links">
            {FOOTER_ROUTES.map(([a, b]) => (
              <li key={a + b}>
                <Link to={`/tim-chuyen?${new URLSearchParams({ from: a, to: b, date: new Date(Date.now() + 864e5).toISOString().slice(0, 10) })}`}>
                  {a.replace('TP. ', '')} – {b}
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div>
          <h4>Dành cho khách</h4>
          <ul className="f-links">
            <li>
              <Link to="/tra-cuu">Tra cứu vé</Link>
            </li>
            <li>
              <Link to="/ve-cua-toi">Vé của tôi</Link>
            </li>
            <li>
              <Link to="/ho-tro">Gửi yêu cầu hỗ trợ</Link>
            </li>
            <li>
              <Link to="/tai-khoan">Tài khoản</Link>
            </li>
          </ul>
        </div>
        <div>
          <h4>Chính sách</h4>
          <p>Hủy vé: trước 24 giờ phí 10%, từ 4 đến 24 giờ phí 30%.</p>
          <p>Đổi chuyến miễn phí trước giờ chạy 12 giờ, cùng tuyến.</p>
        </div>
      </div>
      <div className="container f-bottom">© 2026 ĐặtVéXe · Đồ án học tập, không phải dịch vụ thương mại.</div>
    </footer>
  );
}
