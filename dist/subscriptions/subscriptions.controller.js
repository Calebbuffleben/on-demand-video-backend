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
exports.SubscriptionsController = void 0;
const common_1 = require("@nestjs/common");
const subscriptions_service_1 = require("./subscriptions.service");
const stripe_service_1 = require("./stripe.service");
const create_checkout_dto_1 = require("./dto/create-checkout.dto");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const swagger_1 = require("@nestjs/swagger");
const raw_body_1 = require("raw-body");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    stripeService;
    constructor(subscriptionsService, stripeService) {
        this.subscriptionsService = subscriptionsService;
        this.stripeService = stripeService;
    }
    async createCheckout(createCheckoutDto, req) {
        const { planType, successUrl, cancelUrl } = createCheckoutDto;
        const organizationId = req['organization'].id;
        const userEmail = req['user'].email;
        const session = await this.subscriptionsService.createCheckoutSession(organizationId, planType, userEmail, successUrl, cancelUrl);
        return { url: session.url };
    }
    async getSubscription(organizationId, req) {
        const userOrganization = req['organization'];
        if (userOrganization.id !== organizationId) {
            throw new common_1.BadRequestException('You do not have access to this organization');
        }
        return this.subscriptionsService.getSubscription(organizationId);
    }
    async handleWebhook(signature, req, res) {
        if (!signature) {
            throw new common_1.BadRequestException('Missing stripe-signature header');
        }
        const payload = await (0, raw_body_1.default)(req);
        const event = await this.stripeService.handleWebhook(signature, payload);
        switch (event.type) {
            case 'checkout.session.completed': {
                const session = event.data.object;
                const organizationId = session.client_reference_id;
                const customerId = session.customer;
                const subscriptionId = session.subscription;
                if (!session.metadata || !session.metadata.planType) {
                    throw new common_1.BadRequestException('Missing plan type in metadata');
                }
                const planType = session.metadata.planType;
                if (typeof organizationId !== 'string' ||
                    typeof customerId !== 'string' ||
                    typeof subscriptionId !== 'string') {
                    throw new common_1.BadRequestException('Invalid checkout session data');
                }
                await this.subscriptionsService.handleSubscriptionCreated(subscriptionId, customerId, organizationId, planType);
                break;
            }
            case 'customer.subscription.updated':
            case 'customer.subscription.deleted': {
                const subscription = event.data.object;
                if (typeof subscription.id !== 'string' || typeof subscription.status !== 'string') {
                    throw new common_1.BadRequestException('Invalid subscription data');
                }
                await this.subscriptionsService.handleSubscriptionUpdated(subscription.id, subscription.status);
                break;
            }
        }
        return res.json({ received: true });
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Post)('create-checkout'),
    (0, swagger_1.ApiOperation)({ summary: 'Create a Stripe checkout session' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return the checkout session information.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_checkout_dto_1.CreateCheckoutDto, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.Get)(':organizationId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get subscription details for an organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return the subscription details.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Subscription not found.' }),
    __param(0, (0, common_1.Param)('organizationId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscription", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Handle Stripe webhooks' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Successfully processed webhook event.' }),
    __param(0, (0, common_1.Headers)('stripe-signature')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "handleWebhook", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, common_1.Controller)('api/subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService,
        stripe_service_1.StripeService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map