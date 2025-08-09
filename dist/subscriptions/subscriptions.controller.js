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
const auth_guard_1 = require("../auth/guards/auth.guard");
const prisma_service_1 = require("../prisma/prisma.service");
const organization_scoped_decorator_1 = require("../common/decorators/organization-scoped.decorator");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    stripeService;
    prismaService;
    constructor(subscriptionsService, stripeService, prismaService) {
        this.subscriptionsService = subscriptionsService;
        this.stripeService = stripeService;
        this.prismaService = prismaService;
    }
    async createCheckout(createCheckoutDto, req) {
        const { planType, successUrl, cancelUrl } = createCheckoutDto;
        const organizationId = req['organization'].id;
        const userEmail = req['user'].email;
        const session = await this.subscriptionsService.createCheckoutSession(organizationId, planType, userEmail, successUrl, cancelUrl);
        return { url: session.url };
    }
    async getSubscription(organizationId, req) {
        console.log(`Getting subscription for organization ID: ${organizationId}`);
        const userData = req.user;
        if (!userData) {
            throw new common_1.BadRequestException('User information not found');
        }
        const userOrganizations = await this.prismaService.userOrganization.findMany({
            where: {
                userId: userData.id
            },
            include: {
                organization: true
            }
        });
        console.log(`User is a member of ${userOrganizations.length} organizations:`, userOrganizations.map(org => ({
            id: org.organization.id,
            name: org.organization.name,
            role: org.role
        })));
        const matchingOrg = userOrganizations.find(org => org.organization.id === organizationId);
        if (!matchingOrg) {
            console.error(`User has no access to organization ${organizationId}`);
            console.error(`User's organizations: ${userOrganizations.map(o => o.organization.id).join(', ')}`);
            throw new common_1.BadRequestException('You do not have access to this organization');
        }
        const organization = matchingOrg.organization;
        console.log(`Found matching organization: ${organization.name} (${organization.id})`);
        try {
            const subscription = await this.subscriptionsService.getSubscription(organization.id);
            return {
                status: 'SUCCESS',
                subscription,
                organization: {
                    id: organization.id,
                    name: organization.name
                }
            };
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException) {
                return {
                    status: 'NO_SUBSCRIPTION',
                    message: 'No active subscription found for this organization',
                    organization: {
                        id: organization.id,
                        name: organization.name
                    }
                };
            }
            throw error;
        }
    }
    async listMembers(organizationId, req) {
        const requesterId = req.user?.id;
        if (!requesterId)
            throw new common_1.BadRequestException('Unauthorized');
        const membership = await this.prismaService.userOrganization.findFirst({
            where: { userId: requesterId, organizationId },
        });
        if (!membership)
            throw new common_1.BadRequestException('You do not have access to this organization');
        const rows = await this.prismaService.userOrganization.findMany({
            where: { organizationId },
            include: { user: true },
            orderBy: { createdAt: 'asc' },
        });
        return rows.map(r => ({
            id: r.id,
            role: r.role,
            userId: r.userId,
            firstName: r.user.firstName ?? undefined,
            lastName: r.user.lastName ?? undefined,
            email: r.user.email,
            createdAt: r.createdAt,
        }));
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
    async getCurrentSubscription(req) {
        const userData = req.user;
        if (!userData) {
            throw new common_1.BadRequestException('User information not found');
        }
        console.log('User data in request:', JSON.stringify(userData, null, 2));
        const organizationData = req.organization;
        console.log('Organization data from request:', JSON.stringify(organizationData, null, 2));
        if (!organizationData) {
            if (req.rawOrganizations && req.rawOrganizations.length > 0) {
                return {
                    status: 'ORGANIZATION_SELECTION_REQUIRED',
                    message: 'Please select an organization to view subscription details.',
                    availableOrganizations: req.rawOrganizations
                };
            }
            return {
                status: 'NO_ORGANIZATION',
                message: 'No organization found for the current user. Please create or join an organization first.'
            };
        }
        const user = {
            id: userData.id,
            email: userData.email,
            organization: organizationData
        };
        console.log('User data for subscription:', JSON.stringify(user, null, 2));
        const subscription = await this.subscriptionsService.getCurrentSubscription(user);
        if (!subscription) {
            return {
                status: 'NO_SUBSCRIPTION',
                message: 'No active subscription found for this organization',
                organizationId: organizationData.id,
                organizationName: organizationData.name
            };
        }
        return {
            status: 'SUCCESS',
            subscription,
            organization: {
                id: organizationData.id,
                name: organizationData.name
            }
        };
    }
    async getUserOrganizations(req) {
        const userData = req.user;
        if (!userData) {
            throw new common_1.BadRequestException('User information not found');
        }
        console.log('Looking up organizations for user ID:', userData.id);
        if (req.rawOrganizations) {
            console.log('Using raw organizations from token:', req.rawOrganizations);
            return {
                status: 'SUCCESS',
                organizations: req.rawOrganizations
            };
        }
        const userOrganizations = await this.prismaService.userOrganization.findMany({
            where: {
                userId: userData.id
            },
            include: {
                organization: true
            }
        });
        console.log('Found organizations in database:', JSON.stringify(userOrganizations, null, 2));
        if (!userOrganizations || userOrganizations.length === 0) {
            return {
                status: 'NO_ORGANIZATIONS',
                message: 'User does not belong to any organizations'
            };
        }
        const organizations = userOrganizations.map(uo => ({
            id: uo.organization.id,
            name: uo.organization.name,
            role: uo.role
        }));
        return {
            status: 'SUCCESS',
            organizations
        };
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Post)('create-checkout'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
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
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
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
    (0, common_1.Get)('members/:organizationId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'List organization members' }),
    __param(0, (0, common_1.Param)('organizationId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "listMembers", null);
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
__decorate([
    (0, common_1.Get)('current'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get the current user\'s subscription' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getCurrentSubscription", null);
__decorate([
    (0, common_1.Get)('organizations'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get organizations for the current user' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return the list of organizations.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getUserOrganizations", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, common_1.Controller)('api/subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService,
        stripe_service_1.StripeService,
        prisma_service_1.PrismaService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map