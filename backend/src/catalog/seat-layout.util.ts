export interface SeatSpec {
  code: string;
  floor: number;
  rowNo: number;
  colNo: number;
}

/**
 * Sinh danh sách ghế cho một sơ đồ: tầng 1 dùng chữ A, tầng 2 chữ B…
 * Ví dụ 2 tầng × 6 hàng × 3 cột → A01..A18, B01..B18.
 * Sơ đồ đặc biệt (lối đi, ghế bỏ trống) thì admin sửa danh sách ghế sau khi sinh.
 */
export function generateSeats(floors: number, rows: number, cols: number): SeatSpec[] {
  const seats: SeatSpec[] = [];
  for (let floor = 1; floor <= floors; floor++) {
    const letter = String.fromCharCode(64 + floor);
    let n = 1;
    for (let rowNo = 1; rowNo <= rows; rowNo++) {
      for (let colNo = 1; colNo <= cols; colNo++) {
        seats.push({ code: `${letter}${String(n).padStart(2, '0')}`, floor, rowNo, colNo });
        n++;
      }
    }
  }
  return seats;
}

/** Khoảng thời gian [00:00, 24:00) của một ngày theo giờ Việt Nam, đổi ra UTC để truy vấn. */
export function vnDayRange(date: string): { start: Date; end: Date } {
  const start = new Date(`${date}T00:00:00+07:00`);
  if (Number.isNaN(start.getTime())) throw new Error(`Ngày không hợp lệ: ${date}`);
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000) };
}
