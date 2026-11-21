import { HttpException, HttpStatus } from '@nestjs/common';

/**
 * Danh sách mã lỗi dùng chung cho cả nhóm. Frontend và chatbot dựa vào `code` để xử lý,
 * không dựa vào câu chữ trong `message`. Thêm mã mới thì thêm vào đây.
 */
export enum ErrorCode {
  VALIDATION_FAILED = 'VALIDATION_FAILED',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  INTERNAL_ERROR = 'INTERNAL_ERROR',

  EMAIL_TAKEN = 'EMAIL_TAKEN',
  INVALID_CREDENTIALS = 'INVALID_CREDENTIALS',

  TRIP_NOT_BOOKABLE = 'TRIP_NOT_BOOKABLE',
  INVALID_STOP = 'INVALID_STOP',
  SEAT_NOT_FOUND = 'SEAT_NOT_FOUND',
  SEAT_TAKEN = 'SEAT_TAKEN',
  SEAT_NOT_HELD = 'SEAT_NOT_HELD',
  TOO_MANY_SEATS = 'TOO_MANY_SEATS',

  BOOKING_NOT_PAYABLE = 'BOOKING_NOT_PAYABLE',
  BOOKING_NOT_CANCELLABLE = 'BOOKING_NOT_CANCELLABLE',

  PAYMENT_INVALID_SIGNATURE = 'PAYMENT_INVALID_SIGNATURE',
  PAYMENT_AMOUNT_MISMATCH = 'PAYMENT_AMOUNT_MISMATCH',
}

export class AppException extends HttpException {
  constructor(
    public readonly code: ErrorCode,
    message: string,
    status: HttpStatus = HttpStatus.BAD_REQUEST,
    public readonly details?: unknown,
  ) {
    super({ code, message, details }, status);
  }
}

export const notFound = (what: string) =>
  new AppException(ErrorCode.NOT_FOUND, `Không tìm thấy ${what}`, HttpStatus.NOT_FOUND);
