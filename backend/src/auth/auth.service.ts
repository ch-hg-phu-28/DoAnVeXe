import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { createHash, randomBytes } from 'crypto';
import { AppException, ErrorCode, notFound } from '../common/errors';
import { MailService, mailLayout } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto, SavedPassengerDto, UpdateProfileDto } from './dto/auth.dto';

const RESET_TTL_MINUTES = 30;
const MAX_SAVED_PASSENGERS = 10;
const sha256 = (s: string) => createHash('sha256').update(s).digest('hex');

// TODO: refresh token, khóa tạm khi đăng nhập sai nhiều lần.
@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly frontendUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {
    this.frontendUrl = config.get<string>('FRONTEND_URL') ?? 'http://localhost:5173';
  }

  async register(dto: RegisterDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      const user = await this.prisma.user.create({
        data: { fullName: dto.fullName, email: dto.email.toLowerCase(), phone: dto.phone, passwordHash },
      });
      return this.issueToken(user);
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002') {
        throw new AppException(ErrorCode.EMAIL_TAKEN, 'Email đã được đăng ký', HttpStatus.CONFLICT);
      }
      throw e;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({ where: { email: dto.email.toLowerCase() } });
    if (!user || !(await bcrypt.compare(dto.password, user.passwordHash))) {
      throw new AppException(ErrorCode.INVALID_CREDENTIALS, 'Email hoặc mật khẩu không đúng', HttpStatus.UNAUTHORIZED);
    }
    if (user.isLocked) {
      throw new AppException(ErrorCode.ACCOUNT_LOCKED, 'Tài khoản đã bị khóa. Vui lòng liên hệ hỗ trợ.', HttpStatus.FORBIDDEN);
    }
    return this.issueToken(user);
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('tài khoản');
    return this.toPublic(user);
  }

  // ---------- F03 hồ sơ, đổi mật khẩu ----------

  async updateProfile(userId: number, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({ where: { id: userId }, data: dto });
    return this.toPublic(user);
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('tài khoản');
    if (!(await bcrypt.compare(dto.currentPassword, user.passwordHash))) {
      throw new AppException(ErrorCode.WRONG_PASSWORD, 'Mật khẩu hiện tại không đúng');
    }
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash: await bcrypt.hash(dto.newPassword, 10) } });
    return { message: 'Đã đổi mật khẩu' };
  }

  // ---------- F02 quên mật khẩu ----------

  /** Luôn trả về cùng một thông báo, không để lộ email có tồn tại hay không. */
  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email: email.toLowerCase() } });
    if (user && !user.isLocked) {
      const token = randomBytes(32).toString('hex');
      await this.prisma.passwordReset.create({
        data: { userId: user.id, tokenHash: sha256(token), expiresAt: new Date(Date.now() + RESET_TTL_MINUTES * 60_000) },
      });
      const link = `${this.frontendUrl}/dat-lai-mat-khau?token=${token}`;
      const sent = await this.mail.send({
        to: user.email,
        subject: 'Đặt lại mật khẩu',
        html: mailLayout(
          'Đặt lại mật khẩu',
          `<p>Xin chào ${user.fullName},</p><p>Bấm vào nút dưới đây để đặt mật khẩu mới. Đường dẫn chỉ dùng được 1 lần trong ${RESET_TTL_MINUTES} phút.</p>
<p><a href="${link}" style="display:inline-block;background:#0b7a5e;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Đặt lại mật khẩu</a></p>
<p style="color:#5f6f6c">Nếu bạn không yêu cầu, hãy bỏ qua email này.</p>`,
        ),
      });
      // Máy dev chưa cấu hình SMTP: in đường dẫn ra log để thử được luồng đặt lại mật khẩu
      if (!sent && this.config.get('NODE_ENV') !== 'production') {
        this.logger.log(`[chưa cấu hình SMTP] Đường dẫn đặt lại mật khẩu của ${user.email}: ${link}`);
      }
    }
    return { message: 'Nếu email đã đăng ký, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu.' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const rec = await this.prisma.passwordReset.findUnique({ where: { tokenHash: sha256(dto.token) } });
    if (!rec || rec.usedAt || rec.expiresAt <= new Date()) {
      throw new AppException(ErrorCode.INVALID_TOKEN, 'Đường dẫn đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: rec.userId }, data: { passwordHash } }),
      this.prisma.passwordReset.update({ where: { id: rec.id }, data: { usedAt: new Date() } }),
    ]);
    return { message: 'Đã đặt mật khẩu mới. Bạn có thể đăng nhập.' };
  }

  // ---------- F04 hành khách thường đi ----------

  listPassengers(userId: number) {
    return this.prisma.savedPassenger.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
  }

  async addPassenger(userId: number, dto: SavedPassengerDto) {
    if ((await this.prisma.savedPassenger.count({ where: { userId } })) >= MAX_SAVED_PASSENGERS) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, `Tối đa ${MAX_SAVED_PASSENGERS} hành khách thường đi`);
    }
    return this.prisma.savedPassenger.create({ data: { ...dto, userId } });
  }

  async updatePassenger(userId: number, id: number, dto: SavedPassengerDto) {
    await this.ownPassenger(userId, id);
    return this.prisma.savedPassenger.update({ where: { id }, data: dto });
  }

  async removePassenger(userId: number, id: number) {
    await this.ownPassenger(userId, id);
    await this.prisma.savedPassenger.delete({ where: { id } });
    return { id };
  }

  /** Chỉ chủ tài khoản mới sửa/xóa được; của người khác thì báo không tìm thấy. */
  private async ownPassenger(userId: number, id: number) {
    const p = await this.prisma.savedPassenger.findUnique({ where: { id } });
    if (!p || p.userId !== userId) throw notFound('hành khách');
    return p;
  }

  private async issueToken(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, user: this.toPublic(user) };
  }

  private toPublic(user: User) {
    return { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role };
  }
}
