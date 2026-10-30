import nodemailer, { Transporter } from 'nodemailer';
import { config } from '../../config/index.js';
import { AppError } from '../../middlewares/errorHandler.js';

export interface MailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const isSmtpConfigured = () => Boolean(config.SMTP_HOST && config.SMTP_USER && config.SMTP_PASS);

let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_PORT === 465,
      auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
      // Bọc timeout 10 giây theo quy ước adapter dịch vụ ngoài
      connectionTimeout: 10_000,
      greetingTimeout: 10_000,
      socketTimeout: 10_000,
    });
  }
  return transporter;
}

/**
 * Mail adapter. Dùng dạng object để test có thể giả lập (vi.spyOn(mailer, 'send')).
 */
export const mailer = {
  async send(message: MailMessage): Promise<void> {
    if (!isSmtpConfigured()) {
      if (config.NODE_ENV === 'production') {
        throw new AppError(503, 'MAIL_NOT_CONFIGURED', 'Hệ thống gửi email chưa được cấu hình. Vui lòng liên hệ quản trị viên.');
      }
      // Môi trường phát triển: in nội dung ra console thay vì gửi thật
      console.log(`📧 [DEV MAIL] Tới: ${message.to}\nTiêu đề: ${message.subject}\n${message.text}`);
      return;
    }

    try {
      await getTransporter().sendMail({
        from: config.MAIL_FROM || config.SMTP_USER,
        ...message,
      });
    } catch (error) {
      console.error('❌ Lỗi gửi email:', error);
      throw new AppError(503, 'MAIL_SERVICE_UNAVAILABLE', 'Không thể gửi email lúc này. Vui lòng thử lại sau.');
    }
  },
};

