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
}
export declare class AuthService {
    private prisma;
    private configService;
    private mail;
    constructor(prisma: PrismaService, configService: ConfigService, mail: MailService);
    private hashPassword;
    private comparePassword;
    private generateToken;
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
            clerkId: string | null;
            createdAt: Date;
            updatedAt: Date;
            slug: string | null;
            muxTokenId: string | null;
            muxTokenSecret: string | null;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        userId: string;
        organizationId: string;
        role: import(".prisma/client").$Enums.Role;
    })[]>;
}
export {};
