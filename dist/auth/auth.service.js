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
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let AuthService = class AuthService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async verifyToken(token) {
        try {
            const clerkVerification = {
                userId: 'clerk_user_id_here',
                organizationId: 'clerk_org_id_here',
                email: 'user@example.com',
                organizationName: 'Example Org',
                role: 'admin',
            };
            return clerkVerification;
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map