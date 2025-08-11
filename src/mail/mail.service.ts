import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;
  private readonly fromAddress: string;
  private readonly replyToAddress?: string;

  constructor(private readonly config: ConfigService) {
    const host = this.config.get<string>('SMTP_HOST') || 'smtp.sendgrid.net';
    const port = Number(this.config.get<number>('SMTP_PORT') ?? 587);
    const secure = Boolean(this.config.get<boolean>('SMTP_SECURE') ?? false);
    const user = this.config.get<string>('SMTP_USER') || 'apikey';
    const pass = this.config.get<string>('SMTP_PASS') || '';

    this.fromAddress = this.config.get<string>('MAIL_FROM') || '';
    this.replyToAddress = this.config.get<string>('MAIL_REPLY_TO') || undefined;

    if (!pass || !this.fromAddress) {
      this.logger.warn('SMTP or MAIL_FROM not fully configured. Emails will be logged instead of sent.');
      this.transporter = null;
    } else {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
      });
    }
  }

  private async send(options: { to: string; subject: string; text: string; html: string }) {
    if (!this.transporter) {
      this.logger.log(`[DEV MAIL] To: ${options.to} | Subject: ${options.subject} | Text: ${options.text}`);
      return true;
    }
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
        replyTo: this.replyToAddress,
      });
      return true;
    } catch (err) {
      this.logger.error(`Failed to send email to ${options.to}: ${err?.message || err}`);
      return false;
    }
  }

  async sendVerificationEmail(to: string, link: string) {
    const subject = 'Verifique seu e-mail';
    const text = `Confirme seu e-mail acessando o link: ${link}`;
    const html = `
      <p>Confirme seu e-mail clicando no botão abaixo:</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Verificar e-mail</a></p>
      <p>Ou copie e cole este link no navegador:<br/>${link}</p>
    `;
    return this.send({ to, subject, text, html });
  }

  async sendPasswordResetEmail(to: string, link: string) {
    const subject = 'Redefinir senha';
    const text = `Para redefinir sua senha, acesse: ${link}`;
    const html = `
      <p>Você solicitou a redefinição de senha.</p>
      <p><a href="${link}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:10px 16px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none">Redefinir senha</a></p>
      <p>Se você não solicitou, ignore este e-mail.</p>
      <p>Link direto: ${link}</p>
    `;
    return this.send({ to, subject, text, html });
  }
}

