import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { HttpExceptionFilter } from './common/filters/http-exception.filter';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  app.setGlobalPrefix('api');
  app.enableCors({ origin: process.env.CORS_ORIGIN?.split(',').map((s) => s.trim()) ?? true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new HttpExceptionFilter());
  app.useGlobalInterceptors(new ResponseInterceptor());
  app.enableShutdownHooks();

  // Tài liệu API cho frontend và chatbot: http://localhost:3000/api/docs
  const doc = new DocumentBuilder()
    .setTitle('API đặt vé xe khách')
    .setDescription('Phản hồi thành công: { success: true, data }. Lỗi: { success: false, error: { code, message, details } }')
    .setVersion('0.1.0')
    .addBearerAuth()
    .addApiKey({ type: 'apiKey', name: 'x-tool-key', in: 'header' }, 'tool-key')
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, doc));

  const port = Number(process.env.PORT ?? 3000);
  await app.listen(port);
  Logger.log(`Server chạy tại http://localhost:${port}/api – tài liệu API: /api/docs`, 'Bootstrap');
}

void bootstrap();
