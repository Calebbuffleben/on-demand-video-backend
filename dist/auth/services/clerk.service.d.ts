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
        email: string;
        id: string;
        clerkId: string;
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
        userId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
    }>;
    handleOrganizationMembershipDeleted(membershipData: any): Promise<void>;
    private mapClerkRoleToDbRole;
}
