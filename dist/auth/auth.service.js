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
            const tokenPayload = await (0, backend_1.verifyToken)(token, {
                secretKey: this.configService.get('CLERK_SECRET_KEY'),
            });
            if (!tokenPayload || !tokenPayload.sub) {
                return null;
            }
            const clerkUser = await this.clerkClient.users.getUser(tokenPayload.sub);
            if (!clerkUser) {
                return null;
            }
            let organizationId;
            let organizationName;
            let role;
            if (tokenPayload.org_id) {
                organizationId = tokenPayload.org_id;
                try {
                    const org = await this.clerkClient.organizations.getOrganization({
                        organizationId: tokenPayload.org_id,
                    });
                    organizationName = org.name;
                    const membershipsResponse = await this.clerkClient.organizations.getOrganizationMembershipList({
                        organizationId: tokenPayload.org_id,
                    });
                    const userMembership = membershipsResponse.data.find(membership => membership.publicUserData?.userId === tokenPayload.sub);
                    role = userMembership?.role;
                }
                catch (error) {
                    console.error('Error fetching organization details:', error);
                }
            }
            return {
                userId: clerkUser.id,
                email: clerkUser.emailAddresses[0]?.emailAddress || '',
                organizationId,
                organizationName,
                role,
            };
        }
        catch (error) {
            console.error('Error verifying token:', error);
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
        if (!organization) {
            organization = await this.prisma.organization.create({
                data: {
                    name,
                    clerkId: clerkOrgId,
                    users: {
                        create: {
                            role: role === 'admin' ? 'ADMIN' : role === 'owner' ? 'OWNER' : 'MEMBER',
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
                        role: role === 'admin' ? 'ADMIN' : role === 'owner' ? 'OWNER' : 'MEMBER',
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
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_1.Inject)('ClerkClient')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService, Object])
], AuthService);
//# sourceMappingURL=auth.service.js.map