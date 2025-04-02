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
exports.StripeService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const stripe_1 = require("stripe");
let StripeService = class StripeService {
    configService;
    stripe;
    constructor(configService) {
        this.configService = configService;
        const stripeSecretKey = this.configService.get('STRIPE_SECRET_KEY');
        if (!stripeSecretKey) {
            throw new common_1.InternalServerErrorException('STRIPE_SECRET_KEY is not defined');
        }
        this.stripe = new stripe_1.default(stripeSecretKey);
    }
    async createCheckoutSession(organizationId, planType, customerEmail, successUrl, cancelUrl) {
        let priceId;
        switch (planType) {
            case 'BASIC': {
                const basicPriceId = this.configService.get('STRIPE_PRICE_ID_BASIC');
                if (!basicPriceId) {
                    throw new common_1.InternalServerErrorException('STRIPE_PRICE_ID_BASIC is not defined');
                }
                priceId = basicPriceId;
                break;
            }
            case 'PRO': {
                const proPriceId = this.configService.get('STRIPE_PRICE_ID_PRO');
                if (!proPriceId) {
                    throw new common_1.InternalServerErrorException('STRIPE_PRICE_ID_PRO is not defined');
                }
                priceId = proPriceId;
                break;
            }
            case 'ENTERPRISE': {
                const enterprisePriceId = this.configService.get('STRIPE_PRICE_ID_ENTERPRISE');
                if (!enterprisePriceId) {
                    throw new common_1.InternalServerErrorException('STRIPE_PRICE_ID_ENTERPRISE is not defined');
                }
                priceId = enterprisePriceId;
                break;
            }
            default:
                throw new Error('Invalid plan type');
        }
        const session = await this.stripe.checkout.sessions.create({
            payment_method_types: ['card'],
            line_items: [
                {
                    price: priceId,
                    quantity: 1,
                },
            ],
            mode: 'subscription',
            success_url: successUrl,
            cancel_url: cancelUrl,
            customer_email: customerEmail,
            client_reference_id: organizationId,
            metadata: {
                organizationId,
                planType,
            },
        });
        return session;
    }
    async handleWebhook(signature, payload) {
        const webhookSecret = this.configService.get('STRIPE_WEBHOOK_SECRET');
        if (!webhookSecret) {
            throw new common_1.InternalServerErrorException('STRIPE_WEBHOOK_SECRET is not defined');
        }
        try {
            const event = this.stripe.webhooks.constructEvent(payload, signature, webhookSecret);
            return event;
        }
        catch (error) {
            throw new Error(`Webhook error: ${error.message}`);
        }
    }
    async getSubscription(subscriptionId) {
        return this.stripe.subscriptions.retrieve(subscriptionId);
    }
};
exports.StripeService = StripeService;
exports.StripeService = StripeService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], StripeService);
//# sourceMappingURL=stripe.service.js.map