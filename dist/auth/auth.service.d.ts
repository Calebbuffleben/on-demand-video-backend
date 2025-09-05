import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { User, Organization } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { MailService } from '../mail/mail.service';
interface JwtPayload {
    userId: string;
    organizationId: string;
    type: 'access';
}
interface AuthResponse {
    user: {
        id: string;
        email: string;
        firstName: string | null;
        lastName: string | null;
    };
    organization: {
        id: string;
        name: string;
        slug: string | null;
    };
    token: string;
    refreshToken?: string;
}
export declare class AuthService {
    private prisma;
    private configService;
    private mail;
    constructor(prisma: PrismaService, configService: ConfigService, mail: MailService);
    getInvite(token: string): Promise<{
        email: string;
        token: string;
        id: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        expiresAt: Date;
        usedAt: Date | null;
        createdAt: Date;
    }>;
    consumeInvite(token: string): Promise<{
        email: string;
        token: string;
        id: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        expiresAt: Date;
        usedAt: Date | null;
        createdAt: Date;
    }>;
    private hashPassword;
    private comparePassword;
    private generateToken;
    private issueRefreshToken;
    private hashRefreshToken;
    private getRefreshTtlMs;
    refreshSession(oldRaw: string): Promise<{
        token: string;
        refreshToken: string;
        user: AuthResponse['user'];
        organization: AuthResponse['organization'];
    }>;
    revokeRefreshToken(raw: string): Promise<void>;
    private generateSlug;
    private buildFrontendUrl;
    register(registerDto: RegisterDto): Promise<AuthResponse>;
    login(loginDto: LoginDto): Promise<AuthResponse>;
    requestEmailVerification(email: string): Promise<{
        success: boolean;
    }>;
    verifyEmailToken(token: string): Promise<boolean>;
    requestPasswordReset(email: string): Promise<{
        success: boolean;
    }>;
    resetPassword(token: string, newPassword: string): Promise<{
        success: boolean;
    }>;
    verifyToken(token: string): Promise<JwtPayload | null>;
    getOrCreateUser(userId: string, email: string): Promise<User>;
    getOrCreateOrganization(organizationId: string, name: string, userId: string): Promise<Organization>;
    getUserOrganizations(userId: string): Promise<({
        organization: {
            description: string | null;
            name: string;
            id: string;
            createdAt: Date;
            clerkId: string | null;
            updatedAt: Date;
            slug: string | null;
            muxTokenId: string | null;
            muxTokenSecret: string | null;
        };
    } & {
        id: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
        createdAt: Date;
        userId: string;
        updatedAt: Date;
    })[]>;
}
export {};
