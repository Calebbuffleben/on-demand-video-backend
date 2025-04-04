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
    } | {
        status: string;
        message: string;
    }>;
    handleWebhook(signature: string, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
    getCurrentSubscription(req: AuthenticatedRequest): Promise<{
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
    } | {
        status: string;
        message: string;
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
