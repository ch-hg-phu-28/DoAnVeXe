/**
 * DỮ LIỆU MẪU cho máy dev và bản demo (tên điểm đón, giá vé, giờ chạy đều do nhóm tự đặt, không phải dữ liệu thật).
 * Chạy: npm run db:seed   (XÓA dữ liệu cũ trong các bảng rồi tạo lại)
 */
import { PrismaClient, Role, StopType } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { generateSeats } from '../src/catalog/seat-layout.util';

const prisma = new PrismaClient();

/** Giờ Việt Nam → Date (UTC) */
function vnTime(dayOffset: number, hour: number, minute = 0): Date {
  const now = new Date();
  const vnToday = new Date(now.getTime() + 7 * 3600_000).toISOString().slice(0, 10);
  const base = new Date(`${vnToday}T00:00:00+07:00`);
  return new Date(base.getTime() + dayOffset * 86_400_000 + (hour * 60 + minute) * 60_000);
}

async function main() {
  // Xóa theo thứ tự phụ thuộc
  await prisma.$transaction([
    prisma.payment.deleteMany(),
    prisma.bookingItem.deleteMany(),
    prisma.tripSeat.deleteMany(),
    prisma.booking.deleteMany(),
    prisma.trip.deleteMany(),
    prisma.bus.deleteMany(),
    prisma.seat.deleteMany(),
    prisma.seatLayout.deleteMany(),
    prisma.stop.deleteMany(),
    prisma.route.deleteMany(),
    prisma.operator.deleteMany(),
    prisma.chatMessage.deleteMany(),
    prisma.chatSession.deleteMany(),
    prisma.kbDocument.deleteMany(),
    prisma.user.deleteMany(),
  ]);

  const passwordHash = await bcrypt.hash(process.env.SEED_PASSWORD ?? 'Matkhau@123', 10);
  await prisma.user.createMany({
    data: [
      { fullName: 'Quản trị viên', email: 'admin@example.com', phone: '0900000001', passwordHash, role: Role.ADMIN },
      { fullName: 'Nhân viên bán vé', email: 'staff@example.com', phone: '0900000002', passwordHash, role: Role.STAFF },
      { fullName: 'Khách hàng mẫu', email: 'khach@example.com', phone: '0900000003', passwordHash, role: Role.CUSTOMER },
    ],
  });

  const operator = await prisma.operator.create({ data: { name: 'Nhà xe Demo', hotline: '1900 0000 (mẫu)' } });

  const sleeper = await prisma.seatLayout.create({
    data: { name: 'Giường nằm 2 tầng 36 chỗ', floors: 2, rows: 6, cols: 3, seats: { create: generateSeats(2, 6, 3) } },
    include: { seats: true },
  });
  const limo = await prisma.seatLayout.create({
    data: { name: 'Limousine 9 chỗ', floors: 1, rows: 3, cols: 3, seats: { create: generateSeats(1, 3, 3) } },
    include: { seats: true },
  });

  const busSleeper = await prisma.bus.create({
    data: { operatorId: operator.id, plateNumber: '51B-000.01', busType: 'Giường nằm 36 chỗ', seatLayoutId: sleeper.id },
  });
  const busLimo = await prisma.bus.create({
    data: { operatorId: operator.id, plateNumber: '51B-000.02', busType: 'Limousine 9 chỗ', seatLayoutId: limo.id },
  });

  const dalat = await prisma.route.create({
    data: {
      operatorId: operator.id,
      originCity: 'TP. Hồ Chí Minh',
      destinationCity: 'Đà Lạt',
      durationMinutes: 420,
      stops: {
        create: [
          { name: 'Văn phòng Quận 1 (mẫu)', address: 'Quận 1, TP. Hồ Chí Minh', type: StopType.PICKUP, orderNo: 1, offsetMinutes: 0 },
          { name: 'Điểm đón Thủ Đức (mẫu)', address: 'TP. Thủ Đức, TP. Hồ Chí Minh', type: StopType.PICKUP, orderNo: 2, offsetMinutes: 40 },
          { name: 'Văn phòng trung tâm Đà Lạt (mẫu)', address: 'Phường 1, Đà Lạt', type: StopType.DROPOFF, orderNo: 3, offsetMinutes: 420 },
        ],
      },
    },
  });
  const cantho = await prisma.route.create({
    data: {
      operatorId: operator.id,
      originCity: 'TP. Hồ Chí Minh',
      destinationCity: 'Cần Thơ',
      durationMinutes: 210,
      stops: {
        create: [
          { name: 'Văn phòng Quận 5 (mẫu)', address: 'Quận 5, TP. Hồ Chí Minh', type: StopType.PICKUP, orderNo: 1, offsetMinutes: 0 },
          { name: 'Văn phòng Ninh Kiều (mẫu)', address: 'Ninh Kiều, Cần Thơ', type: StopType.DROPOFF, orderNo: 2, offsetMinutes: 210 },
        ],
      },
    },
  });

  // Chuyến cho 7 ngày tới
  const plans = [
    { route: dalat, bus: busSleeper, seats: sleeper.seats, hours: [7, 13, 22], price: 300_000, minutes: 420 },
    { route: cantho, bus: busLimo, seats: limo.seats, hours: [6, 12, 18], price: 200_000, minutes: 210 },
  ];
  let tripCount = 0;
  for (let day = 0; day < 7; day++) {
    for (const p of plans) {
      for (const hour of p.hours) {
        const departAt = vnTime(day, hour);
        if (departAt <= new Date()) continue;
        const trip = await prisma.trip.create({
          data: {
            routeId: p.route.id,
            busId: p.bus.id,
            departAt,
            arriveAt: new Date(departAt.getTime() + p.minutes * 60_000),
            basePrice: p.price,
          },
        });
        await prisma.tripSeat.createMany({ data: p.seats.map((s) => ({ tripId: trip.id, seatId: s.id })) });
        tripCount++;
      }
    }
  }

  await prisma.kbDocument.createMany({
    data: [
      {
        title: 'Chính sách hủy vé (mẫu của nhóm)',
        content: 'Hủy trước giờ khởi hành từ 24 giờ: phí 10% giá vé. Từ 4 đến dưới 24 giờ: phí 30%. Dưới 4 giờ: không hủy được.',
      },
      {
        title: 'Thời gian giữ ghế',
        content: 'Ghế được giữ 10 phút sau khi chọn. Sau khi tạo đơn, khách có 8 phút để thanh toán.',
      },
      { title: 'Hành lý (mẫu)', content: 'Mỗi khách được mang 20 kg hành lý ký gửi và 1 túi xách nhỏ.' },
    ],
  });

  console.log(`Seed xong: 3 tài khoản, 2 tuyến, 2 xe, ${tripCount} chuyến, 3 tài liệu chính sách.`);
  console.log('Đăng nhập thử: admin@example.com / khach@example.com, mật khẩu = SEED_PASSWORD trong .env');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
