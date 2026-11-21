import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingModule } from '../booking/booking.module';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { MockPaymentProvider } from './providers/mock.provider';
import { PAYMENT_PROVIDER, PaymentProvider } from './providers/payment-provider';

@Module({
  imports: [BookingModule],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    {
      provide: PAYMENT_PROVIDER,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PaymentProvider => {
        const name = config.get<string>('PAYMENT_PROVIDER') ?? 'mock';
        const secret = config.getOrThrow<string>('PAYMENT_SECRET');
        const appUrl = config.get<string>('APP_URL') ?? 'http://localhost:3000';
        switch (name) {
          case 'mock':
            return new MockPaymentProvider(secret, appUrl);
          // case 'vnpay': return new VnpayProvider(...);  // TODO: viết khi có tài khoản sandbox
          default:
            throw new Error(`PAYMENT_PROVIDER "${name}" chưa được hỗ trợ`);
        }
      },
    },
  ],
})
export class PaymentModule {}
