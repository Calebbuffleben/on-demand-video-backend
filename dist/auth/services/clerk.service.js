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
var ClerkService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const config_1 = require("@nestjs/config");
let ClerkService = ClerkService_1 = class ClerkService {
    prisma;
    clerkClient;
    configService;
    logger = new common_1.Logger(ClerkService_1.name);
    constructor(prisma, clerkClient, configService) {
        this.prisma = prisma;
        this.clerkClient = clerkClient;
        this.configService = configService;
    }
    async syncUser(userData) {
        const clerkId = userData.id;
        if (!clerkId) {
            this.logger.error('User ID missing from webhook data');
            throw new Error('Invalid user data');
        }
        const emailObj = userData.email_addresses?.[0];
        const email = emailObj?.email_address;
        if (!email) {
            this.logger.error('No primary email found for user');
            throw new Error('Email required for user sync');
        }
        try {
            const existingUser = await this.prisma.user.findUnique({
                where: { clerkId },
            });
            if (existingUser) {
                this.logger.log(`Updating existing user with clerkId: ${clerkId}`);
                return this.prisma.user.update({
                    where: { clerkId },
                    data: { email },
                });
            }
            else {
                this.logger.log(`Creating new user with clerkId: ${clerkId}`);
                return this.prisma.user.create({
                    data: { clerkId, email },
                });
            }
        }
        catch (error) {
            this.logger.error(`Error syncing user: ${error.message}`, error.stack);
            throw error;
        }
    }
    async handleUserDeleted(userData) {
        const clerkId = userData.id;
        if (!clerkId) {
            this.logger.error('User ID missing from webhook data');
            throw new Error('Invalid user data');
        }
        try {
            const user = await this.prisma.user.findUnique({
                where: { clerkId },
            });
            if (!user) {
                this.logger.warn(`User with clerkId ${clerkId} not found for deletion`);
                return;
            }
            this.logger.log(`Deleting user with clerkId: ${clerkId}`);
            await this.prisma.user.delete({
                where: { clerkId },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting user: ${error.message}`, error.stack);
            throw error;
        }
    }
    async syncOrganization(orgData) {
        const clerkId = orgData.id;
        const name = orgData.name;
        if (!clerkId || !name) {
            this.logger.error('Organization ID or name missing from webhook data');
            throw new Error('Invalid organization data');
        }
        try {
            const existingOrg = await this.prisma.organization.findUnique({
                where: { clerkId },
            });
            if (existingOrg) {
                this.logger.log(`Updating existing organization with clerkId: ${clerkId}`);
                return this.prisma.organization.update({
                    where: { clerkId },
                    data: { name },
                });
            }
            else {
                const muxTokenId = this.configService.get('MUX_TOKEN_ID');
                const muxTokenSecret = this.configService.get('MUX_TOKEN_SECRET');
                this.logger.log(`Mux credentials found - Token ID: ${muxTokenId ? 'Yes' : 'No'}, Token Secret: ${muxTokenSecret ? 'Yes' : 'No'}`);
                if (!muxTokenId || !muxTokenSecret) {
                    this.logger.warn('Global MUX credentials not configured, organization will be created without Mux credentials');
                }
                this.logger.log(`Creating new organization with clerkId: ${clerkId} and name: ${name}`);
                const newOrg = await this.prisma.organization.create({
                    data: {
                        clerkId,
                        name,
                        muxTokenId,
                        muxTokenSecret,
                    },
                });
                this.logger.log(`Organization created successfully with ID: ${newOrg.id}`);
                this.logger.log(`Mux credentials set - Token ID: ${newOrg.muxTokenId ? 'Yes' : 'No'}, Token Secret: ${newOrg.muxTokenSecret ? 'Yes' : 'No'}`);
                return newOrg;
            }
        }
        catch (error) {
            this.logger.error(`Error syncing organization: ${error.message}`, error.stack);
            throw error;
        }
    }
    async handleOrganizationDeleted(orgData) {
        const clerkId = orgData.id;
        if (!clerkId) {
            this.logger.error('Organization ID missing from webhook data');
            throw new Error('Invalid organization data');
        }
        try {
            const organization = await this.prisma.organization.findUnique({
                where: { clerkId },
            });
            if (!organization) {
                this.logger.warn(`Organization with clerkId ${clerkId} not found for deletion`);
                return;
            }
            this.logger.log(`Deleting organization with clerkId: ${clerkId}`);
            await this.prisma.organization.delete({
                where: { clerkId },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting organization: ${error.message}`, error.stack);
            throw error;
        }
    }
    async syncOrganizationMembership(membershipData) {
        const orgId = membershipData.organization.id;
        const userId = membershipData.public_user_data?.user_id;
        const role = this.mapClerkRoleToDbRole(membershipData.role);
        if (!orgId || !userId) {
            this.logger.error('Organization ID or User ID missing from webhook data');
            throw new Error('Invalid organization membership data');
        }
        try {
            const organization = await this.prisma.organization.findUnique({
                where: { clerkId: orgId },
            });
            if (!organization) {
                this.logger.warn(`Organization with clerkId ${orgId} not found for membership sync`);
                try {
                    const clerkOrg = await this.clerkClient.organizations.getOrganization({
                        organizationId: orgId,
                    });
                    await this.syncOrganization(clerkOrg);
                }
                catch (error) {
                    this.logger.error(`Failed to fetch organization details: ${error.message}`);
                    throw new Error('Organization not found');
                }
            }
            const user = await this.prisma.user.findUnique({
                where: { clerkId: userId },
            });
            if (!user) {
                this.logger.warn(`User with clerkId ${userId} not found for membership sync`);
                try {
                    const clerkUser = await this.clerkClient.users.getUser(userId);
                    await this.syncUser(clerkUser);
                }
                catch (error) {
                    this.logger.error(`Failed to fetch user details: ${error.message}`);
                    throw new Error('User not found');
                }
            }
            const updatedOrg = await this.prisma.organization.findUnique({
                where: { clerkId: orgId },
            });
            const updatedUser = await this.prisma.user.findUnique({
                where: { clerkId: userId },
            });
            if (!updatedOrg || !updatedUser) {
                throw new Error('Failed to create required organization or user');
            }
            const existingMembership = await this.prisma.userOrganization.findUnique({
                where: {
                    userId_organizationId: {
                        userId: updatedUser.id,
                        organizationId: updatedOrg.id,
                    },
                },
            });
            if (existingMembership) {
                this.logger.log(`Updating membership for user ${updatedUser.id} in organization ${updatedOrg.id}`);
                return this.prisma.userOrganization.update({
                    where: {
                        userId_organizationId: {
                            userId: updatedUser.id,
                            organizationId: updatedOrg.id,
                        },
                    },
                    data: { role },
                });
            }
            else {
                this.logger.log(`Creating membership for user ${updatedUser.id} in organization ${updatedOrg.id}`);
                return this.prisma.userOrganization.create({
                    data: {
                        role,
                        user: { connect: { id: updatedUser.id } },
                        organization: { connect: { id: updatedOrg.id } },
                    },
                });
            }
        }
        catch (error) {
            this.logger.error(`Error syncing organization membership: ${error.message}`, error.stack);
            throw error;
        }
    }
    async handleOrganizationMembershipDeleted(membershipData) {
        const orgId = membershipData.organization.id;
        const userId = membershipData.public_user_data?.user_id;
        if (!orgId || !userId) {
            this.logger.error('Organization ID or User ID missing from webhook data');
            throw new Error('Invalid organization membership data');
        }
        try {
            const organization = await this.prisma.organization.findUnique({
                where: { clerkId: orgId },
            });
            const user = await this.prisma.user.findUnique({
                where: { clerkId: userId },
            });
            if (!organization || !user) {
                this.logger.warn(`Organization or user not found for membership deletion`);
                return;
            }
            this.logger.log(`Deleting membership for user ${user.id} in organization ${organization.id}`);
            await this.prisma.userOrganization.delete({
                where: {
                    userId_organizationId: {
                        userId: user.id,
                        organizationId: organization.id,
                    },
                },
            });
        }
        catch (error) {
            this.logger.error(`Error deleting organization membership: ${error.message}`, error.stack);
            throw error;
        }
    }
    mapClerkRoleToDbRole(clerkRole) {
        switch (clerkRole?.toLowerCase()) {
            case 'admin':
                return client_1.Role.ADMIN;
            case 'owner':
                return client_1.Role.OWNER;
            default:
                return client_1.Role.MEMBER;
        }
    }
};
exports.ClerkService = ClerkService;
exports.ClerkService = ClerkService = ClerkService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_1.Inject)('ClerkClient')),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object, config_1.ConfigService])
], ClerkService);
//# sourceMappingURL=clerk.service.js.map