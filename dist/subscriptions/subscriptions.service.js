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
exports.SubscriptionsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const stripe_service_1 = require("./stripe.service");
const config_1 = require("@nestjs/config");
var PlanType;
(function (PlanType) {
    PlanType["FREE"] = "FREE";
    PlanType["BASIC"] = "BASIC";
    PlanType["PRO"] = "PRO";
    PlanType["ENTERPRISE"] = "ENTERPRISE";
})(PlanType || (PlanType = {}));
var SubscriptionStatus;
(function (SubscriptionStatus) {
    SubscriptionStatus["ACTIVE"] = "ACTIVE";
    SubscriptionStatus["INACTIVE"] = "INACTIVE";
    SubscriptionStatus["PAST_DUE"] = "PAST_DUE";
    SubscriptionStatus["CANCELED"] = "CANCELED";
    SubscriptionStatus["TRIALING"] = "TRIALING";
})(SubscriptionStatus || (SubscriptionStatus = {}));
let SubscriptionsService = class SubscriptionsService {
    prisma;
    stripeService;
    configService;
    constructor(prisma, stripeService, configService) {
        this.prisma = prisma;
        this.stripeService = stripeService;
        this.configService = configService;
    }
    async createInvite(createInviteDto, req) {
        const organizationId = req.organization?.id;
        if (!organizationId) {
            throw new common_1.NotFoundException('Organization not found');
        }
        return this.prisma.invite.create({
            data: {
                ...createInviteDto,
                organizationId,
                role: 'MEMBER',
                token: this.generateInviteToken(),
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
    }
    generateInviteToken() {
        return Math.random().toString(36).substring(2) + Date.now().toString(36);
    }
    async getSubscriptionStatus(req) {
        const organizationId = req.organization?.id;
        if (!organizationId) {
            throw new common_1.NotFoundException('Organization not found');
        }
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                organizationId,
                status: SubscriptionStatus.ACTIVE,
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        return subscription;
    }
    async pauseSubscription(req) {
        const organizationId = req.organization?.id;
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                organizationId,
                status: SubscriptionStatus.ACTIVE,
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.INACTIVE },
        });
        return subscription;
    }
    async resumeSubscription(req) {
        const organizationId = req.organization?.id;
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                organizationId,
                status: SubscriptionStatus.INACTIVE,
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Organization not found');
        }
        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.ACTIVE },
        });
        return subscription;
    }
    async cancelSubscription(req) {
        const organizationId = req.organization?.id;
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                organizationId,
                status: SubscriptionStatus.ACTIVE,
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Subscription not found');
        }
        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.CANCELED },
        });
        return subscription;
    }
    async updateSubscription(req) {
        const organizationId = req.organization?.id;
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                organizationId,
                status: SubscriptionStatus.ACTIVE,
            },
        });
        if (!subscription) {
            throw new common_1.NotFoundException('Organization not found');
        }
        await this.prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: SubscriptionStatus.ACTIVE },
        });
        return subscription;
    }
};
exports.SubscriptionsService = SubscriptionsService;
exports.SubscriptionsService = SubscriptionsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        stripe_service_1.StripeService,
        config_1.ConfigService])
], SubscriptionsService);
//# sourceMappingURL=subscriptions.service.js.map