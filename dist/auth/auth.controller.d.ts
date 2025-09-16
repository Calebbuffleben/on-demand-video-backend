import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
import { ConsumeInviteDto } from './dto/consume-invite.dto';
import { RegisterWithTokenDto } from './dto/register-with-token.dto';
import { ConfigService } from '@nestjs/config';
export declare class AuthController {
    private readonly authService;
    private readonly configService;
    constructor(authService: AuthService, configService: ConfigService);
    private getCookieOptions;
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
    consumeInvite(token: string, body: ConsumeInviteDto, res: Response): Promise<Response<any, Record<string, any>>>;
    register(registerDto: RegisterDto, res: Response): Promise<void>;
    registerWithToken(registerWithTokenDto: RegisterWithTokenDto, res: Response): Promise<void>;
    login(loginDto: LoginDto, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    logout(req: any, res: Response): Promise<void>;
    refresh(req: any, res: Response): Promise<Response<any, Record<string, any>>>;
    getProfile(req: any): Promise<{
        user: any;
        organization: any;
        userRole: any;
    }>;
    verifyToken(body: {
        token: string;
    }): Promise<{
        success: boolean;
        message: string;
        userId?: undefined;
        organizationId?: undefined;
    } | {
        success: boolean;
        userId: string;
        organizationId: string;
        message?: undefined;
    }>;
    requestEmailVerification(body: {
        email: string;
    }): Promise<{
        success: boolean;
    }>;
    verifyEmail(token: string, res: Response): Promise<Response<any, Record<string, any>>>;
    requestPasswordReset(body: {
        email: string;
    }): Promise<{
        success: boolean;
    }>;
    resetPassword(body: {
        token: string;
        password: string;
    }): Promise<{
        success: boolean;
    }>;
}
