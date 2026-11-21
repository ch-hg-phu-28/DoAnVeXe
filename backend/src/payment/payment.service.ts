import { HttpStatus, Inject, Injectable, Logger } from '@nestjs/common';
import { PaymentStatus, Prisma } from '@prisma/client';
import { BookingService } from '../booking/booking.service';
import { AppException, ErrorCode, notFound } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { PAYMENT_PROVIDER, PaymentProvider } from './providers/payment-provider';

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly booking: BookingService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  async create(bookingCode: string, userId: number, ipAddr: string) {
    const booking = await this.booking.getPayable(bookingCode, userId);
    const txnRef = `${booking.code}-${Date.now()}`;
    await this.prisma.payment.create({
      data: { bookingId: booking.id, provider: this.provider.name, txnRef, amount: booking.totalAmount },
    });
    const paymentUrl = this.provider.createPaymentUrl({
      txnRef,
      amount: booking.totalAmount,
      orderInfo: `Thanh toan ve ${booking.code}`,
      ipAddr,
    });
    return { paymentUrl, txnRef, amount: booking.totalAmount, expiresAt: booking.expiresAt };
  }

  /**
   * Xử lý kết quả cổng thanh toán gửi về. Gọi nhiều lần với cùng giao dịch vẫn cho cùng kết quả (idempotent):
   * chỉ lần đầu chuyển Payment từ PENDING sang SUCCESS/FAILED mới được xử lý tiếp (khó khăn #14).
   */
  async handleCallback(params: Record<string, string>) {
    const result = this.provider.verifyCallback(params);
    const payment = await this.prisma.payment.findUnique({ where: { txnRef: result.txnRef }, include: { booking: true } });
    if (!payment) throw notFound('giao dịch');
    if (payment.amount !== result.amount) {
      throw new AppException(ErrorCode.PAYMENT_AMOUNT_MISMATCH, 'Số tiền không khớp với đơn', HttpStatus.BAD_REQUEST);
    }

    const newStatus = result.success ? PaymentStatus.SUCCESS : PaymentStatus.FAILED;
    const claimed = await this.prisma.payment.updateMany({
      where: { id: payment.id, status: PaymentStatus.PENDING },
      data: {
        status: newStatus,
        paidAt: result.success ? new Date() : null,
        rawData: params as Prisma.InputJsonValue,
      },
    });
    if (claimed.count === 0) {
      this.logger.log(`Bỏ qua callback lặp lại của giao dịch ${payment.txnRef}`);
      return { bookingCode: payment.booking.code, paymentStatus: payment.status, duplicate: true };
    }

    if (!result.success) {
      // Đơn vẫn chờ thanh toán: khách có thể thử lại tới khi hết hạn.
      return { bookingCode: payment.booking.code, paymentStatus: newStatus };
    }
    const booking = await this.booking.confirmPaid(payment.bookingId);
    return { bookingCode: booking.code, paymentStatus: newStatus, bookingStatus: booking.status };
  }
}
