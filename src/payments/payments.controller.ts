import { Body, Controller, Post, Headers, Logger } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { Public } from '../auth/decorators/public.decorator';

@Controller('api/payments')
export class PaymentsController {
  private readonly logger = new Logger(PaymentsController.name);

  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Endpoint para receber webhooks da Pepper
   */
  @Public()
  @Post('webhook')
  async webhook(
    @Body() body: any,
    @Headers() headers: any
  ) {
    this.logger.log('🔔 [CONTROLLER] Webhook da Pepper recebido');
    this.logger.log(`📋 [CONTROLLER] Headers: ${JSON.stringify(headers)}`);
    this.logger.log(`📋 [CONTROLLER] Body: ${JSON.stringify(body)}`);

    try {
      // Extrair assinatura do header (se disponível)
      const signature = headers['x-pepper-signature'] || headers['pepper-signature'];
      
      if (signature) {
        this.logger.log(`🔐 [CONTROLLER] Assinatura encontrada: ${signature}`);
      } else {
        this.logger.log(`⚠️ [CONTROLLER] Nenhuma assinatura encontrada nos headers`);
      }
      
      this.logger.log(`🔄 [CONTROLLER] Delegando processamento para PaymentsService`);
      const result = await this.paymentsService.webhook(body, signature);
      
      this.logger.log(`✅ [CONTROLLER] Webhook processado com sucesso: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      this.logger.error(`❌ [CONTROLLER] Erro ao processar webhook: ${error.message}`, error.stack);
      throw error;
    }
  }
}
