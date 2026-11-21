import { CanActivate, ExecutionContext, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { AuthUser, IS_PUBLIC_KEY } from '../decorators/auth.decorators';
import { AppException, ErrorCode } from '../errors';

interface JwtPayload {
  sub: number;
  email: string;
  role: AuthUser['role'];
}

/**
 * Guard toàn cục: mọi route đều cần đăng nhập, trừ route có @Public().
 * Route @Public() vẫn đọc token nếu có (ví dụ sơ đồ ghế cần biết ghế nào "của tôi").
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    if (ctx.getType() !== 'http') return true;
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [ctx.getHandler(), ctx.getClass()]);
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined>; user?: AuthUser }>();
    const header = req.headers['authorization'];
    const token = header?.startsWith('Bearer ') ? header.slice(7) : undefined;

    if (token) {
      try {
        const payload = await this.jwt.verifyAsync<JwtPayload>(token);
        req.user = { id: payload.sub, email: payload.email, role: payload.role };
        return true;
      } catch {
        if (!isPublic) throw new AppException(ErrorCode.UNAUTHORIZED, 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn', HttpStatus.UNAUTHORIZED);
        return true;
      }
    }
    if (isPublic) return true;
    throw new AppException(ErrorCode.UNAUTHORIZED, 'Vui lòng đăng nhập', HttpStatus.UNAUTHORIZED);
  }
}
