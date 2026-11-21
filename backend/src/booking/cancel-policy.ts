/**
 * CHÍNH SÁCH HỦY VÉ MẪU CỦA NHÓM (không phải chính sách của hãng nào).
 * Hủy trước giờ khởi hành ít nhất `minHoursBefore` giờ thì mất `feePercent`% giá vé.
 * Ít hơn mốc nhỏ nhất thì không được hủy. Sửa bảng này khi nhóm chốt chính sách.
 */
export const CANCEL_RULES: { minHoursBefore: number; feePercent: number }[] = [
  { minHoursBefore: 24, feePercent: 10 },
  { minHoursBefore: 4, feePercent: 30 },
];

export interface CancelQuote {
  allowed: boolean;
  feePercent: number;
  fee: number;
  refund: number;
}

export function quoteCancel(amount: number, departAt: Date, now: Date = new Date()): CancelQuote {
  const hoursBefore = (departAt.getTime() - now.getTime()) / 3_600_000;
  const rule = [...CANCEL_RULES].sort((a, b) => b.minHoursBefore - a.minHoursBefore).find((r) => hoursBefore >= r.minHoursBefore);
  if (!rule) return { allowed: false, feePercent: 100, fee: amount, refund: 0 };
  const fee = Math.round((amount * rule.feePercent) / 100);
  return { allowed: true, feePercent: rule.feePercent, fee, refund: amount - fee };
}
