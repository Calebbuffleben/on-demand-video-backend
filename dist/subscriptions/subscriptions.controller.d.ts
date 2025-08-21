import { Response, Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { PrismaService } from '../prisma/prisma.service';
interface AuthenticatedRequest extends Request {
    user?: any;
    organization?: any;
    rawOrganizations?: any[];
}
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    private readonly stripeService;
    private readonly prismaService;
    constructor(subscriptionsService: SubscriptionsService, stripeService: StripeService, prismaService: PrismaService);
    createCheckout(createCheckoutDto: CreateCheckoutDto, req: Request): Promise<{
        url: string | null;
    }>;
    getSubscription(organizationId: string, req: AuthenticatedRequest): Promise<{
        status: string;
        subscription: {
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
        };
        organization: {
            id: string;
            name: string;
        };
        message?: undefined;
    } | {
        status: string;
        message: string;
        organization: {
            id: string;
            name: string;
        };
        subscription?: undefined;
    }>;
    listMembers(organizationId: string, req: AuthenticatedRequest): Promise<{
        id: string;
        role: import(".prisma/client").$Enums.Role;
        userId: string;
        firstName: string | undefined;
        lastName: string | undefined;
        email: string;
        createdAt: Date;
    }[]>;
    handleWebhook(signature: string, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCurrentSubscription(req: AuthenticatedRequest): Promise<{
        status: string;
        message: string;
        availableOrganizations: any[];
        organizationId?: undefined;
        organizationName?: undefined;
        subscription?: undefined;
        organization?: undefined;
    } | {
        status: string;
        message: string;
        availableOrganizations?: undefined;
        organizationId?: undefined;
        organizationName?: undefined;
        subscription?: undefined;
        organization?: undefined;
    } | {
        status: string;
        message: string;
        organizationId: any;
        organizationName: any;
        availableOrganizations?: undefined;
        subscription?: undefined;
        organization?: undefined;
    } | {
        status: string;
        subscription: {
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
        };
        organization: {
            id: any;
            name: any;
        };
        message?: undefined;
        availableOrganizations?: undefined;
        organizationId?: undefined;
        organizationName?: undefined;
    }>;
    getUserOrganizations(req: AuthenticatedRequest): Promise<{
        status: string;
        organizations: any[];
        message?: undefined;
    } | {
        status: string;
        message: string;
        organizations?: undefined;
    }>;
}
export {};
