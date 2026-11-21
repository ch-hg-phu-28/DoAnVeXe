import { ExecutionContext, SetMetadata, createParamDecorator } from '@nestjs/common';
import { Role } from '@prisma/client';

export interface AuthUser {
  id: number;
  email: string;
  role: Role;
}

export const IS_PUBLIC_KEY = 'isPublic';
/** Route không cần đăng nhập. Nếu có gửi token hợp lệ thì vẫn đọc được user. */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);

export const ROLES_KEY = 'roles';
/** Chỉ các vai trò này được gọi route. Ví dụ: @Roles(Role.ADMIN) */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** Lấy user đang đăng nhập: @CurrentUser() user: AuthUser */
export const CurrentUser = createParamDecorator((_data: unknown, ctx: ExecutionContext) => {
  const req = ctx.switchToHttp().getRequest<{ user?: AuthUser }>();
  return req.user;
});
