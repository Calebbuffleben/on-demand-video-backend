import { PrismaService } from '../prisma/prisma.service';
import { User, Organization } from '@prisma/client';
import { ClerkVerificationResponse } from './interfaces/clerk-verification.interface';
export declare class AuthService {
    private prisma;
    constructor(prisma: PrismaService);
    verifyToken(token: string): Promise<ClerkVerificationResponse | null>;
    getOrCreateUser(clerkId: string, email: string): Promise<User>;
    getOrCreateOrganization(clerkOrgId: string, name: string, userId: string, role: string): Promise<Organization>;
}
