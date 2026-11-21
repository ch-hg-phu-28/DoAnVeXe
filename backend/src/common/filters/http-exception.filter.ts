import { ArgumentsHost, Catch, ExceptionFilter, HttpException, Logger } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { Response } from 'express';
import { AppException, ErrorCode } from '../errors';

const STATUS_TO_CODE: Record<number, ErrorCode> = {
  400: ErrorCode.VALIDATION_FAILED,
  401: ErrorCode.UNAUTHORIZED,
  403: ErrorCode.FORBIDDEN,
  404: ErrorCode.NOT_FOUND,
  409: ErrorCode.CONFLICT,
  429: ErrorCode.RATE_LIMITED,
};

/**
 * Mọi lỗi trả về cùng một dạng:
 * { "success": false, "error": { "code": "SEAT_TAKEN", "message": "...", "details": ... } }
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') return;
    const res = host.switchToHttp().getResponse<Response>();

    let status = 500;
    let code = ErrorCode.INTERNAL_ERROR;
    let message = 'Lỗi hệ thống, vui lòng thử lại sau';
    let details: unknown;

    if (exception instanceof AppException) {
      status = exception.getStatus();
      code = exception.code;
      message = exception.message;
      details = exception.details;
    } else if (exception instanceof HttpException) {
      status = exception.getStatus();
      code = STATUS_TO_CODE[status] ?? ErrorCode.INTERNAL_ERROR;
      const body = exception.getResponse() as string | { message?: string | string[] };
      if (typeof body === 'string') {
        message = body;
      } else if (Array.isArray(body.message)) {
        message = 'Dữ liệu gửi lên không hợp lệ';
        details = body.message;
      } else {
        message = body.message ?? exception.message;
      }
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2002') {
      status = 409;
      code = ErrorCode.CONFLICT;
      message = 'Dữ liệu bị trùng';
      details = exception.meta;
    } else if (exception instanceof Prisma.PrismaClientKnownRequestError && exception.code === 'P2003') {
      status = 409;
      code = ErrorCode.CONFLICT;
      message = 'Dữ liệu đang được dùng ở nơi khác, không thể xóa hoặc sửa';
    } else {
      this.logger.error(exception instanceof Error ? exception.stack : String(exception));
    }

    res.status(status).json({ success: false, error: { code, message, details } });
  }
}
