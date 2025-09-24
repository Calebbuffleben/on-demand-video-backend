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
const limits_service_1 = require("../common/limits.service");
const subscriptions_service_1 = require("./subscriptions.service");
const swagger_1 = require("@nestjs/swagger");
const create_checkout_dto_1 = require("./dto/create-checkout.dto");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_scoped_decorator_1 = require("../common/decorators/organization-scoped.decorator");
const create_invite_dto_1 = require("./dto/create-invite.dto");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    limitsService;
    constructor(subscriptionsService, limitsService) {
        this.subscriptionsService = subscriptionsService;
        this.limitsService = limitsService;
    }
    async createInvite(createInviteDto, req) {
        try {
            return this.subscriptionsService.createInvite(createInviteDto, req);
        }
        catch (error) {
            throw new common_1.NotFoundException('Invite not found');
        }
    }
    async pauseSubscription(req) {
        try {
            return this.subscriptionsService.pauseSubscription(req);
        }
        catch (error) {
            throw new common_1.NotFoundException('Subscription not found');
        }
    }
    async resumeSubscription(req) {
        try {
            return this.subscriptionsService.resumeSubscription(req);
        }
        catch (error) {
            throw new common_1.NotFoundException('Subscription not found');
        }
    }
    async cancelSubscription(req) {
        try {
            return this.subscriptionsService.cancelSubscription(req);
        }
        catch (error) {
            throw new common_1.NotFoundException('Subscription not found');
        }
    }
    async getSubscriptionStatus(req) {
        try {
            return this.subscriptionsService.getSubscriptionStatus(req);
        }
        catch (error) {
            throw new common_1.NotFoundException('Subscription not found');
        }
    }
    async getCurrent(req) {
        try {
            return this.subscriptionsService.getSubscriptionStatus(req);
        }
        catch (error) {
            throw new common_1.NotFoundException('Subscription not found');
        }
    }
    async getCurrentPlan(req) {
        try {
            return this.subscriptionsService.getCurrentPlan(req);
        }
        catch (error) {
            throw new common_1.NotFoundException('Subscription not found');
        }
    }
    async hasAccess(req) {
        const res = await this.subscriptionsService.hasActiveAccess(req);
        return { hasAccess: res.hasAccess, isWithinGrace: res.isWithinGrace, subscription: res.subscription };
    }
    async createCheckout(body, req) {
        return this.subscriptionsService.createCheckoutSession(body, req);
    }
    async getMyOrgUsage(req) {
        const organizationId = req.organization?.id;
        if (!organizationId) {
            throw new common_1.NotFoundException('Organization not found');
        }
        const plan = await this.limitsService.getOrganizationPlan(organizationId);
        const limits = this.limitsService.getLimitsForPlan(plan);
        const usage = await this.limitsService.getOrganizationUsage(organizationId);
        return { organizationId, plan, limits, usage };
    }
    async getOrgUsage(req, organizationId) {
        const plan = await this.limitsService.getOrganizationPlan(organizationId);
        const limits = this.limitsService.getLimitsForPlan(plan);
        const usage = await this.limitsService.getOrganizationUsage(organizationId);
        return { organizationId, plan, limits, usage };
    }
};
exports.SubscriptionsController = SubscriptionsController;
__decorate([
    (0, common_1.Post)('invites'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create an invite' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_invite_dto_1.CreateInviteDto, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createInvite", null);
__decorate([
    (0, common_1.Post)('pause'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Pause subscription' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "pauseSubscription", null);
__decorate([
    (0, common_1.Post)('resume'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Resume subscription' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "resumeSubscription", null);
__decorate([
    (0, common_1.Post)('cancel'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Cancel subscription' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "cancelSubscription", null);
__decorate([
    (0, common_1.Get)('status'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get subscription status per account' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getSubscriptionStatus", null);
__decorate([
    (0, common_1.Get)('current'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current organization subscription (alias of status)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getCurrent", null);
__decorate([
    (0, common_1.Get)('me'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current user plan and org subscription' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getCurrentPlan", null);
__decorate([
    (0, common_1.Get)('access'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Check if org has active access (grace period aware)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "hasAccess", null);
__decorate([
    (0, common_1.Post)('checkout'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Create checkout session for subscription' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_checkout_dto_1.CreateCheckoutDto, Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "createCheckout", null);
__decorate([
    (0, common_1.Get)('usage'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get current organization usage and limits (user scoped)' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getMyOrgUsage", null);
__decorate([
    (0, common_1.Get)('admin/usage/:organizationId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Admin - Get current usage and limits for an organization' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Param)('organizationId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], SubscriptionsController.prototype, "getOrgUsage", null);
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, common_1.Controller)('api/subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService,
        limits_service_1.LimitsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map