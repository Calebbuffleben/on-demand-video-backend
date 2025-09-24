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
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
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
        const rawToken = (0, crypto_1.randomBytes)(32).toString('hex');
        const tokenHash = (0, crypto_1.createHash)('sha256').update(rawToken).digest('hex');
        const invite = await this.prisma.invite.create({
            data: {
                ...createInviteDto,
                organizationId,
                role: 'MEMBER',
                token: tokenHash,
                expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
            },
        });
        return {
            id: invite.id,
            email: invite.email,
            organizationId: invite.organizationId,
            role: invite.role,
            expiresAt: invite.expiresAt,
            token: rawToken,
            createdAt: invite.createdAt,
        };
    }
    getGraceDays() {
        const raw = this.configService.get('SUBS_GRACE_DAYS');
        const num = Number(raw);
        return Number.isFinite(num) && num >= 0 ? num : 3;
    }
    isWithinGrace(subscription) {
        if (subscription.status !== SubscriptionStatus.PAST_DUE)
            return false;
        if (!subscription.currentPeriodEnd)
            return false;
        const graceMs = this.getGraceDays() * 24 * 60 * 60 * 1000;
        return Date.now() <= new Date(subscription.currentPeriodEnd).getTime() + graceMs;
    }
    isTrialingActive(subscription) {
        if (subscription.status !== SubscriptionStatus.TRIALING)
            return false;
        if (!subscription.trialEndsAt)
            return true;
        return new Date(subscription.trialEndsAt).getTime() >= Date.now();
    }
    async hasActiveAccess(req) {
        const subscription = await this.getSubscriptionStatus(req);
        if (subscription.status === SubscriptionStatus.ACTIVE) {
            return { subscription, hasAccess: true, isWithinGrace: false };
        }
        if (subscription.status === SubscriptionStatus.TRIALING) {
            const ok = this.isTrialingActive(subscription);
            return { subscription, hasAccess: ok, isWithinGrace: false };
        }
        if (subscription.status === SubscriptionStatus.PAST_DUE) {
            const withinGrace = this.isWithinGrace(subscription);
            return { subscription, hasAccess: withinGrace, isWithinGrace: withinGrace };
        }
        if (subscription.status === SubscriptionStatus.CANCELED) {
            if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() >= Date.now()) {
                return { subscription, hasAccess: true, isWithinGrace: false };
            }
            return { subscription, hasAccess: false, isWithinGrace: false };
        }
        return { subscription, hasAccess: false, isWithinGrace: false };
    }
    async getSubscriptionStatus(req) {
        const organizationId = req.organization?.id;
        if (!organizationId) {
            throw new common_1.NotFoundException('Organization not found');
        }
        const subscription = await this.prisma.subscription.findUnique({
            where: { organizationId },
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
    async getCurrentPlan(req) {
        const organizationId = req.organization?.id;
        const userId = req.user?.id;
        if (!organizationId) {
            throw new common_1.NotFoundException('Organization not found');
        }
        if (!userId) {
            throw new common_1.NotFoundException('User not found');
        }
        const subscription = await this.prisma.subscription.findUnique({ where: { organizationId } });
        if (!subscription)
            throw new common_1.NotFoundException('Subscription not found');
        const plan = subscription.planType || client_1.PlanType.FREE;
        return { userPlanType: plan, subscription };
    }
    async createCheckoutSession(dto, req) {
        const organizationId = req.organization?.id;
        const customerEmail = req.user?.email || '';
        if (!organizationId)
            throw new common_1.NotFoundException('Organization not found');
        return this.stripeService.createCheckoutSession(organizationId, dto.planType, customerEmail, dto.successUrl, dto.cancelUrl);
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