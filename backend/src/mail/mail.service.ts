import { Global, Injectable, Logger, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

export interface MailInput {
  to: string;
  subject: string;
  html: string;
}

/**
 * Dịch vụ gửi email dùng chung (quên mật khẩu, vé điện tử, nhắc giờ chạy… dùng ở các ngày sau).
 * Có SMTP_HOST thì gửi thật qua SMTP; để trống thì chỉ in ra log để phát triển trên máy.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: nodemailer.Transporter | null;
  private readonly from: string;

  constructor(config: ConfigService) {
    const host = config.get<string>('SMTP_HOST');
    this.from = config.get<string>('MAIL_FROM') || 'Đặt vé xe <no-reply@example.com>';
    this.transport = host
      ? nodemailer.createTransport({
          host,
          port: Number(config.get('SMTP_PORT') ?? 587),
          auth: { user: config.get<string>('SMTP_USER'), pass: config.get<string>('SMTP_PASS') },
        })
      : null;
  }

  /** Trả về true nếu đã gửi qua SMTP. Lỗi gửi mail chỉ ghi log, không làm hỏng thao tác chính. */
  async send(m: MailInput): Promise<boolean> {
    if (!m.to) return false;
    if (!this.transport) {
      this.logger.log(`[chưa cấu hình SMTP] Email tới ${m.to}: ${m.subject}`);
      return false;
    }
    try {
      await this.transport.sendMail({ from: this.from, to: m.to, subject: m.subject, html: m.html });
      return true;
    } catch (e) {
      this.logger.error(`Gửi email tới ${m.to} lỗi: ${e instanceof Error ? e.message : e}`);
      return false;
    }
  }
}

@Global()
@Module({ providers: [MailService], exports: [MailService] })
export class MailModule {}
