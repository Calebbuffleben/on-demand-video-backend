import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import { CreateInviteDto } from './dto/create-invite.dto';
import { Request } from 'express';
export declare class SubscriptionsService {
    private prisma;
    private stripeService;
    private configService;
    constructor(prisma: PrismaService, stripeService: StripeService, configService: ConfigService);
    createInvite(createInviteDto: CreateInviteDto, req: Request): Promise<{
        email: string;
        token: string;
        id: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        expiresAt: Date;
        createdAt: Date;
    }>;
    private generateInviteToken;
}
