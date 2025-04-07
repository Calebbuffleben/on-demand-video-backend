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
var ClerkWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkWebhookController = void 0;
const common_1 = require("@nestjs/common");
const public_decorator_1 = require("../decorators/public.decorator");
const config_1 = require("@nestjs/config");
const clerk_service_1 = require("../services/clerk.service");
const svix_1 = require("svix");
const swagger_1 = require("@nestjs/swagger");
let ClerkWebhookController = ClerkWebhookController_1 = class ClerkWebhookController {
    configService;
    clerkService;
    logger = new common_1.Logger(ClerkWebhookController_1.name);
    constructor(configService, clerkService) {
        this.configService = configService;
        this.clerkService = clerkService;
    }
    async handleWebhook(body, headers) {
        this.logger.log(`Received Clerk webhook: ${body.type}`);
        try {
            const webhookSecret = this.configService.get('CLERK_WEBHOOK_SECRET');
            if (!webhookSecret) {
                throw new common_1.BadRequestException('Webhook secret not configured');
            }
            const svixHeaders = {
                'svix-id': headers['svix-id'],
                'svix-timestamp': headers['svix-timestamp'],
                'svix-signature': headers['svix-signature'],
            };
            if (!svixHeaders['svix-id'] || !svixHeaders['svix-timestamp'] || !svixHeaders['svix-signature']) {
                throw new common_1.UnauthorizedException('Missing svix headers');
            }
            const wh = new svix_1.Webhook(webhookSecret);
            let event;
            try {
                event = wh.verify(JSON.stringify(body), svixHeaders);
            }
            catch (error) {
                this.logger.error(`Webhook verification failed: ${error.message}`);
                throw new common_1.UnauthorizedException('Invalid webhook signature');
            }
            switch (event.type) {
                case 'user.created':
                    await this.clerkService.syncUser(event.data);
                    break;
                case 'user.updated':
                    await this.clerkService.syncUser(event.data);
                    break;
                case 'user.deleted':
                    await this.clerkService.handleUserDeleted(event.data);
                    break;
                case 'organization.created':
                    await this.clerkService.syncOrganization(event.data);
                    break;
                case 'organization.updated':
                    await this.clerkService.syncOrganization(event.data);
                    break;
                case 'organization.deleted':
                    await this.clerkService.handleOrganizationDeleted(event.data);
                    break;
                case 'organizationMembership.created':
                    await this.clerkService.syncOrganizationMembership(event.data);
                    break;
                case 'organizationMembership.updated':
                    await this.clerkService.syncOrganizationMembership(event.data);
                    break;
                case 'organizationMembership.deleted':
                    await this.clerkService.handleOrganizationMembershipDeleted(event.data);
                    break;
                default:
                    this.logger.warn(`Unhandled webhook event type: ${event.type}`);
            }
            return { success: true, message: `Processed event: ${event.type}` };
        }
        catch (error) {
            this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.ClerkWebhookController = ClerkWebhookController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('clerk'),
    (0, swagger_1.ApiOperation)({ summary: 'Process Clerk webhook events' }),
    (0, swagger_1.ApiBody)({ description: 'Clerk webhook event payload' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], ClerkWebhookController.prototype, "handleWebhook", null);
exports.ClerkWebhookController = ClerkWebhookController = ClerkWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('webhooks'),
    (0, common_1.Controller)('webhooks'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        clerk_service_1.ClerkService])
], ClerkWebhookController);
//# sourceMappingURL=clerk-webhook.controller.js.map