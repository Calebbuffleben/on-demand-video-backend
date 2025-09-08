import { Body, Controller, Post } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('api/payments')
export class PaymentsController {
    constructor(private readonly paymentsService: PaymentsService) {}

    // Criar endpoint POST /payments/webhook
    @Post('webhook')
    async webhook(@Body() body: any) {
        return this.paymentsService.webhook(body);
    }
}
