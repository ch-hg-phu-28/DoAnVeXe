import { OmitType, PartialType } from '@nestjs/swagger';
import { StopType } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  ArrayMinSize,
  IsBoolean,
  IsEnum,
  IsISO8601,
  IsInt,
  IsOptional,
  IsString,
  Length,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class StopDto {
  @IsString() @Length(2, 200) name: string;
  @IsString() @Length(2, 300) address: string;
  @IsEnum(StopType) type: StopType;
  /** Thứ tự trên tuyến, bắt đầu từ 1 */
  @IsInt() @Min(1) orderNo: number;
  /** Số phút so với giờ xuất bến */
  @IsOptional() @IsInt() @Min(0) offsetMinutes?: number;
}

export class CreateRouteDto {
  @IsOptional() @IsInt() operatorId?: number;
  @IsString() @Length(2, 100) originCity: string;
  @IsString() @Length(2, 100) destinationCity: string;
  @IsOptional() @IsInt() @Min(1) distanceKm?: number;
  @IsOptional() @IsInt() @Min(1) durationMinutes?: number;

  @ValidateNested({ each: true })
  @Type(() => StopDto)
  @ArrayMinSize(2, { message: 'Tuyến cần ít nhất 1 điểm đón và 1 điểm trả' })
  stops: StopDto[];
}

export class UpdateRouteDto extends PartialType(OmitType(CreateRouteDto, ['stops', 'operatorId'] as const)) {
  @IsOptional() @IsBoolean() isActive?: boolean;
}

export class CreateSeatLayoutDto {
  @IsString() @Length(2, 100) name: string;
  @IsInt() @Min(1) @Max(2) floors: number;
  @IsInt() @Min(1) @Max(20) rows: number;
  @IsInt() @Min(1) @Max(6) cols: number;
}

export class CreateBusDto {
  @IsOptional() @IsInt() operatorId?: number;
  @IsString() @Length(4, 20) plateNumber: string;
  /** Ví dụ: Giường nằm 36 chỗ, Limousine 9 chỗ */
  @IsString() @Length(2, 100) busType: string;
  @IsInt() seatLayoutId: number;
}

export class CreateTripDto {
  @IsInt() routeId: number;
  @IsInt() busId: number;
  /** ISO 8601, nên ghi rõ múi giờ: 2026-12-01T22:00:00+07:00 */
  @IsISO8601() departAt: string;
  @IsISO8601() arriveAt: string;
  /** Giá vé (VNĐ) */
  @IsInt() @Min(0) basePrice: number;
}

export class SearchTripsDto {
  /** Điểm đi, ví dụ "Hồ Chí Minh" */
  @IsString() @Length(2, 100) from: string;
  /** Điểm đến, ví dụ "Đà Lạt" */
  @IsString() @Length(2, 100) to: string;
  /** Ngày đi theo giờ Việt Nam, dạng YYYY-MM-DD */
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'Ngày phải có dạng YYYY-MM-DD' }) date: string;
  /** Lọc theo giờ khởi hành từ (0–23) */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(23) hourFrom?: number;
  /** Lọc theo giờ khởi hành đến (0–23) */
  @IsOptional() @Type(() => Number) @IsInt() @Min(0) @Max(23) hourTo?: number;
}
