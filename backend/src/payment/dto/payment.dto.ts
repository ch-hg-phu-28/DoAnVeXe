import { IsIn, IsNumberString, IsString, Length } from 'class-validator';

export class CreatePaymentDto {
  @IsString() @Length(6, 20) bookingCode: string;
}

export class MockPayQuery {
  @IsString() txnRef: string;
  @IsNumberString() amount: string;
  /** success = giả lập thanh toán thành công, fail = thất bại */
  @IsIn(['success', 'fail']) result: 'success' | 'fail';
}
