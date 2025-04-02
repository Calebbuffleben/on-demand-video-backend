import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';

@Injectable()
export class StripeService {
  private stripe: Stripe;

  constructor(private configService: ConfigService) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new InternalServerErrorException('STRIPE_SECRET_KEY is not defined');
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