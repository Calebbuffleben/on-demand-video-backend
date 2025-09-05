import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
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
    constructor(subscriptionsService: SubscriptionsService);
    createInvite(createInviteDto: CreateInviteDto, req: AuthenticatedRequest): Promise<{
        email: string;
        token: string;
        id: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        expiresAt: Date;
        usedAt: Date | null;
        createdAt: Date;
    }>;
    pauseSubscription(req: AuthenticatedRequest): Promise<{
        id: string;
        organizationId: string;
        createdAt: Date;
        updatedAt: Date;
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
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
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
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
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
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
        status: import(".prisma/client").$Enums.SubscriptionStatus;
        planType: import(".prisma/client").$Enums.PlanType;
        stripeCustomerId: string | null;
        stripeSubscriptionId: string | null;
        trialEndsAt: Date | null;
        currentPeriodStart: Date | null;
        currentPeriodEnd: Date | null;
        cancelAtPeriodEnd: boolean;
    }>;
}
export {};
