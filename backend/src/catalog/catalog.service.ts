import { HttpStatus, Injectable } from '@nestjs/common';
import { TripSeatStatus, TripStatus } from '@prisma/client';
import { AppException, ErrorCode, notFound } from '../common/errors';
import { PrismaService } from '../prisma/prisma.service';
import {
  CreateBusDto,
  CreateRouteDto,
  CreateSeatLayoutDto,
  CreateTripDto,
  SearchTripsDto,
  UpdateRouteDto,
} from './dto/catalog.dto';
import { generateSeats, vnDayRange } from './seat-layout.util';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  /** Mô hình 1 nhà xe: nếu không truyền operatorId thì dùng nhà xe đầu tiên. */
  private async operatorId(given?: number): Promise<number> {
    if (given) return given;
    const op = await this.prisma.operator.findFirst({ orderBy: { id: 'asc' } });
    if (!op) throw notFound('nhà xe (hãy chạy seed hoặc tạo nhà xe trước)');
    return op.id;
  }

  // ---------- Tuyến ----------

  listRoutes(includeInactive = false) {
    return this.prisma.route.findMany({
      where: includeInactive ? {} : { isActive: true },
      include: { stops: { orderBy: { orderNo: 'asc' } } },
      orderBy: { id: 'asc' },
    });
  }

  async getRoute(id: number) {
    const route = await this.prisma.route.findUnique({
      where: { id },
      include: { stops: { orderBy: { orderNo: 'asc' } } },
    });
    if (!route) throw notFound('tuyến');
    return route;
  }

  async createRoute(dto: CreateRouteDto) {
    const { stops, operatorId, ...data } = dto;
    return this.prisma.route.create({
      data: { ...data, operatorId: await this.operatorId(operatorId), stops: { create: stops } },
      include: { stops: { orderBy: { orderNo: 'asc' } } },
    });
  }

  async updateRoute(id: number, dto: UpdateRouteDto) {
    await this.getRoute(id);
    return this.prisma.route.update({ where: { id }, data: dto });
  }

  async deleteRoute(id: number) {
    await this.getRoute(id);
    // Tuyến đã có chuyến thì không xóa được (khóa ngoại) → nên dùng isActive = false.
    await this.prisma.route.delete({ where: { id } });
    return { id };
  }

  // ---------- Sơ đồ ghế & xe ----------

  listSeatLayouts() {
    return this.prisma.seatLayout.findMany({ include: { seats: { orderBy: { id: 'asc' } } }, orderBy: { id: 'asc' } });
  }

  createSeatLayout(dto: CreateSeatLayoutDto) {
    return this.prisma.seatLayout.create({
      data: { ...dto, seats: { create: generateSeats(dto.floors, dto.rows, dto.cols) } },
      include: { seats: true },
    });
  }

  listBuses() {
    return this.prisma.bus.findMany({ include: { layout: true }, orderBy: { id: 'asc' } });
  }

  async createBus(dto: CreateBusDto) {
    const { operatorId, ...data } = dto;
    return this.prisma.bus.create({ data: { ...data, operatorId: await this.operatorId(operatorId) } });
  }

  // ---------- Chuyến ----------

  async createTrip(dto: CreateTripDto) {
    const departAt = new Date(dto.departAt);
    const arriveAt = new Date(dto.arriveAt);
    if (arriveAt <= departAt) {
      throw new AppException(ErrorCode.VALIDATION_FAILED, 'Giờ đến phải sau giờ khởi hành');
    }
    const bus = await this.prisma.bus.findUnique({ where: { id: dto.busId }, include: { layout: { include: { seats: true } } } });
    if (!bus) throw notFound('xe');
    await this.getRoute(dto.routeId);

    // Tạo chuyến và toàn bộ ghế của chuyến trong cùng một transaction.
    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: { routeId: dto.routeId, busId: dto.busId, departAt, arriveAt, basePrice: dto.basePrice },
      });
      await tx.tripSeat.createMany({ data: bus.layout.seats.map((s) => ({ tripId: trip.id, seatId: s.id })) });
      return trip;
    });
  }

  /**
   * Tìm chuyến theo điểm đi/đến (không phân biệt hoa thường) và ngày theo giờ Việt Nam.
   * availableSeats chỉ trừ ghế đã bán, chưa trừ ghế đang được giữ tạm trong Redis.
   * TODO: tìm không dấu (cài extension unaccent của PostgreSQL) và bảng tên gọi khác của địa danh.
   */
  async searchTrips(q: SearchTripsDto) {
    const { start, end } = vnDayRange(q.date);
    const now = new Date();
    const trips = await this.prisma.trip.findMany({
      where: {
        status: TripStatus.SCHEDULED,
        departAt: { gte: start > now ? start : now, lt: end },
        route: {
          isActive: true,
          originCity: { contains: q.from.trim(), mode: 'insensitive' },
          destinationCity: { contains: q.to.trim(), mode: 'insensitive' },
        },
      },
      include: {
        route: { select: { originCity: true, destinationCity: true, operator: { select: { name: true } } } },
        bus: { select: { busType: true } },
        _count: { select: { tripSeats: { where: { status: TripSeatStatus.AVAILABLE } } } },
      },
      orderBy: { departAt: 'asc' },
    });

    return trips
      .filter((t) => {
        const hour = (t.departAt.getUTCHours() + 7) % 24; // Việt Nam UTC+7, không đổi giờ theo mùa
        return (q.hourFrom === undefined || hour >= q.hourFrom) && (q.hourTo === undefined || hour <= q.hourTo);
      })
      .map((t) => ({
        id: t.id,
        departAt: t.departAt,
        arriveAt: t.arriveAt,
        basePrice: t.basePrice,
        busType: t.bus.busType,
        operatorName: t.route.operator.name,
        originCity: t.route.originCity,
        destinationCity: t.route.destinationCity,
        availableSeats: t._count.tripSeats,
      }));
  }

  async getTrip(id: number) {
    const trip = await this.prisma.trip.findUnique({
      where: { id },
      include: {
        route: { include: { stops: { orderBy: { orderNo: 'asc' } } } },
        bus: { select: { busType: true, plateNumber: true } },
      },
    });
    if (!trip) throw notFound('chuyến');
    return trip;
  }

  /** TODO (khó khăn #6): báo email cho khách và hoàn tiền các vé đã bán của chuyến bị hủy. */
  async cancelTrip(id: number) {
    const trip = await this.getTrip(id);
    if (trip.status !== TripStatus.SCHEDULED) {
      throw new AppException(ErrorCode.CONFLICT, 'Chuyến không ở trạng thái có thể hủy', HttpStatus.CONFLICT);
    }
    return this.prisma.trip.update({ where: { id }, data: { status: TripStatus.CANCELLED } });
  }
}
