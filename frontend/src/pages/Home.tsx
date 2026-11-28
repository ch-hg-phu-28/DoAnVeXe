import { CheckCircleOutlined, ClockCircleOutlined, QrcodeOutlined, SafetyCertificateOutlined, ThunderboltOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';

const FEATURES = [
  { icon: <ThunderboltOutlined />, title: 'Chọn ghế trực tiếp', text: 'Sơ đồ ghế từng tầng, đổi màu ngay khi có người chọn.' },
  { icon: <ClockCircleOutlined />, title: 'Giữ ghế 10 phút', text: 'Ghế được giữ riêng trong lúc bạn nhập thông tin.' },
  { icon: <SafetyCertificateOutlined />, title: 'Không bán trùng ghế', text: 'Mỗi ghế chỉ bán cho đúng một người.' },
  { icon: <QrcodeOutlined />, title: 'Vé điện tử QR', text: 'Tra cứu, đổi, hủy vé ngay trên web.' },
];

/**
 * Trang chủ theo giao diện bản mẫu. Ô tìm chuyến và các điểm đến nổi bật thêm vào ở ngày làm F05, F06 (TV1 ngày 6);
 * hiện tại chỉ có phần giới thiệu và lối vào tài khoản.
 */
export function Home() {
  const { user, openLogin } = useAuth();
  return (
    <>
      <section className="th-hero" style={{ backgroundImage: 'url(/du-lich/da-lat.jpg)' }}>
        <div className="container th-hero-inner">
          <span className="th-pill">
            <CheckCircleOutlined /> Đặt vé xe khách liên tỉnh, chọn đúng ghế bạn muốn
          </span>
          <h1>
            Khám phá Việt Nam
            <span>trên mỗi chuyến xe</span>
          </h1>
          <p>So sánh nhà xe, xem sơ đồ ghế trực tiếp và nhận vé điện tử ngay sau khi thanh toán.</p>
          <div className="home-cta">
            <Link className="btn-primary" to="/tim-chuyen">
              Tìm chuyến xe
            </Link>
            {user ? (
              <Link className="btn-outline on-dark" to="/tai-khoan">
                Tài khoản của tôi
              </Link>
            ) : (
              <button className="btn-outline on-dark" onClick={openLogin}>
                Đăng nhập / Đăng ký
              </button>
            )}
          </div>
        </div>
      </section>
      <div className="container th-benefits">
        {FEATURES.map((f) => (
          <div key={f.title} className="th-benefit">
            <span className="th-benefit-icon">{f.icon}</span>
            <div>
              <b>{f.title}</b>
              <small>{f.text}</small>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
