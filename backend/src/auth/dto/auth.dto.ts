import { Gender } from '@prisma/client';
import { IsEmail, IsEnum, IsInt, IsOptional, IsString, Length, Matches, Max, Min, MinLength } from 'class-validator';

export class RegisterDto {
  /** Họ tên */
  @IsString()
  @Length(2, 100)
  fullName: string;

  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;

  /** Số điện thoại 10 số, bắt đầu bằng 0 */
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0' })
  phone: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password: string;
}

export class LoginDto {
  @IsEmail()
  email: string;

  @IsString()
  password: string;
}

/** F03: sửa hồ sơ (email không đổi được vì dùng để đăng nhập) */
export class UpdateProfileDto {
  @IsOptional()
  @IsString()
  @Length(2, 100)
  fullName?: string;

  @IsOptional()
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0' })
  phone?: string;
}

/** F03: đổi mật khẩu, phải nhập đúng mật khẩu hiện tại */
export class ChangePasswordDto {
  @IsString()
  currentPassword: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu mới tối thiểu 8 ký tự' })
  newPassword: string;
}

/** F02: yêu cầu gửi email đặt lại mật khẩu */
export class ForgotPasswordDto {
  @IsEmail({}, { message: 'Email không hợp lệ' })
  email: string;
}

/** F02: đặt mật khẩu mới bằng mã trong email */
export class ResetPasswordDto {
  @IsString()
  @Length(20, 200)
  token: string;

  @IsString()
  @MinLength(8, { message: 'Mật khẩu tối thiểu 8 ký tự' })
  password: string;
}

/** F04: hành khách thường đi */
export class SavedPassengerDto {
  @IsString()
  @Length(2, 100)
  fullName: string;

  @IsOptional()
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0' })
  phone?: string;

  @IsOptional()
  @IsEnum(Gender)
  gender?: Gender;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(120)
  age?: number;
}
