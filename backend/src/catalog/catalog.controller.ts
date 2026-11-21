import { Body, Controller, Delete, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Public, Roles } from '../common/decorators/auth.decorators';
import { CatalogService } from './catalog.service';
import {
  CreateBusDto,
  CreateRouteDto,
  CreateSeatLayoutDto,
  CreateTripDto,
  SearchTripsDto,
  UpdateRouteDto,
} from './dto/catalog.dto';

@ApiTags('Tuyến đường')
@ApiBearerAuth()
@Controller('routes')
export class RoutesController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  list() {
    return this.catalog.listRoutes();
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.getRoute(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateRouteDto) {
    return this.catalog.createRoute(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateRouteDto) {
    return this.catalog.updateRoute(id, dto);
  }

  @Roles(Role.ADMIN)
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.deleteRoute(id);
  }
}

@ApiTags('Xe và sơ đồ ghế')
@ApiBearerAuth()
@Controller()
export class FleetController {
  constructor(private readonly catalog: CatalogService) {}

  @Roles(Role.ADMIN, Role.STAFF)
  @Get('seat-layouts')
  listLayouts() {
    return this.catalog.listSeatLayouts();
  }

  @Roles(Role.ADMIN)
  @Post('seat-layouts')
  createLayout(@Body() dto: CreateSeatLayoutDto) {
    return this.catalog.createSeatLayout(dto);
  }

  @Roles(Role.ADMIN, Role.STAFF)
  @Get('buses')
  listBuses() {
    return this.catalog.listBuses();
  }

  @Roles(Role.ADMIN)
  @Post('buses')
  createBus(@Body() dto: CreateBusDto) {
    return this.catalog.createBus(dto);
  }
}

@ApiTags('Chuyến xe')
@ApiBearerAuth()
@Controller('trips')
export class TripsController {
  constructor(private readonly catalog: CatalogService) {}

  @Public()
  @Get()
  search(@Query() q: SearchTripsDto) {
    return this.catalog.searchTrips(q);
  }

  @Public()
  @Get(':id')
  get(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.getTrip(id);
  }

  @Roles(Role.ADMIN)
  @Post()
  create(@Body() dto: CreateTripDto) {
    return this.catalog.createTrip(dto);
  }

  @Roles(Role.ADMIN)
  @Patch(':id/cancel')
  cancel(@Param('id', ParseIntPipe) id: number) {
    return this.catalog.cancelTrip(id);
  }
}
