import { HttpStatus, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { BookingStatus, Prisma, Role, StopType, TripSeatStatus, TripStatus } from '@prisma/client';
import { AuthUser } from '../common/decorators/auth.decorators';
import { AppException, ErrorCode, notFound } from '../common/errors';
import { generateTicketCode, maskPhone } from '../common/ticket-code';
import { PrismaService } from '../prisma/prisma.service';
import { SeatsGateway } from '../realtime/seats.gateway';
import { quoteCancel } from './cancel-policy';
import { CreateBookingDto, ListBookingsQuery } from './dto/booking.dto';
import { HoldService } from './hold.service';

export const MAX_SEATS_PER_BOOKING = 5;

const BOOKING_INCLUDE = {
  trip: { include: { route: true, bus: true } },
  pickupStop: true,
  dropoffStop: true,
  items: { include: { tripSeat: { include: { seat: true } } } },
} satisfies Prisma.BookingInclude;
type BookingFull = Prisma.BookingGetPayload<{ include: typeof BOOKING_INCLUDE }>;

class SeatConflictError extends Error {}

@Injectable()
export class BookingService {
  private readonly logger = new Logger(BookingService.name);
  private readonly holdTtl: number;
  private readonly paymentTtl: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly holds: HoldService,
    private readonly gateway: SeatsGateway,
    config: ConfigService,
  ) {
    this.holdTtl = Number(config.get('HOLD_TTL_SECONDS') ?? 600);
    this.paymentTtl = Number(config.get('PAYMENT_TTL_SECONDS') ?? 480);
  }

  // ---------------- Sơ đồ ghế & giữ ghế ----------------

  async seatMap(tripId: number, userId?: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: tripId },
      include: {
        route: true,
        bus: { include: { layout: true } },
        tripSeats: { include: { seat: true }, orderBy: { seatId: 'asc' } },
      },
    });
    if (!trip) throw notFound('chuyến');
    const holders = await this.holds.holders(tripId, trip.tripSeats.map((ts) => ts.seatId));

    return {
      trip: {
        id: trip.id,
        departAt: trip.departAt,
        arriveAt: trip.arriveAt,
        basePrice: trip.basePrice,
        status: trip.status,
        originCity: trip.route.originCity,
        destinationCity: trip.route.destinationCity,
        busType: trip.bus.busType,
      },
      layout: { floors: trip.bus.layout.floors, rows: trip.bus.layout.rows, cols: trip.bus.layout.cols },
      holdTtlSeconds: this.holdTtl,
      seats: trip.tripSeats.map((ts, i) => {
        let status: string = ts.status;
        if (ts.status === TripSeatStatus.AVAILABLE && holders[i] !== null) {
          status = holders[i] === userId ? 'HELD_BY_ME' : 'HELD';
        }
        return { seatId: ts.seatId, code: ts.seat.code, floor: ts.seat.floor, rowNo: ts.seat.rowNo, colNo: ts.seat.colNo, status };
      }),
    };
  }

  async holdSeats(tripId: number, seatIds: number[], userId: number) {
    await this.assertBookableTrip(tripId);
    const tripSeats = await this.prisma.tripSeat.findMany({ where: { tripId } });
    const byId = new Map(tripSeats.map((ts) => [ts.seatId, ts]));
    for (const seatId of seatIds) {
      const ts = byId.get(seatId);
      if (!ts) throw new AppException(ErrorCode.SEAT_NOT_FOUND, 'Ghế không thuộc chuyến này', HttpStatus.NOT_FOUND, { seatId });
      if (ts.status !== TripSeatStatus.AVAILABLE) {
        throw new AppException(ErrorCode.SEAT_TAKEN, 'Ghế đã được bán', HttpStatus.CONFLICT, { seatId });
      }
    }

    // Giới hạn tổng số ghế một người giữ trên một chuyến (chống giữ ghế ảo).
    const allIds = tripSeats.map((ts) => ts.seatId);
    const holders = await this.holds.holders(tripId, allIds);
    const alreadyMine = allIds.filter((id, i) => holders[i] === userId && !seatIds.includes(id)).length;
    if (alreadyMine + seatIds.length > MAX_SEATS_PER_BOOKING) {
      throw new AppException(ErrorCode.TOO_MANY_SEATS, `Mỗi lần chỉ được giữ tối đa ${MAX_SEATS_PER_BOOKING} ghế`);
    }

    await this.holds.holdAll(tripId, seatIds, userId, this.holdTtl);
    this.gateway.emitSeats(tripId, seatIds, 'HELD');
    return { tripId, seatIds, expiresInSeconds: this.holdTtl };
  }

  async releaseSeats(tripId: number, seatIds: number[], userId: number) {
    const released = await this.holds.release(tripId, seatIds, userId);
    this.gateway.emitSeats(tripId, released, 'AVAILABLE');
    return { tripId, releasedSeatIds: released };
  }

  // ---------------- Đặt vé ----------------

  async createBooking(userId: number, dto: CreateBookingDto) {
    if (dto.seatIds.length > MAX_SEATS_PER_BOOKING) {
      throw new AppException(ErrorCode.TOO_MANY_SEATS, `Mỗi đơn tối đa ${MAX_SEATS_PER_BOOKING} ghế`);
    }
    const trip = await this.assertBookableTrip(dto.tripId);
    await this.assertStops(trip.routeId, dto.pickupStopId, dto.dropoffStopId);

    const holders = await this.holds.holders(dto.tripId, dto.seatIds);
    const notMine = dto.seatIds.filter((_, i) => holders[i] !== userId);
    if (notMine.length) {
      throw new AppException(ErrorCode.SEAT_NOT_HELD, 'Hết thời gian giữ ghế hoặc ghế không do bạn giữ, vui lòng chọn lại', HttpStatus.CONFLICT, {
        seatIds: notMine,
      });
    }

    const tripSeats = await this.prisma.tripSeat.findMany({ where: { tripId: dto.tripId, seatId: { in: dto.seatIds } } });
    if (tripSeats.length !== dto.seatIds.length || tripSeats.some((ts) => ts.status !== TripSeatStatus.AVAILABLE)) {
      throw new AppException(ErrorCode.SEAT_TAKEN, 'Có ghế đã được bán, vui lòng chọn lại', HttpStatus.CONFLICT);
    }

    // Không cho tạo 2 đơn chờ thanh toán cho cùng một ghế (tránh trả tiền 2 lần).
    const pending = await this.prisma.bookingItem.findFirst({
      where: {
        tripSeatId: { in: tripSeats.map((ts) => ts.id) },
        booking: { status: BookingStatus.PENDING_PAYMENT, expiresAt: { gt: new Date() } },
      },
      include: { booking: { select: { code: true } } },
    });
    if (pending) {
      throw new AppException(ErrorCode.CONFLICT, 'Ghế đang nằm trong một đơn chờ thanh toán', HttpStatus.CONFLICT, {
        bookingCode: pending.booking.code,
      });
    }

    // Giữ ghế lâu hơn thời hạn thanh toán để tiền về rồi ghế vẫn còn (khó khăn #13).
    await this.holds.extend(dto.tripId, dto.seatIds, userId, this.paymentTtl + 120);

    const seatOrder = new Map(dto.seatIds.map((id, i) => [id, i]));
    const expiresAt = new Date(Date.now() + this.paymentTtl * 1000);
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const booking = await this.prisma.booking.create({
          data: {
            code: generateTicketCode(),
            userId,
            tripId: dto.tripId,
            pickupStopId: dto.pickupStopId,
            dropoffStopId: dto.dropoffStopId,
            contactName: dto.contactName,
            contactPhone: dto.contactPhone,
            contactEmail: dto.contactEmail.toLowerCase(),
            totalAmount: trip.basePrice * tripSeats.length,
            expiresAt,
            items: {
              create: tripSeats.map((ts) => ({
                tripSeatId: ts.id,
                price: trip.basePrice,
                passengerName: dto.passengerNames?.[seatOrder.get(ts.seatId) ?? -1] ?? null,
              })),
            },
          },
          include: BOOKING_INCLUDE,
        });
        return this.view(booking);
      } catch (e) {
        const isCodeClash = e instanceof Prisma.PrismaClientKnownRequestError && e.code === 'P2002';
        if (!isCodeClash || attempt === 2) throw e;
      }
    }
    throw new Error('unreachable');
  }

  /**
   * Gọi khi cổng thanh toán báo thành công. Ghi ghế thành SOLD bằng câu lệnh cập nhật có điều kiện
   * (chỉ ghế còn AVAILABLE) trong transaction; thiếu ghế nào thì hủy cả transaction → NEEDS_REFUND.
   */
  async confirmPaid(bookingId: number) {
    const booking = await this.prisma.booking.findUnique({ where: { id: bookingId }, include: BOOKING_INCLUDE });
    if (!booking) throw notFound('đơn đặt vé');
    if (booking.status === BookingStatus.PAID) return this.view(booking);

    const tripSeatIds = booking.items.map((i) => i.tripSeatId);
    const seatIds = booking.items.map((i) => i.tripSeat.seatId);
    let status: BookingStatus;
    try {
      await this.prisma.$transaction(async (tx) => {
        const res = await tx.tripSeat.updateMany({
          where: { id: { in: tripSeatIds }, status: TripSeatStatus.AVAILABLE },
          data: { status: TripSeatStatus.SOLD, bookingId: booking.id },
        });
        if (res.count !== tripSeatIds.length) throw new SeatConflictError();
        await tx.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.PAID } });
      });
      status = BookingStatus.PAID;
    } catch (e) {
      if (!(e instanceof SeatConflictError)) throw e;
      await this.prisma.booking.update({ where: { id: booking.id }, data: { status: BookingStatus.NEEDS_REFUND } });
      status = BookingStatus.NEEDS_REFUND;
      this.logger.warn(`Đơn ${booking.code} đã thanh toán nhưng ghế không còn → cần hoàn tiền`);
    }

    if (status === BookingStatus.PAID) {
      await this.holds.forceRelease(booking.tripId, seatIds);
      this.gateway.emitSeats(booking.tripId, seatIds, 'SOLD');
      // TODO (TV3): gửi email vé điện tử kèm mã QR cho booking.contactEmail.
    } else if (booking.userId) {
      const released = await this.holds.release(booking.tripId, seatIds, booking.userId);
      this.gateway.emitSeats(booking.tripId, released, 'AVAILABLE');
    }
    return this.view({ ...booking, status });
  }

  // ---------------- Xem, tra cứu, hủy ----------------

  async listMine(userId: number) {
    const rows = await this.prisma.booking.findMany({ where: { userId }, include: BOOKING_INCLUDE, orderBy: { createdAt: 'desc' } });
    return rows.map((b) => this.view(b));
  }

  async getForUser(code: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({ where: { code }, include: BOOKING_INCLUDE });
    if (!booking || !this.canManage(booking, user)) throw notFound('vé'); // không tiết lộ vé của người khác có tồn tại
    return this.view(booking);
  }

  /** Tra cứu không cần đăng nhập: phải đúng cả mã vé và số điện thoại. */
  async lookup(code: string, phone: string) {
    const booking = await this.prisma.booking.findUnique({ where: { code: code.trim().toUpperCase() }, include: BOOKING_INCLUDE });
    if (!booking || booking.contactPhone !== phone) throw notFound('vé với mã và số điện thoại này');
    return this.view(booking, true);
  }

  async cancel(code: string, user: AuthUser) {
    const booking = await this.prisma.booking.findUnique({ where: { code }, include: BOOKING_INCLUDE });
    if (!booking || !this.canManage(booking, user)) throw notFound('vé');
    const seatIds = booking.items.map((i) => i.tripSeat.seatId);

    if (booking.status === BookingStatus.PENDING_PAYMENT) {
      const updated = await this.prisma.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date() },
        include: BOOKING_INCLUDE,
      });
      if (booking.userId) {
        const released = await this.holds.release(booking.tripId, seatIds, booking.userId);
        this.gateway.emitSeats(booking.tripId, released, 'AVAILABLE');
      }
      return this.view(updated);
    }

    if (booking.status !== BookingStatus.PAID) {
      throw new AppException(ErrorCode.BOOKING_NOT_CANCELLABLE, 'Vé ở trạng thái này không hủy được', HttpStatus.CONFLICT);
    }
    const quote = quoteCancel(booking.totalAmount, booking.trip.departAt);
    if (!quote.allowed) {
      throw new AppException(ErrorCode.BOOKING_NOT_CANCELLABLE, 'Đã quá thời hạn hủy vé theo chính sách', HttpStatus.CONFLICT, quote);
    }
    const updated = await this.prisma.$transaction(async (tx) => {
      await tx.tripSeat.updateMany({
        where: { bookingId: booking.id },
        data: { status: TripSeatStatus.AVAILABLE, bookingId: null },
      });
      return tx.booking.update({
        where: { id: booking.id },
        data: { status: BookingStatus.CANCELLED, cancelledAt: new Date(), refundAmount: quote.refund },
        include: BOOKING_INCLUDE,
      });
    });
    this.gateway.emitSeats(booking.tripId, seatIds, 'AVAILABLE');
    // TODO: gọi cổng thanh toán hoàn tiền quote.refund và cập nhật Payment → REFUNDED.
    return { ...this.view(updated), cancelFee: quote.fee, feePercent: quote.feePercent };
  }

  async adminList(q: ListBookingsQuery) {
    const rows = await this.prisma.booking.findMany({
      where: { status: q.status, tripId: q.tripId },
      include: BOOKING_INCLUDE,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
    return rows.map((b) => this.view(b));
  }

  /** Dùng cho module thanh toán: lấy đơn của chính người dùng để tạo thanh toán. */
  async getPayable(code: string, userId: number) {
    const booking = await this.prisma.booking.findUnique({ where: { code } });
    if (!booking || booking.userId !== userId) throw notFound('vé');
    if (booking.status !== BookingStatus.PENDING_PAYMENT || booking.expiresAt <= new Date()) {
      throw new AppException(ErrorCode.BOOKING_NOT_PAYABLE, 'Đơn không còn ở trạng thái chờ thanh toán hoặc đã hết hạn', HttpStatus.CONFLICT);
    }
    return booking;
  }

  // ---------------- Hàm phụ ----------------

  private async assertBookableTrip(tripId: number) {
    const trip = await this.prisma.trip.findUnique({ where: { id: tripId } });
    if (!trip) throw notFound('chuyến');
    if (trip.status !== TripStatus.SCHEDULED || trip.departAt <= new Date()) {
      throw new AppException(ErrorCode.TRIP_NOT_BOOKABLE, 'Chuyến đã khởi hành hoặc đã bị hủy', HttpStatus.CONFLICT);
    }
    return trip;
  }

  private async assertStops(routeId: number, pickupId: number, dropoffId: number) {
    const stops = await this.prisma.stop.findMany({ where: { routeId, id: { in: [pickupId, dropoffId] } } });
    const pickup = stops.find((s) => s.id === pickupId);
    const dropoff = stops.find((s) => s.id === dropoffId);
    const ok =
      pickup &&
      dropoff &&
      pickup.type !== StopType.DROPOFF &&
      dropoff.type !== StopType.PICKUP &&
      pickup.orderNo < dropoff.orderNo;
    if (!ok) throw new AppException(ErrorCode.INVALID_STOP, 'Điểm đón hoặc điểm trả không hợp lệ cho tuyến này');
  }

  private canManage(booking: { userId: number | null }, user: AuthUser) {
    return booking.userId === user.id || user.role === Role.ADMIN || user.role === Role.STAFF;
  }

  private view(b: BookingFull, publicView = false) {
    const expired = b.status === BookingStatus.PENDING_PAYMENT && b.expiresAt <= new Date();
    return {
      code: b.code,
      status: expired ? BookingStatus.EXPIRED : b.status,
      totalAmount: b.totalAmount,
      refundAmount: b.refundAmount,
      expiresAt: b.expiresAt,
      createdAt: b.createdAt,
      contactName: b.contactName,
      contactPhone: publicView ? maskPhone(b.contactPhone) : b.contactPhone,
      contactEmail: publicView ? undefined : b.contactEmail,
      trip: {
        id: b.trip.id,
        departAt: b.trip.departAt,
        arriveAt: b.trip.arriveAt,
        originCity: b.trip.route.originCity,
        destinationCity: b.trip.route.destinationCity,
        busType: b.trip.bus.busType,
        plateNumber: b.trip.bus.plateNumber,
      },
      pickupStop: { id: b.pickupStop.id, name: b.pickupStop.name, address: b.pickupStop.address },
      dropoffStop: { id: b.dropoffStop.id, name: b.dropoffStop.name, address: b.dropoffStop.address },
      seats: b.items.map((i) => ({ seatId: i.tripSeat.seatId, code: i.tripSeat.seat.code, passengerName: i.passengerName, price: i.price })),
    };
  }
}
