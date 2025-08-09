import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { Response } from 'express';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    register(registerDto: RegisterDto, res: Response): Promise<void>;
    login(loginDto: LoginDto, res: Response): Promise<Response<any, Record<string, any>> | undefined>;
    logout(res: Response): Promise<void>;
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
