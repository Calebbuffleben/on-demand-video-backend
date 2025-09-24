import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, PlanType } from '@prisma/client';
import { CreateInviteDto } from './dto/create-invite.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Request } from 'express';
export declare class SubscriptionsService {
    private prisma;
    private stripeService;
    private configService;
    constructor(prisma: PrismaService, stripeService: StripeService, configService: ConfigService);
    createInvite(createInviteDto: CreateInviteDto, req: Request): Promise<{
        id: string;
        email: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        expiresAt: Date;
        token: string;
        createdAt: Date;
    }>;
    private getGraceDays;
    private isWithinGrace;
    private isTrialingActive;
    hasActiveAccess(req: Request): Promise<{
        subscription: Subscription;
        hasAccess: boolean;
        isWithinGrace: boolean;
    }>;
    getSubscriptionStatus(req: Request): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    pauseSubscription(req: Request): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    resumeSubscription(req: Request): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    cancelSubscription(req: Request): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    updateSubscription(req: Request): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
    getCurrentPlan(req: Request): Promise<{
        userPlanType: PlanType;
        subscription: Subscription;
    }>;
    createCheckoutSession(dto: CreateCheckoutDto, req: Request): Promise<Stripe.Response<Stripe.Checkout.Session>>;
}
