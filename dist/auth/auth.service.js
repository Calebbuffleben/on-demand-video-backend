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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const backend_1 = require("@clerk/backend");
let AuthService = class AuthService {
    prisma;
    configService;
    clerkClient;
    constructor(prisma, configService, clerkClient) {
        this.prisma = prisma;
        this.configService = configService;
        this.clerkClient = clerkClient;
    }
    async verifyToken(token) {
        try {
            console.log('🔍 Starting token verification...');
            console.log('🔑 Token length:', token.length);
            console.log('🔑 Token preview:', token.substring(0, 20) + '...');
            const tokenPayload = await (0, backend_1.verifyToken)(token, {
                secretKey: this.configService.get('CLERK_SECRET_KEY'),
            });
            console.log('✅ Token verification successful');
            console.log('📋 Token payload keys:', Object.keys(tokenPayload || {}));
            if (!tokenPayload || !tokenPayload.sub) {
                console.error('❌ Token payload is invalid or missing sub field');
                return null;
            }
            console.log('Token payload from Clerk:', JSON.stringify(tokenPayload, null, 2));
            console.log('🔍 Organization fields in token:', {
                organizationId: tokenPayload.organizationId,
                organizationName: tokenPayload.organizationName,
                organizationRole: tokenPayload.organizationRole,
                org_id: tokenPayload.org_id,
                organization: tokenPayload.organization,
                organizations: tokenPayload.organizations
            });
            const clerkUser = await this.clerkClient.users.getUser(tokenPayload.sub);
            if (!clerkUser) {
                console.error('❌ Could not fetch user from Clerk');
                return null;
            }
            console.log('✅ User fetched from Clerk successfully');
            console.log('Clerk user details:', JSON.stringify({
                id: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress,
                firstName: clerkUser.firstName,
                lastName: clerkUser.lastName,
            }, null, 2));
            let organizationId = tokenPayload.organizationId;
            let organizationName = tokenPayload.organizationName;
            let organizationRole = tokenPayload.organizationRole;
            let role;
            let organizations;
            if (!organizationId && tokenPayload.org_id) {
                organizationId = tokenPayload.org_id;
                try {
                    if (!organizationName) {
                        const org = await this.clerkClient.organizations.getOrganization({
                            organizationId: tokenPayload.org_id,
                        });
                        organizationName = org.name;
                    }
                    if (!organizationRole) {
                        const membershipsResponse = await this.clerkClient.organizations.getOrganizationMembershipList({
                            organizationId: tokenPayload.org_id,
                        });
                        const userMembership = membershipsResponse.data.find(membership => membership.publicUserData?.userId === tokenPayload.sub);
                        organizationRole = userMembership?.role;
                    }
                }
                catch (error) {
                    console.error('Error fetching organization details:', error);
                }
            }
            role = organizationRole || role;
            if (tokenPayload.organization) {
                console.log('Organizations found in token payload:', tokenPayload.organization);
                organizations = Array.isArray(tokenPayload.organization)
                    ? tokenPayload.organization
                    : [tokenPayload.organization];
            }
            else if (tokenPayload.organizations) {
                console.log('Organizations found in token payload (old field name):', tokenPayload.organizations);
                organizations = Array.isArray(tokenPayload.organizations)
                    ? tokenPayload.organizations
                    : [tokenPayload.organizations];
            }
            const result = {
                userId: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                organizationId,
                organizationName,
                organizationRole,
                role,
                organizations,
            };
            console.log('✅ Returning verification result:', JSON.stringify(result, null, 2));
            return result;
        }
        catch (error) {
            console.error('❌ Error verifying token:', error);
            console.error('❌ Error details:', {
                name: error.name,
                message: error.message,
                stack: error.stack
            });
            if (error.message?.includes('jwt')) {
                console.error('❌ JWT verification failed - token might be invalid or expired');
            }
            if (error.message?.includes('secret')) {
                console.error('❌ Secret key issue - check CLERK_SECRET_KEY environment variable');
            }
            return null;
        }
    }
    async getOrCreateUser(clerkId, email) {
        let user = await this.prisma.user.findUnique({
            where: { clerkId },
        });
        if (!user) {
            user = await this.prisma.user.create({
                data: {
                    clerkId,
                    email,
                },
            });
        }
        return user;
    }
    async getOrCreateOrganization(clerkOrgId, name, userId, role) {
        let organization = await this.prisma.organization.findUnique({
            where: { clerkId: clerkOrgId },
        });
        const mapClerkRoleToDbRole = (clerkRole) => {
            if (clerkRole === 'org:admin' || clerkRole === 'admin')
                return 'ADMIN';
            if (clerkRole === 'org:owner' || clerkRole === 'owner')
                return 'OWNER';
            return 'MEMBER';
        };
        const dbRole = mapClerkRoleToDbRole(role);
        if (!organization) {
            organization = await this.prisma.organization.create({
                data: {
                    name,
                    clerkId: clerkOrgId,
                    users: {
                        create: {
                            role: dbRole,
                            user: {
                                connect: { id: userId },
                            },
                        },
                    },
                },
            });
        }
        else {
            const userOrg = await this.prisma.userOrganization.findUnique({
                where: {
                    userId_organizationId: {
                        userId,
                        organizationId: organization.id,
                    },
                },
            });
            if (!userOrg) {
                await this.prisma.userOrganization.create({
                    data: {
                        role: dbRole,
                        user: {
                            connect: { id: userId },
                        },
                        organization: {
                            connect: { id: organization.id },
                        },
                    },
                });
            }
        }
        return organization;
    }
    async getUserOrganizations(userId) {
        return this.prisma.userOrganization.findMany({
            where: { userId },
            include: {
                organization: true
            }
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('ClerkClient')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map