import { AuthService } from './auth.service';
import { VerifyTokenDto } from './dto/verify-token.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    verifyToken(verifyTokenDto: VerifyTokenDto): Promise<{
        success: boolean;
        message: string;
        user?: undefined;
        organization?: undefined;
        role?: undefined;
    } | {
        success: boolean;
        user: {
            id: string;
            email: string;
        };
        organization: {
            id: string;
            name: string | undefined;
        } | null;
        role: string | undefined;
        message?: undefined;
    }>;
    refreshToken(req: any): Promise<{
        success: boolean;
        message: string;
        user?: undefined;
        organization?: undefined;
    } | {
        success: boolean;
        message: string;
        user: {
            id: string;
            email: string;
        };
        organization: {
            id: string;
            name: string | undefined;
        } | null;
    }>;
    getProfile(request: any): Promise<{
        user: any;
        organization: any;
        message: string;
    }>;
    testDebug(): Promise<{
        message: string;
        timestamp: string;
    }>;
    debugAuth(req: any): Promise<{
        auth: {
            hasToken: boolean;
            tokenValid: boolean;
            user: any;
            currentOrganization: any;
            rawOrganizations: any;
            tokenInfo: any;
        };
    }>;
}
