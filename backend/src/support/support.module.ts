import { Body, Controller, Get, HttpStatus, Injectable, Module, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role, SupportStatus, SupportType } from '@prisma/client';
import { IsBoolean, IsEnum, IsIn, IsOptional, IsString, Length, Matches } from 'class-validator';
import { AuthUser, CurrentUser, Public, Roles } from '../common/decorators/auth.decorators';
import { AppException, ErrorCode, notFound } from '../common/errors';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

/** Khách gửi yêu cầu hỗ trợ / khiếu nại */
export class CreateSupportDto {
  /** QUESTION (hỏi đáp) hoặc COMPLAINT (khiếu nại). HANDOFF dành cho chatbot chuyển nhân viên (F22). */
  @IsOptional() @IsEnum(SupportType) type?: SupportType;
  @IsString() @Length(3, 150) subject: string;
  @IsString() @Length(5, 3000) message: string;
  /** Mã vé liên quan (nếu có) */
  @IsOptional() @IsString() @Length(6, 20) bookingCode?: string;
  /** Bắt buộc khi chưa đăng nhập, để nhân viên gọi lại */
  @IsOptional() @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0' }) contactPhone?: string;
  @IsOptional() @IsString() chatSessionId?: string;
}

/** Nhân viên / quản trị trả lời */
export class ReplySupportDto {
  @IsString() @Length(2, 3000) reply: string;
  /** true: trả lời xong thì đóng yêu cầu */
  @IsOptional() @IsBoolean() close?: boolean;
}

export class ListSupportQuery {
  @IsOptional() @IsIn(Object.values(SupportStatus), { message: 'Trạng thái phải là OPEN, ANSWERED hoặc CLOSED' }) status?: SupportStatus;
}

const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);

@Injectable()
export class SupportService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /** F34: gửi yêu cầu. Đăng nhập thì gắn vào tài khoản; chưa đăng nhập thì phải để lại số điện thoại. */
  async create(dto: CreateSupportDto, user?: AuthUser) {
    if (!user && !dto.contactPhone) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Vui lòng để lại số điện thoại để nhân viên liên hệ', HttpStatus.BAD_REQUEST);
    }
    return this.prisma.supportRequest.create({
      data: { ...dto, bookingCode: dto.bookingCode?.trim().toUpperCase(), type: dto.type ?? SupportType.QUESTION, userId: user?.id },
    });
  }

  /** Khách xem các yêu cầu của mình, trạng thái và câu trả lời */
  mine(userId: number) {
    return this.prisma.supportRequest.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });
  }

  /** Nhân viên / quản trị xem danh sách, yêu cầu chưa xử lý lên trước */
  adminList(status?: SupportStatus) {
    return this.prisma.supportRequest.findMany({
      where: { status },
      include: { user: { select: { fullName: true, email: true, phone: true } }, repliedBy: { select: { fullName: true } } },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
      take: 200,
    });
  }

  /** Trả lời yêu cầu; khách có tài khoản thì được gửi email câu trả lời */
  async reply(id: number, staff: AuthUser, dto: ReplySupportDto) {
    const r = await this.prisma.supportRequest.findUnique({ where: { id }, include: { user: true } });
    if (!r) throw notFound('yêu cầu hỗ trợ');
    const updated = await this.prisma.supportRequest.update({
      where: { id },
      data: { reply: dto.reply, repliedAt: new Date(), repliedById: staff.id, status: dto.close ? SupportStatus.CLOSED : SupportStatus.ANSWERED },
    });
    if (r.user?.email) {
      await this.mail.send({
        to: r.user.email,
        subject: `Trả lời yêu cầu hỗ trợ: ${r.subject}`,
        html: `<p><b>Bạn hỏi:</b> ${escapeHtml(r.message)}</p><p><b>Nhân viên trả lời:</b> ${escapeHtml(dto.reply)}</p>`,
      });
    }
    return updated;
  }
}

@ApiTags('Hỗ trợ khách hàng')
@ApiBearerAuth()
@Controller()
export class SupportController {
  constructor(private readonly support: SupportService) {}

  /** F34: gửi yêu cầu hỗ trợ / khiếu nại. Không đăng nhập thì phải để lại số điện thoại. */
  @Public()
  @Post('support')
  create(@Body() dto: CreateSupportDto, @CurrentUser() user?: AuthUser) {
    return this.support.create(dto, user);
  }

  @Get('support/me')
  mine(@CurrentUser() user: AuthUser) {
    return this.support.mine(user.id);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Get('admin/support')
  list(@Query() q: ListSupportQuery) {
    return this.support.adminList(q.status);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Post('admin/support/:id/reply')
  reply(@Param('id', ParseIntPipe) id: number, @CurrentUser() user: AuthUser, @Body() dto: ReplySupportDto) {
    return this.support.reply(id, user, dto);
  }
}

@Module({ controllers: [SupportController], providers: [SupportService], exports: [SupportService] })
export class SupportModule {}
