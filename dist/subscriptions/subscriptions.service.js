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
const stripe_1 = require("stripe");
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
    stripe;
    constructor(prisma, stripeService, configService) {
        this.prisma = prisma;
        this.stripeService = stripeService;
        this.configService = configService;
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            throw new Error('Stripe secret key is missing');
        }
        this.stripe = new stripe_1.default(stripeSecretKey, {
            apiVersion: '2025-06-30.basil',
        });
    }
    async getSubscription(organizationId) {
        const subscription = await this.prisma.subscription.findUnique({
            where: { organizationId },
        });
        if (!subscription) {
            throw new common_1.NotFoundException(`Subscription for organization ${organizationId} not found`);
        }
        return subscription;
    }
    async createCheckoutSession(organizationId, planType, customerEmail, successUrl, cancelUrl) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            include: { subscription: true },
        });
        if (!organization) {
            throw new common_1.NotFoundException(`Organization with ID ${organizationId} not found`);
        }
        const session = await this.stripeService.createCheckoutSession(organizationId, planType, customerEmail, successUrl, cancelUrl);
        if (!organization.subscription) {
            await this.prisma.subscription.create({
                data: {
                    organizationId,
                    planType: planType,
                    status: 'INACTIVE',
                },
            });
        }
        return session;
    }
    async handleSubscriptionCreated(subscriptionId, customerId, organizationId, planType) {
        const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);
        const subscription = stripeSubscription;
        return this.prisma.subscription.update({
            where: { organizationId },
            data: {
                stripeSubscriptionId: subscriptionId,
                stripeCustomerId: customerId,
                status: 'ACTIVE',
                planType: planType,
                currentPeriodStart: new Date(subscription.current_period_start * 1000),
                currentPeriodEnd: new Date(subscription.current_period_end * 1000),
                cancelAtPeriodEnd: subscription.cancel_at_period_end,
            },
        });
    }
    async handleSubscriptionUpdated(subscriptionId, status) {
        const dbSubscription = await this.prisma.subscription.findUnique({
            where: { stripeSubscriptionId: subscriptionId },
        });
        if (!dbSubscription) {
            throw new common_1.NotFoundException(`Subscription with Stripe ID ${subscriptionId} not found`);
        }
        let dbStatus;
        switch (status) {
            case 'active':
                dbStatus = 'ACTIVE';
                break;
            case 'past_due':
                dbStatus = 'PAST_DUE';
                break;
            case 'canceled':
                dbStatus = 'CANCELED';
                break;
            case 'trialing':
                dbStatus = 'TRIALING';
                break;
            default:
                dbStatus = 'INACTIVE';
        }
        return this.prisma.subscription.update({
            where: { id: dbSubscription.id },
            data: { status: dbStatus },
        });
    }
    async getCurrentSubscription(user) {
        console.log('Getting subscription for user:', JSON.stringify(user, null, 2));
        if (!user || !user.organization) {
            console.log('No organization data found for user');
            return null;
        }
        let organizationId;
        if (typeof user.organization === 'string') {
            organizationId = user.organization;
        }
        else if (user.organization.id) {
            organizationId = user.organization.id;
        }
        else if (Array.isArray(user.organization) && user.organization.length > 0) {
            const firstOrg = user.organization[0];
            organizationId = typeof firstOrg === 'string' ? firstOrg : firstOrg.id;
        }
        else {
            console.log('Could not determine organization ID from data:', user.organization);
            return null;
        }
        console.log('Querying subscription for organization ID:', organizationId);
        const subscription = await this.prisma.subscription.findFirst({
            where: {
                organizationId,
                status: 'ACTIVE',
            },
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