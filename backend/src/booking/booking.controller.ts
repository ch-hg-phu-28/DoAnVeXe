import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Role } from '@prisma/client';
import { AuthUser, CurrentUser, Public, Roles } from '../common/decorators/auth.decorators';
import { BookingService } from './booking.service';
import { CreateBookingDto, HoldSeatsDto, ListBookingsQuery, LookupBookingDto } from './dto/booking.dto';

@ApiTags('Sơ đồ ghế & giữ ghế')
@ApiBearerAuth()
@Controller('trips/:tripId')
export class SeatsController {
  constructor(private readonly booking: BookingService) {}

  /** Sơ đồ ghế kèm trạng thái: AVAILABLE, HELD, HELD_BY_ME, SOLD, BLOCKED */
  @Public()
  @Get('seats')
  seatMap(@Param('tripId', ParseIntPipe) tripId: number, @CurrentUser() user?: AuthUser) {
    return this.booking.seatMap(tripId, user?.id);
  }

  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post('holds')
  hold(@Param('tripId', ParseIntPipe) tripId: number, @Body() dto: HoldSeatsDto, @CurrentUser() user: AuthUser) {
    return this.booking.holdSeats(tripId, dto.seatIds, user.id);
  }

  @Delete('holds')
  release(@Param('tripId', ParseIntPipe) tripId: number, @Body() dto: HoldSeatsDto, @CurrentUser() user: AuthUser) {
    return this.booking.releaseSeats(tripId, dto.seatIds, user.id);
  }
}

@ApiTags('Đặt vé')
@ApiBearerAuth()
@Controller('bookings')
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Post()
  create(@Body() dto: CreateBookingDto, @CurrentUser() user: AuthUser) {
    return this.booking.createBooking(user.id, dto);
  }

  /** "Vé của tôi" */
  @Get('me')
  mine(@CurrentUser() user: AuthUser) {
    return this.booking.listMine(user.id);
  }

  /** Tra cứu vé không cần đăng nhập (mã vé + SĐT). Giới hạn tần suất để chống dò mã. */
  @Public()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(200)
  @Post('lookup')
  lookup(@Body() dto: LookupBookingDto) {
    return this.booking.lookup(dto.code, dto.phone);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Get()
  adminList(@Query() q: ListBookingsQuery) {
    return this.booking.adminList(q);
  }

  @Get(':code')
  get(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.booking.getForUser(code, user);
  }

  @HttpCode(200)
  @Post(':code/cancel')
  cancel(@Param('code') code: string, @CurrentUser() user: AuthUser) {
    return this.booking.cancel(code, user);
  }
}
