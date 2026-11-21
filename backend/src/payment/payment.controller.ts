import { Body, Controller, Get, HttpStatus, Inject, Ip, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AuthUser, CurrentUser, Public } from '../common/decorators/auth.decorators';
import { AppException, ErrorCode } from '../common/errors';
import { CreatePaymentDto, MockPayQuery } from './dto/payment.dto';
import { PaymentService } from './payment.service';
import { MockPaymentProvider } from './providers/mock.provider';
import { PAYMENT_PROVIDER, PaymentProvider } from './providers/payment-provider';

@ApiTags('Thanh toán')
@ApiBearerAuth()
@Controller('payments')
export class PaymentController {
  constructor(
    private readonly payments: PaymentService,
    @Inject(PAYMENT_PROVIDER) private readonly provider: PaymentProvider,
  ) {}

  /** Tạo giao dịch và lấy URL chuyển sang trang thanh toán */
  @Post()
  create(@Body() dto: CreatePaymentDto, @CurrentUser() user: AuthUser, @Ip() ip: string) {
    return this.payments.create(dto.bookingCode, user.id, ip);
  }

  /**
   * Cổng thanh toán gọi về sau khi khách trả tiền.
   * Với VNPay thật: có thêm URL IPN (server-to-server) – xử lý giống hàm này.
   */
  @Public()
  @Get('callback')
  callback(@Query() query: Record<string, string>) {
    return this.payments.handleCallback(query);
  }

  /**
   * CHỈ DÙNG KHI PAYMENT_PROVIDER=mock: giả lập khách trả tiền thành công/thất bại.
   * Ví dụ: GET /api/payments/mock/pay?txnRef=...&amount=...&result=success
   */
  @Public()
  @Get('mock/pay')
  mockPay(@Query() q: MockPayQuery) {
    if (!(this.provider instanceof MockPaymentProvider)) {
      throw new AppException(ErrorCode.NOT_FOUND, 'Không có chức năng này', HttpStatus.NOT_FOUND);
    }
    const status = q.result === 'success' ? 'success' : 'fail';
    const amount = Number(q.amount);
    return this.payments.handleCallback({
      txnRef: q.txnRef,
      amount: String(amount),
      status,
      signature: this.provider.sign(q.txnRef, amount, status),
    });
  }
}
