# DoAnVeXe – Website đặt vé xe khách liên tỉnh có chọn ghế, tích hợp Chatbot AI

NestJS + Prisma (PostgreSQL) + Redis (giữ ghế) + Socket.IO (cập nhật ghế realtime).

## Chạy trên máy dev

Cần: Node.js 22, Docker.

```bash
docker compose up -d
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
npm run db:seed
npm run start:dev
```

Nếu máy chưa có Docker Compose (`docker compose` báo "unknown command"), thay dòng đầu bằng 2 lệnh:

```bash
docker run -d --name datve-pg -e POSTGRES_USER=datve -e POSTGRES_PASSWORD=datve -e POSTGRES_DB=datve -p 5432:5432 -v datve-pgdata:/var/lib/postgresql/data postgres:16
docker run -d --name datve-redis -p 6379:6379 redis:7
```

- API: http://localhost:3000/api
- Tài liệu API (Swagger, thử gọi trực tiếp): http://localhost:3000/api/docs
- Kiểm tra server + database: http://localhost:3000/api/health
- Tài khoản mẫu sau khi seed: `admin@example.com`, `staff@example.com`, `khach@example.com` – mật khẩu là `SEED_PASSWORD` trong `.env`.

## Cấu trúc backend

```
backend/
├── prisma/
│   ├── schema.prisma        # Toàn bộ bảng CSDL
│   ├── migrations/          # Lịch sử thay đổi bảng (commit lên git)
│   └── seed.ts              # Dữ liệu mẫu
├── scripts/
│   └── concurrency-hold.ts  # Kiểm thử N người cùng giữ 1 ghế
└── src/
    ├── main.ts              # Khởi động, Swagger, validate, định dạng phản hồi
    ├── app.module.ts        # Ghép module, guard toàn cục, /api/health
    ├── common/              # Dùng chung: mã lỗi, filter, interceptor, guard, decorator
    ├── config/              # Kiểm tra biến môi trường
    ├── prisma/  redis/      # Kết nối PostgreSQL, Redis
    ├── auth/                # Đăng ký, đăng nhập, JWT                 (TV3)
    ├── catalog/             # Tuyến, điểm đón/trả, xe, sơ đồ ghế, chuyến, tìm chuyến
    ├── booking/             # Sơ đồ ghế, giữ ghế, đặt vé, tra cứu, hủy vé
    ├── payment/             # Tạo thanh toán, callback, cổng giả lập (mock)
    ├── realtime/            # Socket.IO namespace /seats
    └── chatbot-tools/       # API chỉ đọc cho chatbot: tra chuyến, tra vé, chính sách (TV3 gọi)
```

## Quy ước chung (cả nhóm phải theo)

**Phản hồi API**

- Thành công: `{ "success": true, "data": ... }`
- Lỗi: `{ "success": false, "error": { "code": "SEAT_TAKEN", "message": "...", "details": ... } }`
- Frontend/chatbot xử lý theo `error.code`. Danh sách mã: `backend/src/common/errors.ts`. Ném lỗi bằng `new AppException(ErrorCode.X, 'thông báo tiếng Việt', HttpStatus.Y)`.

**Xác thực**

- Mọi API mặc định cần đăng nhập (header `Authorization: Bearer <token>`).
- API công khai thêm `@Public()`; API chỉ cho admin thêm `@Roles(Role.ADMIN)`.
- API cho chatbot gửi header `x-tool-key`.

**Database**

- Không sửa bảng bằng tay. Sửa `schema.prisma` rồi chạy `npx prisma migrate dev --name ten-thay-doi`, commit cả thư mục migration.
- Bảng/cột trong PostgreSQL dạng `snake_case`, trong code dạng `camelCase`.
- Thời gian lưu UTC, hiển thị giờ Việt Nam. Tiền là số nguyên VNĐ.
- PR có migration phải được người phụ trách database duyệt.

**Đặt tên nhánh và commit**

- Nhánh: `feature/<số-issue>-<mô-tả>`, `fix/<số-issue>-<mô-tả>`. Ví dụ `feature/12-giu-ghe`.
- Commit: `feat(booking): giữ ghế bằng Redis`, `fix(auth): ...`, `docs: ...`.

## Quy trình làm việc với Git

```bash
git switch develop
git pull
git switch -c feature/12-ten-tinh-nang
# ... code, commit ...
git fetch origin
git rebase origin/develop
git push -u origin feature/12-ten-tinh-nang
```

Mở Pull Request vào `develop`, điền mẫu PR, chờ CI xanh và 1 người duyệt → **Squash and merge**. Cuối mỗi tuần gộp `develop` vào `main` và gắn tag `v0.x`.

## Luồng đặt vé (cho frontend)

1. `GET /api/trips?from=Hồ Chí Minh&to=Đà Lạt&date=2026-12-01` – tìm chuyến
2. `GET /api/trips/:id/seats` – sơ đồ ghế (AVAILABLE / HELD / HELD_BY_ME / SOLD)
3. Socket.IO: kết nối `/seats`, `emit('join', { tripId })`, nghe `seats:update`
4. `POST /api/trips/:id/holds` `{ seatIds }` – giữ ghế (10 phút)
5. `POST /api/bookings` – tạo đơn (8 phút để thanh toán)
6. `POST /api/payments` `{ bookingCode }` → `paymentUrl` → chuyển khách sang trang thanh toán
7. Cổng thanh toán gọi `GET /api/payments/callback` → ghế chuyển SOLD, đơn PAID
8. `GET /api/bookings/me`, `POST /api/bookings/lookup`, `POST /api/bookings/:code/cancel`

Khi `PAYMENT_PROVIDER=mock`, mở `paymentUrl` và thêm `&result=success` (hoặc `fail`) để giả lập thanh toán.

## Kiểm thử

```bash
npm test
```

Kiểm thử đồng thời (server chạy với `DISABLE_THROTTLE=true`, đã seed):

```bash
npm run test:concurrency
```

## Việc còn để ngỏ (TODO)

- Cổng thanh toán thật (VNPay/MoMo sandbox): viết class cài `PaymentProvider` trong `payment/providers/`.
- Gửi email vé điện tử + mã QR sau khi thanh toán (`BookingService.confirmPaid`).
- Hoàn tiền thật khi hủy vé; xử lý vé khi hủy chuyến.
- Quên mật khẩu, refresh token; thống kê doanh thu; tìm kiếm không dấu.
- Dọn đơn chờ thanh toán đã hết hạn (hiện chỉ hiển thị EXPIRED khi đọc).
