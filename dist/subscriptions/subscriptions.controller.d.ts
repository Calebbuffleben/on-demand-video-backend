import { Response, Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
export declare class SubscriptionsController {
    private readonly subscriptionsService;
    private readonly stripeService;
    constructor(subscriptionsService: SubscriptionsService, stripeService: StripeService);
    createCheckout(createCheckoutDto: CreateCheckoutDto, req: Request): Promise<{
        url: string | null;
    }>;
    getSubscription(organizationId: string, req: Request): Promise<{
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
    handleWebhook(signature: string, req: Request, res: Response): Promise<Response<any, Record<string, any>>>;
}
