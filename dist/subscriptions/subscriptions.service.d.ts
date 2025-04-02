import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
export declare class SubscriptionsService {
    private prisma;
    private stripeService;
    constructor(prisma: PrismaService, stripeService: StripeService);
    getSubscription(organizationId: string): Promise<{
        organizationId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    createCheckoutSession(organizationId: string, planType: string, customerEmail: string, successUrl: string, cancelUrl: string): Promise<import("stripe").Stripe.Response<import("stripe").Stripe.Checkout.Session>>;
    handleSubscriptionCreated(subscriptionId: string, customerId: string, organizationId: string, planType: string): Promise<{
        organizationId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    handleSubscriptionUpdated(subscriptionId: string, status: string): Promise<{
        organizationId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
}
