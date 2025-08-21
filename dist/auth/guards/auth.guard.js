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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthGuard = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const auth_service_1 = require("../auth.service");
const public_decorator_1 = require("../decorators/public.decorator");
const prisma_service_1 = require("../../prisma/prisma.service");
let AuthGuard = class AuthGuard {
    authService;
    reflector;
    prisma;
    constructor(authService, reflector, prisma) {
        this.authService = authService;
        this.reflector = reflector;
        this.prisma = prisma;
    }
    async canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const path = request.path;
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const token = this.extractToken(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Authentication token is missing');
        }
        try {
            const verificationResult = await this.authService.verifyToken(token);
            if (!verificationResult) {
                throw new common_1.UnauthorizedException('Invalid authentication token');
            }
            const user = await this.prisma.user.findUnique({
                where: { id: verificationResult.userId }
            });
            if (!user) {
                throw new common_1.UnauthorizedException('User not found');
            }
            const organization = await this.prisma.organization.findUnique({
                where: { id: verificationResult.organizationId }
            });
            if (!organization) {
                throw new common_1.UnauthorizedException('Organization not found');
            }
            const userOrg = await this.prisma.userOrganization.findUnique({
                where: {
                    userId_organizationId: {
                        userId: user.id,
                        organizationId: organization.id,
                    }
                }
            });
            if (!userOrg) {
                throw new common_1.UnauthorizedException('User does not belong to organization');
            }
            request['user'] = user;
            request['organization'] = organization;
            request['userRole'] = userOrg.role;
            return true;
        }
        catch (error) {
            console.error('Authentication error:', error);
            throw new common_1.UnauthorizedException('Authentication failed');
        }
    }
    extractToken(request) {
        const cookieToken = request.cookies?.scale_token;
        if (cookieToken) {
            return cookieToken;
        }
        const authHeader = request.headers.authorization;
        if (authHeader && authHeader.startsWith('Bearer ')) {
            return authHeader.substring(7);
        }
        return undefined;
    }
};
exports.AuthGuard = AuthGuard;
exports.AuthGuard = AuthGuard = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [auth_service_1.AuthService,
        core_1.Reflector,
        prisma_service_1.PrismaService])
], AuthGuard);
//# sourceMappingURL=auth.guard.js.map