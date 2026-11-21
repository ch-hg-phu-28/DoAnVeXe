import { Module } from '@nestjs/common';
import { FleetController, RoutesController, TripsController } from './catalog.controller';
import { CatalogService } from './catalog.service';

@Module({
  controllers: [RoutesController, FleetController, TripsController],
  providers: [CatalogService],
  exports: [CatalogService],
})
export class CatalogModule {}
