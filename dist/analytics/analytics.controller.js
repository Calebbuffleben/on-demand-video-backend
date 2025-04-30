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
exports.AnalyticsController = void 0;
const common_1 = require("@nestjs/common");
const analytics_service_1 = require("./analytics.service");
const analytics_dto_1 = require("./dto/analytics.dto");
const swagger_1 = require("@nestjs/swagger");
const passport_1 = require("@nestjs/passport");
let AnalyticsController = class AnalyticsController {
    analyticsService;
    constructor(analyticsService) {
        this.analyticsService = analyticsService;
    }
    async getDashboard(req) {
        const organizationId = req.user?.organizationId;
        return this.analyticsService.getDashboardData(organizationId);
    }
    async getPlatformStats(req) {
        const organizationId = req.user?.organizationId;
        return this.analyticsService.getPlatformStats(organizationId);
    }
    async getRecentUploads(query, req) {
        const organizationId = req.user?.organizationId;
        return this.analyticsService.getRecentUploads(query.limit, organizationId);
    }
    async getPopularVideos(query, req) {
        const organizationId = req.user?.organizationId;
        return this.analyticsService.getPopularVideos(query.limit, organizationId);
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Get)('dashboard'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all dashboard analytics data' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns all dashboard statistics including platform stats, recent uploads, and popular videos',
        type: analytics_dto_1.DashboardResponseDto,
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getDashboard", null);
__decorate([
    (0, common_1.Get)('platform-stats'),
    (0, swagger_1.ApiOperation)({ summary: 'Get platform statistics' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns platform statistics including total videos, views, storage and bandwidth',
        type: analytics_dto_1.PlatformStatsDto,
    }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPlatformStats", null);
__decorate([
    (0, common_1.Get)('recent-uploads'),
    (0, swagger_1.ApiOperation)({ summary: 'Get most recently uploaded videos' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns a list of recently uploaded videos',
        type: [analytics_dto_1.RecentUploadDto],
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_dto_1.QueryLimitDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getRecentUploads", null);
__decorate([
    (0, common_1.Get)('popular-videos'),
    (0, swagger_1.ApiOperation)({ summary: 'Get most viewed videos' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns a list of videos sorted by view count',
        type: [analytics_dto_1.PopularVideoDto],
    }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_dto_1.QueryLimitDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPopularVideos", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, common_1.Controller)('api/analytics'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('clerk')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map