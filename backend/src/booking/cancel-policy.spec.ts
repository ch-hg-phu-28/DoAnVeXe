import { quoteCancel } from './cancel-policy';

describe('quoteCancel – chính sách hủy vé mẫu', () => {
  const depart = new Date('2026-12-01T22:00:00+07:00');
  const hoursBefore = (h: number) => new Date(depart.getTime() - h * 3_600_000);

  it('trước 24 giờ: phí 10%', () => {
    expect(quoteCancel(300_000, depart, hoursBefore(30))).toEqual({ allowed: true, feePercent: 10, fee: 30_000, refund: 270_000 });
  });

  it('đúng mốc 24 giờ vẫn tính 10%', () => {
    expect(quoteCancel(300_000, depart, hoursBefore(24)).feePercent).toBe(10);
  });

  it('từ 4 đến dưới 24 giờ: phí 30%', () => {
    expect(quoteCancel(300_000, depart, hoursBefore(5))).toEqual({ allowed: true, feePercent: 30, fee: 90_000, refund: 210_000 });
  });

  it('dưới 4 giờ: không được hủy', () => {
    expect(quoteCancel(300_000, depart, hoursBefore(3)).allowed).toBe(false);
  });

  it('đã khởi hành: không được hủy', () => {
    expect(quoteCancel(300_000, depart, hoursBefore(-1)).allowed).toBe(false);
  });
});
