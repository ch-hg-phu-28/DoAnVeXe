import { generateTicketCode, maskPhone } from '../common/ticket-code';
import { generateSeats, vnDayRange } from './seat-layout.util';

describe('generateSeats', () => {
  it('xe giường nằm 2 tầng 6 hàng 3 cột có 36 ghế A01..A18, B01..B18', () => {
    const seats = generateSeats(2, 6, 3);
    expect(seats).toHaveLength(36);
    expect(seats[0]).toEqual({ code: 'A01', floor: 1, rowNo: 1, colNo: 1 });
    expect(seats[17].code).toBe('A18');
    expect(seats[18]).toEqual({ code: 'B01', floor: 2, rowNo: 1, colNo: 1 });
    expect(new Set(seats.map((s) => s.code)).size).toBe(36);
  });
});

describe('vnDayRange', () => {
  it('ngày theo giờ Việt Nam bắt đầu lúc 17:00 UTC hôm trước', () => {
    const { start, end } = vnDayRange('2026-12-01');
    expect(start.toISOString()).toBe('2026-11-30T17:00:00.000Z');
    expect(end.toISOString()).toBe('2026-12-01T17:00:00.000Z');
  });

  it('báo lỗi khi ngày sai', () => {
    expect(() => vnDayRange('2026-13-45')).toThrow();
  });
});

describe('ticket code & mask', () => {
  it('mã vé có tiền tố VE, 8 ký tự, không có ký tự dễ nhầm', () => {
    for (let i = 0; i < 200; i++) {
      expect(generateTicketCode()).toMatch(/^VE[ABCDEFGHJKMNPQRSTUVWXYZ2-9]{8}$/);
    }
  });

  it('che số điện thoại', () => {
    expect(maskPhone('0901234567')).toBe('090****567');
  });
});
