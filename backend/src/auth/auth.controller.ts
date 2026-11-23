import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthUser, CurrentUser, Public } from '../common/decorators/auth.decorators';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SavedPassengerDto,
  UpdateProfileDto,
} from './dto/auth.dto';

@ApiTags('Xác thực & tài khoản')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @Post('register')
  register(@Body() dto: RegisterDto) {
    return this.auth.register(dto);
  }

  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('login')
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  /** F02: gửi email đặt lại mật khẩu */
  @Public()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.auth.forgotPassword(dto.email);
  }

  /** F02: đặt mật khẩu mới bằng mã trong email */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  /** F03: sửa họ tên, số điện thoại */
  @ApiBearerAuth()
  @Patch('me')
  updateProfile(@CurrentUser() user: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.auth.updateProfile(user.id, dto);
  }

  /** F03: đổi mật khẩu */
  @ApiBearerAuth()
  @HttpCode(200)
  @Post('change-password')
  changePassword(@CurrentUser() user: AuthUser, @Body() dto: ChangePasswordDto) {
    return this.auth.changePassword(user.id, dto);
  }

  /** F04: danh sách hành khách thường đi */
  @ApiBearerAuth()
  @Get('me/passengers')
  listPassengers(@CurrentUser() user: AuthUser) {
    return this.auth.listPassengers(user.id);
  }

  @ApiBearerAuth()
  @Post('me/passengers')
  addPassenger(@CurrentUser() user: AuthUser, @Body() dto: SavedPassengerDto) {
    return this.auth.addPassenger(user.id, dto);
  }

  @ApiBearerAuth()
  @Patch('me/passengers/:id')
  updatePassenger(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SavedPassengerDto) {
    return this.auth.updatePassenger(user.id, id, dto);
  }

  @ApiBearerAuth()
  @Delete('me/passengers/:id')
  removePassenger(@CurrentUser() user: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.auth.removePassenger(user.id, id);
  }
}
