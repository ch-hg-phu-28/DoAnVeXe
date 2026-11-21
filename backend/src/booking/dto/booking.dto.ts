import { BookingStatus } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
} from 'class-validator';

export class HoldSeatsDto {
  /** Danh sách id ghế (seatId trong sơ đồ) */
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10)
  @ArrayUnique()
  @IsInt({ each: true })
  seatIds: number[];
}

export class CreateBookingDto {
  @IsInt() tripId: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayUnique()
  @IsInt({ each: true })
  seatIds: number[];

  @IsInt() pickupStopId: number;
  @IsInt() dropoffStopId: number;

  @IsString() @Length(2, 100) contactName: string;
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0' }) contactPhone: string;
  @IsEmail() contactEmail: string;

  /** Tên hành khách theo thứ tự seatIds (không bắt buộc) */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  passengerNames?: string[];
}

export class LookupBookingDto {
  /** Mã vé, ví dụ VE7K3QZ9MP */
  @IsString() @Length(6, 20) code: string;
  @Matches(/^0\d{9}$/, { message: 'Số điện thoại phải gồm 10 số và bắt đầu bằng 0' }) phone: string;
}

export class ListBookingsQuery {
  @IsOptional() @IsEnum(BookingStatus) status?: BookingStatus;
  @IsOptional() @Type(() => Number) @IsInt() tripId?: number;
}
