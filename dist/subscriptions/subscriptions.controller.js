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
const swagger_1 = require("@nestjs/swagger");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_scoped_decorator_1 = require("../common/decorators/organization-scoped.decorator");
const create_invite_dto_1 = require("./dto/create-invite.dto");
let SubscriptionsController = class SubscriptionsController {
    subscriptionsService;
    constructor(subscriptionsService) {
        this.subscriptionsService = subscriptionsService;
    }
    async createInvite(createInviteDto, req) {
        return this.subscriptionsService.createInvite(createInviteDto, req);
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
exports.SubscriptionsController = SubscriptionsController = __decorate([
    (0, swagger_1.ApiTags)('subscriptions'),
    (0, common_1.Controller)('api/subscriptions'),
    __metadata("design:paramtypes", [subscriptions_service_1.SubscriptionsService])
], SubscriptionsController);
//# sourceMappingURL=subscriptions.controller.js.map