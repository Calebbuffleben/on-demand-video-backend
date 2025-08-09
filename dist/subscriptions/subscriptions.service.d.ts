import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription } from '@prisma/client';
export declare class SubscriptionsService {
    private prisma;
    private stripeService;
    private configService;
    private stripe;
    constructor(prisma: PrismaService, stripeService: StripeService, configService: ConfigService);
    getSubscription(organizationId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    createCheckoutSession(organizationId: string, planType: string, customerEmail: string, successUrl: string, cancelUrl: string): Promise<Stripe.Response<Stripe.Checkout.Session>>;
    handleSubscriptionCreated(subscriptionId: string, customerId: string, organizationId: string, planType: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    handleSubscriptionUpdated(subscriptionId: string, status: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        organizationId: string;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    getCurrentSubscription(user: any): Promise<Subscription | null>;
}
