import { HttpStatus } from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { AppException, ErrorCode } from '../../common/errors';
import { CreatePaymentInput, PaymentProvider, VerifiedCallback } from './payment-provider';

/**
 * Cổng thanh toán GIẢ LẬP để phát triển và demo khi chưa có tài khoản sandbox.
 * Có ký HMAC giống cổng thật để luồng kiểm tra chữ ký vẫn được chạy.
 */
export class MockPaymentProvider implements PaymentProvider {
  readonly name = 'mock';

  constructor(
    private readonly secret: string,
    private readonly appUrl: string,
  ) {}

  sign(txnRef: string, amount: number, status: string): string {
    return createHmac('sha256', this.secret).update(`${txnRef}|${amount}|${status}`).digest('hex');
  }

  createPaymentUrl(input: CreatePaymentInput): string {
    const q = new URLSearchParams({ txnRef: input.txnRef, amount: String(input.amount) });
    return `${this.appUrl}/api/payments/mock/pay?${q.toString()}`;
  }

  verifyCallback(params: Record<string, string>): VerifiedCallback {
    const { txnRef, amount, status, signature } = params;
    if (!txnRef || !amount || !status || !signature) {
      throw new AppException(ErrorCode.PAYMENT_INVALID_SIGNATURE, 'Thiếu dữ liệu thanh toán', HttpStatus.BAD_REQUEST);
    }
    const expected = Buffer.from(this.sign(txnRef, Number(amount), status));
    const given = Buffer.from(signature);
    if (expected.length !== given.length || !timingSafeEqual(expected, given)) {
      throw new AppException(ErrorCode.PAYMENT_INVALID_SIGNATURE, 'Chữ ký thanh toán không hợp lệ', HttpStatus.BAD_REQUEST);
    }
    return { txnRef, amount: Number(amount), success: status === 'success' };
  }
}
