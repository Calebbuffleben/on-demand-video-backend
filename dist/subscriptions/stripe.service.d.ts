import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
export declare class StripeService {
    private configService;
    private stripe;
    private readonly logger;
    constructor(configService: ConfigService);
    createCheckoutSession(organizationId: string, planType: string, customerEmail: string, successUrl: string, cancelUrl: string): Promise<Stripe.Response<Stripe.Checkout.Session>>;
    handleWebhook(signature: string, payload: Buffer): Promise<Stripe.Event>;
    getSubscription(subscriptionId: string): Promise<Stripe.Response<Stripe.Subscription>>;
}
