import { PrismaService } from '../../prisma/prisma.service';
import { ClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
export declare class ClerkService {
    private readonly prisma;
    private readonly clerkClient;
    private readonly configService;
    private readonly logger;
    constructor(prisma: PrismaService, clerkClient: ClerkClient, configService: ConfigService);
    syncUser(userData: any): Promise<{
        id: string;
        clerkId: string;
        email: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    handleUserDeleted(userData: any): Promise<void>;
    syncOrganization(orgData: any): Promise<{
        name: string;
        id: string;
        clerkId: string;
        createdAt: Date;
        updatedAt: Date;
        muxTokenId: string | null;
        muxTokenSecret: string | null;
    }>;
    handleOrganizationDeleted(orgData: any): Promise<void>;
    syncOrganizationMembership(membershipData: any): Promise<{
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    }>;
    handleOrganizationMembershipDeleted(membershipData: any): Promise<void>;
    private mapClerkRoleToDbRole;
}
