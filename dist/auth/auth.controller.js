"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthController = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("./auth.service");
const register_dto_1 = require("./dto/register.dto");
const login_dto_1 = require("./dto/login.dto");
const auth_guard_1 = require("./guards/auth.guard");
const public_decorator_1 = require("./decorators/public.decorator");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
let AuthController = class AuthController {
    authService;
    configService;
    constructor(authService, configService) {
        this.authService = authService;
        this.configService = configService;
    }
    getCookieOptions() {
        const isProduction = this.configService.get('NODE_ENV') === 'production';
        const cookieDomain = this.configService.get('COOKIE_DOMAIN');
        const cookieSameSite = this.configService.get('COOKIE_SAMESITE');
        return {
            httpOnly: true,
            secure: isProduction,
            sameSite: cookieSameSite || (isProduction ? 'none' : 'lax'),
            domain: cookieDomain || undefined,
            path: '/',
        };
    }
    async getInvite(token) {
        try {
            return this.authService.getInvite(token);
        }
        catch (error) {
            throw new common_1.NotFoundException('Invite not found');
        }
    }
    async consumeInvite(token) {
        try {
            return this.authService.consumeInvite(token);
        }
        catch (error) {
            throw new common_1.NotFoundException('Invite not found');
        }
    }
    async register(registerDto, res) {
        const result = await this.authService.register(registerDto);
        res.cookie('scale_token', result.token, {
            ...this.getCookieOptions(),
            maxAge: 7 * 24 * 60 * 60 * 1000,
        });
        if (result.refreshToken) {
            res.cookie('scale_refresh', result.refreshToken, {
                ...this.getCookieOptions(),
                maxAge: Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30) * 24 * 60 * 60 * 1000,
            });
        }
        res.status(common_1.HttpStatus.CREATED).json({
            user: result.user,
            organization: result.organization,
            token: result.token,
            message: 'User registered successfully'
        });
    }
    async login(loginDto, res) {
        try {
            const result = await this.authService.login(loginDto);
            res.cookie('scale_token', result.token, {
                ...this.getCookieOptions(),
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            if (result.refreshToken) {
                res.cookie('scale_refresh', result.refreshToken, {
                    ...this.getCookieOptions(),
                    maxAge: Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30) * 24 * 60 * 60 * 1000,
                });
            }
            res.json({
                user: result.user,
                organization: result.organization,
                token: result.token,
                message: 'Login successful'
            });
        }
        catch (err) {
            if (err instanceof common_1.BadRequestException) {
                const msg = err.getResponse()?.message || String(err.message || '');
                if (typeof msg === 'string' && msg.toLowerCase().includes('password setup required')) {
                    return res.status(common_1.HttpStatus.OK).json({
                        requiresPasswordSetup: true,
                        message: 'Password setup required. We sent a reset link to your email.',
                    });
                }
            }
            throw err;
        }
    }
    async logout(req, res) {
        res.clearCookie('scale_token', this.getCookieOptions());
        const refresh = req.cookies?.scale_refresh;
        if (refresh) {
            try {
                await this.authService.revokeRefreshToken(refresh);
            }
            catch { }
        }
        res.clearCookie('scale_refresh', this.getCookieOptions());
        res.json({ message: 'Logged out successfully' });
    }
    async refresh(req, res) {
        const refresh = req.cookies?.scale_refresh;
        if (!refresh) {
            return res.status(common_1.HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' });
        }
        try {
            const result = await this.authService.refreshSession(refresh);
            res.cookie('scale_token', result.token, {
                ...this.getCookieOptions(),
                maxAge: 7 * 24 * 60 * 60 * 1000,
            });
            res.cookie('scale_refresh', result.refreshToken, {
                ...this.getCookieOptions(),
                maxAge: Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30) * 24 * 60 * 60 * 1000,
            });
            return res.json({
                user: result.user,
                organization: result.organization,
                token: result.token,
            });
        }
        catch (e) {
            return res.status(common_1.HttpStatus.UNAUTHORIZED).json({ message: 'Invalid refresh token' });
        }
    }
    async getProfile(req) {
        return {
            user: req.user,
            organization: req.organization,
            userRole: req.userRole,
        };
    }
    async verifyToken(body) {
        const verification = await this.authService.verifyToken(body.token);
        if (!verification) {
            return { success: false, message: 'Invalid token' };
        }
        return {
            success: true,
            userId: verification.userId,
            organizationId: verification.organizationId,
        };
    }
    async requestEmailVerification(body) {
        return this.authService.requestEmailVerification(body.email);
    }
    async verifyEmail(token, res) {
        const ok = await this.authService.verifyEmailToken(token);
        if (!ok) {
            return res.status(common_1.HttpStatus.BAD_REQUEST).json({ success: false, message: 'Invalid or expired token' });
        }
        return res.json({ success: true });
    }
    async requestPasswordReset(body) {
        return this.authService.requestPasswordReset(body.email);
    }
    async resetPassword(body) {
        return this.authService.resetPassword(body.token, body.password);
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('invite/:token'),
    (0, swagger_1.ApiOperation)({ summary: 'Get invite by token' }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getInvite", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('invite/:token/consume'),
    (0, swagger_1.ApiOperation)({ summary: 'Consume invite by token' }),
    __param(0, (0, common_1.Param)('token')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "consumeInvite", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('register'),
    (0, swagger_1.ApiOperation)({ summary: 'Register a new user' }),
    (0, swagger_1.ApiBody)({ type: register_dto_1.RegisterDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [register_dto_1.RegisterDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "register", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('login'),
    (0, swagger_1.ApiOperation)({ summary: 'Login user' }),
    (0, swagger_1.ApiBody)({ type: login_dto_1.LoginDto }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [login_dto_1.LoginDto, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "login", null);
__decorate([
    (0, common_1.Post)('logout'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Logout user' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "logout", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('refresh'),
    (0, swagger_1.ApiOperation)({ summary: 'Refresh access token using refresh token cookie' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "refresh", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user profile' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify JWT token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyToken", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('email/request-verification'),
    (0, swagger_1.ApiOperation)({ summary: 'Request email verification (sends email)' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestEmailVerification", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('email/verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify email with token' }),
    __param(0, (0, common_1.Query)('token')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyEmail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('password/forgot'),
    (0, swagger_1.ApiOperation)({ summary: 'Request password reset email' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "requestPasswordReset", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('password/reset'),
    (0, swagger_1.ApiOperation)({ summary: 'Reset password with token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "resetPassword", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        config_1.ConfigService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map