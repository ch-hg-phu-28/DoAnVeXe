import { Module } from '@nestjs/common';
import { RealtimeModule } from '../realtime/seats.gateway';
import { BookingController, SeatsController } from './booking.controller';
import { BookingService } from './booking.service';
import { HoldService } from './hold.service';

@Module({
  imports: [RealtimeModule],
  controllers: [SeatsController, BookingController],
  providers: [BookingService, HoldService],
  exports: [BookingService],
})
export class BookingModule {}
