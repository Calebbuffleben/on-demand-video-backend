import { Injectable, InternalServerErrorException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;
  private readonly logger = new Logger(StripeService.name);

  constructor(private configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      this.logger.warn('Stripe disabled: STRIPE_SECRET_KEY not set');
      // @ts-expect-error Intentionally undefined; guard at call sites
      this.stripe = undefined;
      return;
    }
    this.stripe = new Stripe(stripeSecretKey);
  }

  async createCheckoutSession(
    organizationId: string,
    planType: string,
    customerEmail: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured');
    }
    let priceId: string;

    switch (planType) {
      case 'BASIC': {
        const basicPriceId = this.configService.get<string>('STRIPE_PRICE_ID_BASIC');
        if (!basicPriceId) {
          throw new InternalServerErrorException('STRIPE_PRICE_ID_BASIC is not defined');
        }
        priceId = basicPriceId;
        break;
      }
      case 'PRO': {
        const proPriceId = this.configService.get<string>('STRIPE_PRICE_ID_PRO');
        if (!proPriceId) {
          throw new InternalServerErrorException('STRIPE_PRICE_ID_PRO is not defined');
        }
        priceId = proPriceId;
        break;
      }
      case 'ENTERPRISE': {
        const enterprisePriceId = this.configService.get<string>('STRIPE_PRICE_ID_ENTERPRISE');
        if (!enterprisePriceId) {
          throw new InternalServerErrorException('STRIPE_PRICE_ID_ENTERPRISE is not defined');
        }
        priceId = enterprisePriceId;
        break;
      }
      default:
        throw new Error('Invalid plan type');
    }

    const session = await this.stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      mode: 'subscription',
      success_url: successUrl,
      cancel_url: cancelUrl,
      customer_email: customerEmail,
      client_reference_id: organizationId,
      metadata: {
        organizationId,
        planType,
      },
    });

    return session;
  }

  async handleWebhook(signature: string, payload: Buffer) {
    if (!this.stripe) {
      throw new InternalServerErrorException('Stripe is not configured');
    }
    const webhookSecret = this.configService.get<string>('STRIPE_WEBHOOK_SECRET');
    if (!webhookSecret) {
      throw new InternalServerErrorException('STRIPE_WEBHOOK_SECRET is not defined');
    }

    try {
      const event = this.stripe.webhooks.constructEvent(
        payload,
        signature,
        webhookSecret,
      );

      return event;
    } catch (error) {
      throw new Error(`Webhook error: ${error.message}`);
    }
  }

  async getSubscription(subscriptionId: string) {
    return this.stripe.subscriptions.retrieve(subscriptionId);
  }
} 