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
const public_decorator_1 = require("./decorators/public.decorator");
const verify_token_dto_1 = require("./dto/verify-token.dto");
const swagger_1 = require("@nestjs/swagger");
let AuthController = class AuthController {
    authService;
    constructor(authService) {
        this.authService = authService;
    }
    async verifyToken(verifyTokenDto) {
        const verification = await this.authService.verifyToken(verifyTokenDto.token);
        if (!verification) {
            return { success: false, message: 'Invalid token' };
        }
        return {
            success: true,
            user: {
                id: verification.userId,
                email: verification.email,
            },
            organization: verification.organizationId
                ? {
                    id: verification.organizationId,
                    name: verification.organizationName,
                }
                : null,
            role: verification.role,
        };
    }
    async getProfile(request) {
        return {
            user: request.user,
            organization: request.organization || null,
            message: 'You are authenticated',
        };
    }
    async testDebug() {
        return {
            message: 'Debug endpoint working',
            timestamp: new Date().toISOString()
        };
    }
    async debugAuth(req) {
        const authHeader = req.headers.authorization;
        const token = authHeader ? authHeader.split(' ')[1] : null;
        let tokenInfo = null;
        if (token) {
            try {
                tokenInfo = await this.authService.verifyToken(token);
            }
            catch (error) {
                console.error('Token verification error:', error);
            }
        }
        return {
            auth: {
                hasToken: !!token,
                tokenValid: !!tokenInfo,
                user: req.user || null,
                currentOrganization: req.organization || null,
                rawOrganizations: req.rawOrganizations || null,
                tokenInfo: tokenInfo,
            }
        };
    }
};
exports.AuthController = AuthController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('verify'),
    (0, swagger_1.ApiOperation)({ summary: 'Verify a Clerk JWT token' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [verify_token_dto_1.VerifyTokenDto]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "verifyToken", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get authenticated user profile' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "getProfile", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('test-debug'),
    (0, swagger_1.ApiOperation)({ summary: 'Test debug endpoint' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "testDebug", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('debug'),
    (0, swagger_1.ApiOperation)({ summary: 'Debug token and organization access' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AuthController.prototype, "debugAuth", null);
exports.AuthController = AuthController = __decorate([
    (0, swagger_1.ApiTags)('auth'),
    (0, common_1.Controller)('api/auth'),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AuthController);
//# sourceMappingURL=auth.controller.js.map