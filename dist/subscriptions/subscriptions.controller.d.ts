import { Request } from 'express';
import { LimitsService } from '../common/limits.service';
import { SubscriptionsService } from './subscriptions.service';
import { PlanType } from '@prisma/client';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { CreateInviteDto } from './dto/create-invite.dto';
interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
        clerkId: string | null;
        password: string | null;
        emailVerified: boolean;
        lastLogin: Date | null;
        createdAt: Date;
        updatedAt: Date;
    };
    organization?: {
        id: string;
        name: string;
        clerkId: string | null;
        slug: string | null;
        description: string | null;
        createdAt: Date;
        updatedAt: Date;
        muxTokenId: string | null;
        muxTokenSecret: string | null;
    };
    userRole?: 'OWNER' | 'ADMIN' | 'MEMBER';
}
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    private readonly limitsService;
    constructor(subscriptionsService: SubscriptionsService, limitsService: LimitsService);
    createInvite(createInviteDto: CreateInviteDto, req: AuthenticatedRequest): Promise<{
        id: string;
        email: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        expiresAt: Date;
        token: string;
        createdAt: Date;
    }>;
    pauseSubscription(req: AuthenticatedRequest): Promise<{
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
    resumeSubscription(req: AuthenticatedRequest): Promise<{
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
    cancelSubscription(req: AuthenticatedRequest): Promise<{
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
    getSubscriptionStatus(req: AuthenticatedRequest): Promise<{
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
    getCurrent(req: AuthenticatedRequest): Promise<{
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
    getCurrentPlan(req: AuthenticatedRequest): Promise<{
        userPlanType: PlanType;
        subscription: any;
    }>;
    hasAccess(req: AuthenticatedRequest): Promise<{
        hasAccess: boolean;
        isWithinGrace: boolean;
        subscription: {
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
        };
    }>;
    createCheckout(body: CreateCheckoutDto, req: AuthenticatedRequest): Promise<import("stripe").Stripe.Response<import("stripe").Stripe.Checkout.Session>>;
    getMyOrgUsage(req: AuthenticatedRequest): Promise<{
        organizationId: string;
        plan: import(".prisma/client").$Enums.PlanType;
        limits: import("../common/limits.service").PlanLimits;
        usage: {
            storageGB: number;
            totalMinutes: number;
            uniqueViews: number;
        };
    }>;
    getOrgUsage(req: AuthenticatedRequest, organizationId: string): Promise<{
        organizationId: string;
        plan: import(".prisma/client").$Enums.PlanType;
        limits: import("../common/limits.service").PlanLimits;
        usage: {
            storageGB: number;
            totalMinutes: number;
            uniqueViews: number;
        };
    }>;
}
export {};
