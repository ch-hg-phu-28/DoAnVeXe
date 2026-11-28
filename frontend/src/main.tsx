import '@ant-design/v5-patch-for-react-19'; // Ant Design 5 chạy trên React 19
import { App as AntApp, ConfigProvider, Result } from 'antd';
import viVN from 'antd/locale/vi_VN';
import dayjs from 'dayjs';
import 'dayjs/locale/vi';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Link, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth';
import { Footer, Header } from './components/Header';
import { NotifyBridge } from './notify';
import { Account, ForgotPassword, ResetPassword } from './pages/Account';
import { Admin } from './pages/Admin';
import { Home } from './pages/Home';
import { Placeholder, PENDING_PATHS } from './pages/Placeholder';
import './styles.css';

dayjs.locale('vi');

// Giao diện theo bản mẫu dat-ve-xe (github.com/Vawn169/dat-ve-xe). Trang nào làm xong thì thay Placeholder bằng trang thật.
function App() {
  return (
    <AuthProvider>
      <div className="app">
        <Header />
        <main className="app-main">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/tai-khoan" element={<Account />} />
            <Route path="/quen-mat-khau" element={<ForgotPassword />} />
            <Route path="/dat-lai-mat-khau" element={<ResetPassword />} />
            <Route path="/quan-tri" element={<Admin />} />
            {PENDING_PATHS.map((p) => (
              <Route key={p} path={p} element={<Placeholder />} />
            ))}
            <Route
              path="*"
              element={
                <Result
                  status="404"
                  title="Không tìm thấy trang"
                  extra={
                    <Link className="btn-primary" to="/">
                      Về trang chủ
                    </Link>
                  }
                />
              }
            />
          </Routes>
        </main>
        <Footer />
      </div>
    </AuthProvider>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ConfigProvider
      locale={viVN}
      theme={{
        token: {
          colorPrimary: '#0b7a5e',
          borderRadius: 8,
          fontFamily: '"Be Vietnam Pro", "Segoe UI", system-ui, sans-serif',
        },
      }}
    >
      <AntApp>
        <NotifyBridge />
        <BrowserRouter>
          <App />
        </BrowserRouter>
      </AntApp>
    </ConfigProvider>
  </StrictMode>,
);
