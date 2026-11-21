import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { timingSafeEqual } from 'crypto';
import { AppException, ErrorCode } from '../errors';

/** Chỉ dịch vụ chatbot (có CHATBOT_TOOL_KEY) mới gọi được các API /api/tools. */
@Injectable()
export class ToolKeyGuard implements CanActivate {
  constructor(private readonly config: ConfigService) {}

  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const given = Buffer.from(req.headers['x-tool-key'] ?? '');
    const expected = Buffer.from(this.config.getOrThrow<string>('CHATBOT_TOOL_KEY'));
    if (given.length === expected.length && timingSafeEqual(given, expected)) return true;
    throw new AppException(ErrorCode.UNAUTHORIZED, 'Sai khóa công cụ chatbot', HttpStatus.UNAUTHORIZED);
  }
}
