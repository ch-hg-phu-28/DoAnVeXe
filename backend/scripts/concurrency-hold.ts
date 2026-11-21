/**
 * KIỂM THỬ ĐỒNG THỜI: N người cùng bấm giữ MỘT ghế cùng lúc → chỉ được đúng 1 người thành công.
 * Cần server đang chạy với DISABLE_THROTTLE=true (tất cả yêu cầu đến từ 1 máy) và đã seed.
 * Chạy: npm run test:concurrency  (tùy chọn: N=50 API=http://localhost:3000/api)
 */
const API = process.env.API ?? 'http://localhost:3000/api';
const N = Number(process.env.N ?? 30);

async function call(method: string, path: string, body?: unknown, token?: string) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  return { status: res.status, json: (await res.json()) as any };
}

async function main() {
  // 1. Lấy một chuyến còn ghế
  const date = new Date(Date.now() + 7 * 3600_000 + 86_400_000).toISOString().slice(0, 10); // ngày mai giờ VN
  const search = await call('GET', `/trips?from=${encodeURIComponent('Hồ Chí Minh')}&to=${encodeURIComponent('Đà Lạt')}&date=${date}`);
  const trip = search.json.data?.[0];
  if (!trip) throw new Error('Không tìm thấy chuyến ngày mai – đã chạy seed chưa?');
  const map = await call('GET', `/trips/${trip.id}/seats`);
  const seat = map.json.data.seats.find((s: any) => s.status === 'AVAILABLE');
  console.log(`Chuyến #${trip.id}, ghế ${seat.code} (seatId ${seat.seatId}), ${N} người cùng giữ...`);

  // 2. Tạo N tài khoản
  const stamp = Date.now();
  const tokens: string[] = [];
  for (let i = 0; i < N; i++) {
    const r = await call('POST', '/auth/register', {
      fullName: `Tester ${i}`,
      email: `tester${stamp}_${i}@example.com`,
      phone: '0911111111',
      password: 'Matkhau@123',
    });
    if (!r.json.success) throw new Error(`Đăng ký thất bại: ${JSON.stringify(r.json)} (có thể bị giới hạn tần suất, giảm N)`);
    tokens.push(r.json.data.accessToken);
  }

  // 3. Bắn N yêu cầu giữ cùng lúc
  const results = await Promise.all(tokens.map((t) => call('POST', `/trips/${trip.id}/holds`, { seatIds: [seat.seatId] }, t)));
  const ok = results.filter((r) => r.json.success).length;
  const taken = results.filter((r) => r.json.error?.code === 'SEAT_TAKEN').length;
  const other = results.length - ok - taken;
  console.log(`Thành công: ${ok} | SEAT_TAKEN: ${taken} | lỗi khác: ${other}`);
  if (other) console.log('Ví dụ lỗi khác:', results.find((r) => !r.json.success && r.json.error?.code !== 'SEAT_TAKEN')?.json);
  console.log(ok === 1 ? 'ĐẠT: chỉ 1 người giữ được ghế' : 'KHÔNG ĐẠT');
  process.exit(ok === 1 ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
