import { Body, Controller, Get, HttpCode, Module, Post, Query, UseGuards } from '@nestjs/common';
import { ApiSecurity, ApiTags } from '@nestjs/swagger';
import { BookingModule } from '../booking/booking.module';
import { BookingService } from '../booking/booking.service';
import { LookupBookingDto } from '../booking/dto/booking.dto';
import { CatalogModule } from '../catalog/catalog.module';
import { CatalogService } from '../catalog/catalog.service';
import { SearchTripsDto } from '../catalog/dto/catalog.dto';
import { Public } from '../common/decorators/auth.decorators';
import { ToolKeyGuard } from '../common/guards/tool-key.guard';
import { PrismaService } from '../prisma/prisma.service';

/**
 * Các "công cụ" CHỈ ĐỌC cho dịch vụ chatbot (TV3) gọi khi mô hình yêu cầu.
 * Chatbot không bao giờ tự nói giờ chạy, giá vé, số ghế mà phải lấy từ đây (khó khăn #28).
 * Gửi header: x-tool-key: <CHATBOT_TOOL_KEY>
 */
@ApiTags('Công cụ cho Chatbot')
@ApiSecurity('tool-key')
@Public()
@UseGuards(ToolKeyGuard)
@Controller('tools')
export class ChatbotToolsController {
  constructor(
    private readonly catalog: CatalogService,
    private readonly booking: BookingService,
    private readonly prisma: PrismaService,
  ) {}

  /** tim_chuyen: chuyến còn ghế theo điểm đi, điểm đến, ngày (và khung giờ) */
  @Get('trips')
  async searchTrips(@Query() q: SearchTripsDto) {
    const trips = await this.catalog.searchTrips(q);
    return trips.filter((t) => t.availableSeats > 0);
  }

  /** tra_ve: tình trạng vé theo mã vé + số điện thoại (thông tin đã che bớt) */
  @HttpCode(200)
  @Post('tickets/lookup')
  lookup(@Body() dto: LookupBookingDto) {
    return this.booking.lookup(dto.code, dto.phone);
  }

  /** chinh_sach: tài liệu chính sách / FAQ do admin nhập */
  @Get('policies')
  policies() {
    return this.prisma.kbDocument.findMany({ select: { id: true, title: true, content: true, updatedAt: true } });
  }
}

@Module({
  imports: [CatalogModule, BookingModule],
  controllers: [ChatbotToolsController],
})
export class ChatbotToolsModule {}
