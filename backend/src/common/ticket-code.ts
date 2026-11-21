import { randomBytes } from 'crypto';

// Bỏ các ký tự dễ nhầm: 0/O, 1/I/L
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/** Mã vé ngẫu nhiên, khó đoán (chống dò mã vé người khác). Ví dụ: VE7K3QZ9MP */
export function generateTicketCode(length = 8): string {
  const bytes = randomBytes(length);
  let out = '';
  for (let i = 0; i < length; i++) out += ALPHABET[bytes[i] % ALPHABET.length];
  return `VE${out}`;
}

/** Che bớt số điện thoại khi trả về cho người tra cứu: 0901234567 → 090****567 */
export function maskPhone(phone: string): string {
  if (phone.length < 7) return '***';
  return `${phone.slice(0, 3)}****${phone.slice(-3)}`;
}
