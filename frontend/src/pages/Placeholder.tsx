import { Result } from 'antd';
import { Link, useLocation } from 'react-router-dom';

/** Các trang đã có trong menu nhưng chưa tới ngày làm (theo bản phân công). Làm xong thì thay bằng trang thật trong main.tsx. */
const PENDING: Record<string, { title: string; plan: string }> = {
  '/tim-chuyen': { title: 'Kết quả tìm chuyến', plan: 'F05, F06 – TV1 ngày 6' },
  '/ve-cua-toi': { title: 'Vé của tôi', plan: 'F16 – TV2 ngày 18' },
  '/tra-cuu': { title: 'Tra cứu vé', plan: 'F17 – TV2 ngày 18' },
  '/ho-tro': { title: 'Hỗ trợ, khiếu nại', plan: 'F34 (giao diện) – TV2 ngày 21' },
  '/nhan-vien': { title: 'Quầy nhân viên', plan: 'F23, F24 – TV1 ngày 19–20' },
};

export function Placeholder() {
  const { pathname } = useLocation();
  const p = PENDING[pathname];
  return (
    <div className="container section">
      <Result
        status="info"
        title={p ? `${p.title}: đang làm` : 'Trang đang làm'}
        subTitle={p ? `Theo bản phân công: ${p.plan}.` : undefined}
        extra={
          <Link className="btn-primary" to="/">
            Về trang chủ
          </Link>
        }
      />
    </div>
  );
}

export const PENDING_PATHS = Object.keys(PENDING);
