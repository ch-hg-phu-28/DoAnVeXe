export const PAYMENT_PROVIDER = Symbol('PAYMENT_PROVIDER');

export interface CreatePaymentInput {
  txnRef: string;
  amount: number;
  orderInfo: string;
  ipAddr: string;
}

export interface VerifiedCallback {
  txnRef: string;
  success: boolean;
  amount: number;
}

/**
 * Mỗi cổng thanh toán (mock, VNPay sandbox, MoMo test…) là một class cài interface này.
 * Đổi cổng chỉ cần đổi biến PAYMENT_PROVIDER trong .env, không sửa BookingService.
 */
export interface PaymentProvider {
  readonly name: string;
  /** Trả về URL để chuyển khách sang trang thanh toán */
  createPaymentUrl(input: CreatePaymentInput): string;
  /**
   * Kiểm tra chữ ký dữ liệu cổng thanh toán gửi về. Sai chữ ký → ném lỗi.
   * KHÔNG tin tham số trên URL nếu chưa kiểm tra chữ ký (khó khăn #15).
   */
  verifyCallback(params: Record<string, string>): VerifiedCallback;
}
