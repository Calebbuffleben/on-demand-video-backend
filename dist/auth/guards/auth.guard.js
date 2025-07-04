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
        const isPublic = this.reflector.getAllAndOverride(public_decorator_1.IS_PUBLIC_KEY, [
            context.getHandler(),
            context.getClass(),
        ]);
        if (isPublic) {
            return true;
        }
        const request = context.switchToHttp().getRequest();
        const token = this.extractTokenFromHeader(request);
        if (!token) {
            throw new common_1.UnauthorizedException('Authentication token is missing');
        }
        try {
            console.log('Verifying token...');
            const verificationResult = await this.authService.verifyToken(token);
            if (!verificationResult) {
                console.log('Token verification failed');
                throw new common_1.UnauthorizedException('Invalid authentication token');
            }
            console.log('Token verification successful:', JSON.stringify(verificationResult, null, 2));
            const user = await this.authService.getOrCreateUser(verificationResult.userId, verificationResult.email);
            console.log('User from database:', JSON.stringify(user, null, 2));
            if (verificationResult.organizations) {
                console.log('Attaching organizations array to request:', JSON.stringify(verificationResult.organizations, null, 2));
                request['rawOrganizations'] = verificationResult.organizations;
            }
            const requestedOrgId = request.headers['x-organization-id'];
            if (requestedOrgId) {
                console.log('X-Organization-Id header present:', requestedOrgId);
                let organization = await this.prisma.organization.findUnique({
                    where: { clerkId: requestedOrgId },
                });
                if (!organization) {
                    console.log('Organization not found in database, creating from token info...');
                    const orgName = verificationResult.organizationName || 'Unknown Organization';
                    const orgRole = verificationResult.organizationRole || verificationResult.role || 'member';
                    try {
                        organization = await this.authService.getOrCreateOrganization(requestedOrgId, orgName, user.id, orgRole);
                        console.log('Organization created in database:', JSON.stringify(organization, null, 2));
                    }
                    catch (error) {
                        console.error('Failed to create organization:', error);
                    }
                }
                else {
                    const userOrg = await this.prisma.userOrganization.findFirst({
                        where: {
                            userId: user.id,
                            organizationId: organization.id,
                        },
                    });
                    if (!userOrg) {
                        console.log('User membership not found, creating...');
                        const orgRole = verificationResult.organizationRole || verificationResult.role || 'member';
                        const mapClerkRoleToDbRole = (clerkRole) => {
                            if (clerkRole === 'org:admin' || clerkRole === 'admin')
                                return 'ADMIN';
                            if (clerkRole === 'org:owner' || clerkRole === 'owner')
                                return 'OWNER';
                            return 'MEMBER';
                        };
                        try {
                            await this.prisma.userOrganization.create({
                                data: {
                                    userId: user.id,
                                    organizationId: organization.id,
                                    role: mapClerkRoleToDbRole(orgRole),
                                },
                            });
                            console.log('User membership created successfully');
                        }
                        catch (error) {
                            console.error('Failed to create user membership:', error);
                        }
                    }
                }
                if (organization) {
                    console.log('Attaching organization to request:', JSON.stringify(organization, null, 2));
                    request['organization'] = organization;
                }
                else {
                    console.log('Could not resolve organization, falling back to token info');
                    if (verificationResult.organizationId && verificationResult.organizationName) {
                        console.log('Creating fallback organization object from token info');
                        request['organization'] = {
                            id: verificationResult.organizationId,
                            clerkId: verificationResult.organizationId,
                            name: verificationResult.organizationName,
                            createdAt: new Date(),
                            updatedAt: new Date(),
                        };
                    }
                }
            }
            else if (verificationResult.organizationId && verificationResult.organizationName) {
                console.log('Organization info from token:', verificationResult.organizationId, verificationResult.organizationName, verificationResult.organizationRole || 'No role specified');
                const organization = await this.authService.getOrCreateOrganization(verificationResult.organizationId, verificationResult.organizationName, user.id, verificationResult.organizationRole || verificationResult.role || 'member');
                console.log('Organization from database:', JSON.stringify(organization, null, 2));
                request['organization'] = organization;
            }
            else {
                console.log('No specific organization info in token or headers');
            }
            request['user'] = user;
            console.log('Request user and organization attached:', {
                user: !!request['user'],
                organization: !!request['organization'],
                rawOrganizations: !!request['rawOrganizations']
            });
            return true;
        }
        catch (error) {
            console.error('Authentication error:', error);
            throw new common_1.UnauthorizedException('Authentication failed');
        }
    }
    extractTokenFromHeader(request) {
        const [type, token] = request.headers.authorization?.split(' ') ?? [];
        return type === 'Bearer' ? token : undefined;
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