import { BadRequestException, Injectable } from '@nestjs/common';

@Injectable()
export class PaymentsService {
    // Criar metodo para processar o webhook
    async webhook(body: any) {
        // Processar o webhook
        switch (body.type) {
            case 'payment.succeeded':
                return this.handlePaymentSucceeded(body);
            default:
                throw new BadRequestException('Invalid webhook payload');
        }

        return body;
    }

    // Criar metodo para processar o webhook de pagamento realizado
    async handlePaymentSucceeded(body: any) {
        return body;
    }
}
