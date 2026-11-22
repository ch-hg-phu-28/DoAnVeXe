import { Body, Controller, Get, HttpStatus, Injectable, Module, Param, ParseIntPipe, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';
import { AuthUser, CurrentUser, Roles } from '../common/decorators/auth.decorators';
import { AppException, ErrorCode, notFound } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';

export class UpdateUserDto {
  /** Đổi vai trò: CUSTOMER, STAFF, ADMIN */
  @IsOptional() @IsEnum(Role) role?: Role;
  /** Khóa / mở khóa tài khoản */
  @IsOptional() @IsBoolean() isLocked?: boolean;
}

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  // ---------- F29 quản lý người dùng, phân quyền ----------

  /** Tìm theo email, họ tên hoặc số điện thoại */
  users(q?: string) {
    const s = q?.trim();
    return this.prisma.user.findMany({
      where: s ? { OR: [{ email: { contains: s, mode: 'insensitive' } }, { fullName: { contains: s, mode: 'insensitive' } }, { phone: { contains: s } }] } : {},
      select: { id: true, fullName: true, email: true, phone: true, role: true, isLocked: true, createdAt: true, _count: { select: { bookings: true } } },
      orderBy: { id: 'asc' },
      take: 300,
    });
  }

  async updateUser(id: number, me: AuthUser, dto: UpdateUserDto) {
    if (id === me.id) throw new AppException(ErrorCode.FORBIDDEN, 'Không tự đổi quyền hoặc tự khóa chính mình', HttpStatus.FORBIDDEN);
    if (!(await this.prisma.user.findUnique({ where: { id } }))) throw notFound('người dùng');
    return this.prisma.user.update({ where: { id }, data: dto, select: { id: true, role: true, isLocked: true } });
  }
}

@ApiTags('Quản trị')
@ApiBearerAuth()
@Roles(Role.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly admin: AdminService) {}

  @Get('users')
  users(@Query('q') q?: string) {
    return this.admin.users(q);
  }

  @Patch('users/:id')
  updateUser(@Param('id', ParseIntPipe) id: number, @CurrentUser() me: AuthUser, @Body() dto: UpdateUserDto) {
    return this.admin.updateUser(id, me, dto);
  }
}

@Module({ controllers: [AdminController], providers: [AdminService] })
export class AdminModule {}
