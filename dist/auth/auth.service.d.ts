import { PrismaService } from '../prisma/prisma.service';
import { User, Organization } from '@prisma/client';
import { ClerkVerificationResponse } from './interfaces/clerk-verification.interface';
import { ConfigService } from '@nestjs/config';
import { ClerkClient } from '@clerk/backend';
export declare class AuthService {
    private prisma;
    private configService;
    private clerkClient;
    constructor(prisma: PrismaService, configService: ConfigService, clerkClient: ClerkClient);
    verifyToken(token: string): Promise<ClerkVerificationResponse | null>;
    getOrCreateUser(clerkId: string, email: string): Promise<User>;
    getOrCreateOrganization(clerkOrgId: string, name: string, userId: string, role: string): Promise<Organization>;
    getUserOrganizations(userId: string): Promise<({
        organization: {
            name: string;
            id: string;
            clerkId: string;
            createdAt: Date;
            updatedAt: Date;
            muxTokenId: string | null;
            muxTokenSecret: string | null;
        };
    } & {
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
    })[]>;
}
