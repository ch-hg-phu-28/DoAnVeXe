import { HttpStatus, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma, User } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { AppException, ErrorCode, notFound } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import { LoginDto, RegisterDto } from './dto/auth.dto';

// TODO (TV3): quên mật khẩu, refresh token, đổi mật khẩu, khóa tạm khi đăng nhập sai nhiều lần.
@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

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
    return this.issueToken(user);
  }

  async me(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw notFound('tài khoản');
    return this.toPublic(user);
  }

  private async issueToken(user: User) {
    const accessToken = await this.jwt.signAsync({ sub: user.id, email: user.email, role: user.role });
    return { accessToken, user: this.toPublic(user) };
  }

  private toPublic(user: User) {
    return { id: user.id, fullName: user.fullName, email: user.email, phone: user.phone, role: user.role };
  }
}
