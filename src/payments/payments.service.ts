import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { MailService } from '../mail/mail.service';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private prisma: PrismaService,
    private mailService: MailService,
    private configService: ConfigService,
  ) {}

  /**
   * Processa webhook da Pepper
   */
  async webhook(body: any, signature?: string) {
    this.logger.log('🔔 [WEBHOOK] Webhook da Pepper recebido');
    this.logger.log(`📋 [WEBHOOK] Body: ${JSON.stringify(body, null, 2)}`);
    console.log('🚀 [DEBUG] Método webhook chamado com sucesso');
    console.log(`🚀 [DEBUG] Event: ${body.event}, Platform: ${body.platform}`);
    
    if (signature) {
      this.logger.log(`🔐 [WEBHOOK] Signature: ${signature}`);
    }

    // Validar se o webhook é da Pepper
    this.logger.log('🔍 [VALIDATION] Iniciando validação do webhook');
    if (!this.validatePepperWebhook(body, signature)) {
      this.logger.error('❌ [VALIDATION] Webhook inválido - falha na validação');
      throw new BadRequestException('Webhook inválido');
    }
    this.logger.log('✅ [VALIDATION] Webhook validado com sucesso');

    try {
      this.logger.log(`🔄 [PROCESSING] Iniciando processamento do evento: ${body.event}`);
      switch (body.event) {
        case 'transaction':
          this.logger.log('💳 [TRANSACTION] Processando evento de transação');
          return await this.handleTransaction(body);
        default:
          this.logger.warn(`⚠️ [PROCESSING] Evento não suportado: ${body.event}`);
          throw new BadRequestException('Evento não suportado');
      }
    } catch (error) {
      this.logger.error(`💥 [ERROR] Erro ao processar webhook: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Valida se o webhook é autêntico da Pepper
   */
  private validatePepperWebhook(body: any, signature?: string): boolean {
    this.logger.log('🔍 [VALIDATION] Verificando estrutura básica do webhook');
    
    // Verificar estrutura básica do webhook da Pepper
    if (!body.event || !body.customer || !body.transaction) {
      this.logger.error('❌ [VALIDATION] Webhook inválido: estrutura básica incorreta');
      this.logger.error(`❌ [VALIDATION] Campos obrigatórios: event=${!!body.event}, customer=${!!body.customer}, transaction=${!!body.transaction}`);
      return false;
    }
    this.logger.log('✅ [VALIDATION] Estrutura básica válida');

    // Verificar se o evento é suportado
    this.logger.log(`🔍 [VALIDATION] Verificando evento: ${body.event}`);
    const supportedEvents = ['transaction'];
    if (!supportedEvents.includes(body.event)) {
      this.logger.error(`❌ [VALIDATION] Evento não suportado: ${body.event}`);
      this.logger.error(`❌ [VALIDATION] Eventos suportados: ${supportedEvents.join(', ')}`);
      return false;
    }
    this.logger.log('✅ [VALIDATION] Evento suportado');

    // Verificar se é da plataforma Pepper
    this.logger.log(`🔍 [VALIDATION] Verificando plataforma: ${body.platform}`);
    if (body.platform !== 'Pepper') {
      this.logger.error(`❌ [VALIDATION] Plataforma não reconhecida: ${body.platform}`);
      return false;
    }
    this.logger.log('✅ [VALIDATION] Plataforma Pepper confirmada');

    // TODO: Implementar validação de assinatura quando disponível
    if (signature) {
      this.logger.log('🔐 [VALIDATION] Assinatura presente, validando...');
      // if (!this.verifySignature(body, signature)) {
      //   this.logger.error('❌ [VALIDATION] Assinatura do webhook inválida');
      //   return false;
      // }
      this.logger.log('✅ [VALIDATION] Assinatura válida (placeholder)');
    } else {
      this.logger.log('⚠️ [VALIDATION] Nenhuma assinatura fornecida');
    }

    this.logger.log('✅ [VALIDATION] Webhook validado com sucesso');
    return true;
  }

  /**
   * Processa evento de transação da Pepper
   */
  private async handleTransaction(event: any) {
    this.logger.log('💳 [TRANSACTION] Iniciando processamento de transação');
    console.log('🚀 [DEBUG] handleTransaction chamado com sucesso');
    
    const transaction = event.transaction;
    const customer = event.customer;
    const offer = event.offer;
    
    this.logger.log(`💳 [TRANSACTION] Dados da transação: ID=${transaction.id}, Status=${transaction.status}, Amount=${transaction.amount}`);
    this.logger.log(`👤 [TRANSACTION] Dados do cliente: Email=${customer.email}, Name=${customer.name}`);
    
    // Verificar se a transação foi paga
    this.logger.log(`🔍 [TRANSACTION] Verificando status da transação: ${transaction.status}`);
    if (transaction.status !== 'paid') {
      this.logger.log(`⏳ [TRANSACTION] Transação não paga ainda. Status: ${transaction.status}`);
      return { 
        success: true, 
        message: `Transação com status: ${transaction.status}`,
        status: transaction.status
      };
    }

    this.logger.log(`✅ [TRANSACTION] Transação paga detectada. ID: ${transaction.id}`);

    // Extrair email do cliente
    const customerEmail = customer.email;
    
    if (!customerEmail) {
      this.logger.error('❌ [TRANSACTION] Email do cliente não encontrado no webhook');
      throw new BadRequestException('Email do cliente não encontrado');
    }

    this.logger.log(`📧 [TRANSACTION] Email do cliente encontrado: ${customerEmail}`);

    // Verificar se já existe um token para este email
    this.logger.log(`🔍 [TOKEN] Verificando se já existe token para email: ${customerEmail}`);
    const existingToken = await this.prisma.accountCreationToken.findFirst({
      where: {
        email: customerEmail,
        usedAt: null,
        expiresAt: {
          gt: new Date()
        }
      }
    });

    if (existingToken) {
      this.logger.log(`⚠️ [TOKEN] Token já existe para email: ${customerEmail} (ID: ${existingToken.id})`);
      return { 
        success: true, 
        message: 'Token já existe para este email',
        tokenId: existingToken.id
      };
    }
    this.logger.log(`✅ [TOKEN] Nenhum token existente encontrado, prosseguindo com criação`);

    // Mapear plano da oferta Pepper
    const planType = this.mapOfferToPlanType(offer);

    // Criar token temporário para criação de conta
    this.logger.log(`🔧 [TOKEN] Gerando novo token para email: ${customerEmail}`);
    console.log(`🔧 [DEBUG] Gerando token para: ${customerEmail}`);
    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 dias
    console.log(`🔧 [DEBUG] Token gerado: ${token.substring(0, 8)}...`);
    
    this.logger.log(`💾 [TOKEN] Salvando token no banco de dados`);
    const tokenRecord = await this.prisma.accountCreationToken.create({
      data: {
        email: customerEmail,
        token,
        expiresAt,
      }
    });

    // Atualizar planType via SQL para evitar problemas de tipagem quando o client ainda não refletiu o schema
    if (planType) {
      try {
        // Validar planType antes de usar na query
        const validPlanTypes = ['FREE', 'BASIC', 'PRO', 'ENTERPRISE'];
        if (!validPlanTypes.includes(planType)) {
          throw new Error(`Invalid plan type: ${planType}`);
        }
        
        await this.prisma.$executeRaw(
          Prisma.sql`UPDATE "AccountCreationToken" SET "planType" = ${planType} WHERE "id" = ${tokenRecord.id}`
        );
      } catch (e) {
        this.logger.warn(`⚠️ [TOKEN] Falha ao atualizar planType via SQL: ${(e as Error).message}`);
      }
    }

    this.logger.log(`✅ [TOKEN] Token criado com sucesso. ID: ${tokenRecord.id}, Expires: ${expiresAt.toISOString()}`);
    
    // Log do token no console para debugging
    this.logger.log(`🔑 [CONSOLE_LOG] Exibindo token no console...`);
    console.log('🔑 ===========================================');
    console.log('🔑 TOKEN DE CRIAÇÃO DE CONTA GERADO:');
    console.log('🔑 ===========================================');
    console.log(`🔑 Email: ${customerEmail}`);
    console.log(`🔑 Token: ${token}`);
    console.log(`🔑 Expira em: ${expiresAt.toISOString()}`);
    console.log(`🔑 ID do registro: ${tokenRecord.id}`);
    console.log('🔑 ===========================================');
    this.logger.log(`🔑 [CONSOLE_LOG] Token exibido no console com sucesso`);

    // Enviar email com link de criação de conta
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
    const accountCreationLink = `${frontendUrl}/sign-up?token=${token}`;
    
    this.logger.log(`📧 [EMAIL] Preparando envio de email para: ${customerEmail}`);
    this.logger.log(`🔗 [EMAIL] Link de criação de conta: ${accountCreationLink}`);
    
    try {
      this.logger.log(`📤 [EMAIL] Enviando email de criação de conta...`);
      await this.mailService.sendAccountCreationEmail(
        customerEmail, 
        accountCreationLink
      );
      
      this.logger.log(`✅ [EMAIL] Email enviado com sucesso para: ${customerEmail}`);
    } catch (emailError) {
      this.logger.error(`❌ [EMAIL] Erro ao enviar email: ${emailError.message}`);
      this.logger.error(`❌ [EMAIL] Stack trace: ${emailError.stack}`);
      // Não falhar o webhook por erro de email, mas logar o erro
    }

    const result = { 
      success: true, 
      message: 'Token de criação de conta criado e email enviado',
      tokenId: tokenRecord.id,
      email: customerEmail,
      transactionId: transaction.id,
      amount: transaction.amount
    };

    this.logger.log(`🎉 [SUCCESS] Processamento concluído com sucesso: ${JSON.stringify(result)}`);
    return result;
  }

  /**
   * Mapeia a oferta da Pepper para um PlanType do nosso sistema
   * Prioriza PEPPER_OFFER_PLAN_MAP (JSON) no env. Caso não definido, tenta heurísticas por title/hash.
   */
  private mapOfferToPlanType(offer: any): 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE' | null {
    try {
      const mappingRaw = this.configService.get<string>('PEPPER_OFFER_PLAN_MAP');
      if (mappingRaw) {
        const mapping = JSON.parse(mappingRaw) as {
          byHash?: Record<string, 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'>;
          byTitle?: Record<string, 'FREE' | 'BASIC' | 'PRO' | 'ENTERPRISE'>;
        };
        if (offer?.hash && mapping.byHash?.[offer.hash]) return mapping.byHash[offer.hash];
        if (offer?.title && mapping.byTitle?.[offer.title]) return mapping.byTitle[offer.title];
      }
    } catch {}

    // Fallback heurísticas simples por título
    const title = (offer?.title || '').toString().toLowerCase();
    if (!title) return null;
    if (title.includes('starter') || title.includes('basic')) return 'BASIC';
    if (title.includes('pro')) return 'PRO';
    if (title.includes('enterprise') || title.includes('vip') || title.includes('premium')) return 'ENTERPRISE';
    if (title.includes('free') || title.includes('grat')) return 'FREE';
    return null;
  }

  /**
   * Verifica assinatura do webhook (implementar quando disponível)
   */
  private verifySignature(body: any, signature: string): boolean {
    // TODO: Implementar validação de assinatura da Pepper
    // A Pepper pode enviar uma assinatura HMAC para validação
    // Exemplo: verificar HMAC-SHA256 com secret da Pepper
    return true; // Placeholder
  }
}
