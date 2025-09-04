import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { CreateInviteDto } from './dto/create-invite.dto';
interface AuthenticatedRequest extends Request {
    user?: any;
    organization?: any;
    rawOrganizations?: any[];
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
        createdAt: Date;
    }>;
}
export {};
