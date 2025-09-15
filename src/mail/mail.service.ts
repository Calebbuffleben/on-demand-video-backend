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

  async sendAccountCreationEmail(to: string, link: string) {
    const subject = 'Crie sua conta - Pagamento confirmado';
    const text = `Seu pagamento foi confirmado! Crie sua conta acessando: ${link}`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #2563eb; margin-bottom: 10px;">🎉 Pagamento Confirmado!</h1>
          <p style="color: #666; font-size: 16px;">Seu pagamento foi processado com sucesso</p>
        </div>
        
        <div style="background: #f8fafc; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
          <p style="color: #374151; font-size: 16px; margin-bottom: 15px;">
            Agora você pode criar sua conta e acessar a plataforma com todos os recursos do seu plano.
          </p>
          
          <div style="text-align: center; margin: 25px 0;">
            <a href="${link}" target="_blank" rel="noopener noreferrer" 
               style="display:inline-block;padding:15px 30px;background:#2563eb;color:#fff;border-radius:8px;text-decoration:none;font-weight:bold;font-size:16px;box-shadow:0 4px 6px rgba(0,0,0,0.1);">
              🚀 Criar Conta
            </a>
          </div>
        </div>
        
        <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
          <p style="color: #92400e; font-size: 14px; margin: 0;">
            ⏰ <strong>Importante:</strong> Este link expira em 7 dias. Crie sua conta o quanto antes para não perder o acesso.
          </p>
        </div>
        
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
          <p style="color: #6b7280; font-size: 14px; margin-bottom: 10px;">
            Se o botão não funcionar, copie e cole este link no seu navegador:
          </p>
          <p style="color: #2563eb; font-size: 14px; word-break: break-all; background: #f3f4f6; padding: 10px; border-radius: 4px;">
            ${link}
          </p>
        </div>
        
        <div style="text-align: center; margin-top: 30px; color: #9ca3af; font-size: 12px;">
          <p>Este é um email automático, não responda a esta mensagem.</p>
        </div>
      </div>
    `;
    return this.send({ to, subject, text, html });
  }
}

