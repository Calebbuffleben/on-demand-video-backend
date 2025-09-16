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
    this.logger.log(`📧 [EMAIL] Preparando envio de email de criação de conta para: ${to}`);
    
    const subject = '🎉 Pagamento Confirmado - Crie sua conta agora!';
    const text = `Seu pagamento foi confirmado! Crie sua conta acessando: ${link}\n\nEste link expira em 7 dias.`;
    
    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Pagamento Confirmado</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: Arial, sans-serif;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); padding: 40px 20px; text-align: center;">
            <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: bold;">
              🎉 Pagamento Confirmado!
            </h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">
              Seu pagamento foi processado com sucesso
            </p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px 30px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h2 style="color: #1f2937; margin: 0 0 15px 0; font-size: 24px;">
                Bem-vindo à nossa plataforma!
              </h2>
              <p style="color: #6b7280; font-size: 16px; line-height: 1.6; margin: 0;">
                Agora você pode criar sua conta e acessar todos os recursos do seu plano.
              </p>
            </div>
            
            <!-- CTA Button -->
            <div style="text-align: center; margin: 40px 0;">
              <a href="${link}" 
                 style="display: inline-block; padding: 16px 32px; background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%); color: #ffffff; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 18px; box-shadow: 0 4px 12px rgba(37, 99, 235, 0.3); transition: all 0.3s ease;">
                🚀 Criar Minha Conta
              </a>
            </div>
            
            <!-- Warning -->
            <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <div style="display: flex; align-items: center; margin-bottom: 10px;">
                <span style="font-size: 20px; margin-right: 10px;">⏰</span>
                <strong style="color: #92400e; font-size: 16px;">Importante</strong>
              </div>
              <p style="color: #92400e; font-size: 14px; margin: 0; line-height: 1.5;">
                Este link expira em <strong>7 dias</strong>. Crie sua conta o quanto antes para não perder o acesso à plataforma.
              </p>
            </div>
            
            <!-- Alternative Link -->
            <div style="background: #f9fafb; border-radius: 8px; padding: 20px; margin: 30px 0;">
              <p style="color: #6b7280; font-size: 14px; margin: 0 0 10px 0; font-weight: 500;">
                Se o botão não funcionar, copie e cole este link no seu navegador:
              </p>
              <div style="background: #ffffff; border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; word-break: break-all;">
                <code style="color: #2563eb; font-size: 13px; font-family: 'Courier New', monospace;">
                  ${link}
                </code>
              </div>
            </div>
            
            <!-- Features -->
            <div style="margin: 40px 0;">
              <h3 style="color: #1f2937; font-size: 18px; margin: 0 0 20px 0; text-align: center;">
                O que você terá acesso:
              </h3>
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; align-items: center;">
                  <span style="color: #10b981; font-size: 16px; margin-right: 12px;">✅</span>
                  <span style="color: #374151; font-size: 14px;">Acesso completo à plataforma</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #10b981; font-size: 16px; margin-right: 12px;">✅</span>
                  <span style="color: #374151; font-size: 14px;">Suporte prioritário</span>
                </div>
                <div style="display: flex; align-items: center;">
                  <span style="color: #10b981; font-size: 16px; margin-right: 12px;">✅</span>
                  <span style="color: #374151; font-size: 14px;">Recursos premium incluídos</span>
                </div>
              </div>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="color: #9ca3af; font-size: 12px; margin: 0;">
              Este é um email automático. Não responda a esta mensagem.
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin: 5px 0 0 0;">
              Se você não fez este pagamento, ignore este email.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
    
    this.logger.log(`📧 [EMAIL] Template HTML gerado com sucesso`);
    this.logger.log(`📧 [EMAIL] Link de criação: ${link}`);
    
    try {
      const result = await this.send({ to, subject, text, html });
      this.logger.log(`✅ [EMAIL] Email de criação de conta enviado com sucesso para: ${to}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ [EMAIL] Erro ao enviar email de criação de conta para ${to}: ${error.message}`);
      throw error;
    }
  }
}

