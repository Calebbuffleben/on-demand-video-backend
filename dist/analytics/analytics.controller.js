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
const mux_analytics_service_1 = require("./services/mux-analytics.service");
const mux_analytics_dto_1 = require("./dto/mux-analytics.dto");
const prisma_service_1 = require("../prisma/prisma.service");
let AnalyticsController = class AnalyticsController {
    analyticsService;
    muxAnalyticsService;
    prisma;
    constructor(analyticsService, muxAnalyticsService, prisma) {
        this.analyticsService = analyticsService;
        this.muxAnalyticsService = muxAnalyticsService;
        this.prisma = prisma;
    }
    async getDashboard(req) {
        const organizationId = req['organization'].id;
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organization not found');
        }
        return this.analyticsService.getDashboardData(organizationId);
    }
    async getPlatformStats(req) {
        const organizationId = req['organization'].id;
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organization not found');
        }
        return this.analyticsService.getPlatformStats(organizationId);
    }
    async getRecentUploads(query, req) {
        const organizationId = req['organization'].id;
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organization not found');
        }
        return this.analyticsService.getRecentUploads(query.limit, organizationId);
    }
    async getPopularVideos(query, req) {
        const organizationId = req['organization'].id;
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organization not found');
        }
        return this.analyticsService.getPopularVideos(query.limit, organizationId);
    }
    async getVideoAnalytics(videoId, query, req) {
        const organizationId = req['organization'].id;
        const video = await this.prisma.video.findFirst({
            where: {
                id: videoId,
                organizationId,
            },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found or not owned by tenant');
        }
        return this.muxAnalyticsService.getVideoAnalytics(videoId, organizationId, query);
    }
    async getVideoRetention(videoId, query, req) {
        const organizationId = req['organization'].id;
        const video = await this.prisma.video.findFirst({
            where: {
                id: videoId,
                organizationId,
            },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found or not owned by tenant');
        }
        const analytics = await this.muxAnalyticsService.getVideoAnalytics(videoId, organizationId, query);
        return {
            retention: analytics.data.retentionData,
        };
    }
    async getVideoViews(videoId, query, req) {
        const organizationId = req['organization'].id;
        const video = await this.prisma.video.findFirst({
            where: {
                id: videoId,
                organizationId,
            },
        });
        if (!video) {
            throw new common_1.NotFoundException('Video not found or not owned by tenant');
        }
        const analytics = await this.muxAnalyticsService.getVideoAnalytics(videoId, organizationId, query);
        return {
            totalViews: analytics.data.totalViews,
            totalWatchTime: analytics.data.averageWatchTime * analytics.data.totalViews,
            averageWatchTime: analytics.data.averageWatchTime,
            viewerTimelines: analytics.data.viewerTimeline,
        };
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
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Organization not found' }),
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
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Organization not found' }),
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
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Organization not found' }),
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
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Organization not found' }),
    __param(0, (0, common_1.Query)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [analytics_dto_1.QueryLimitDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPopularVideos", null);
__decorate([
    (0, common_1.Get)('videos/:videoId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get analytics for a specific video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns video analytics data', type: mux_analytics_dto_1.MuxAnalyticsResponseDto }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found or not owned by tenant' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, mux_analytics_dto_1.GetMuxAnalyticsDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getVideoAnalytics", null);
__decorate([
    (0, common_1.Get)('retention/:videoId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get retention data for a specific video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns video retention data' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found or not owned by tenant' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, mux_analytics_dto_1.GetMuxAnalyticsDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getVideoRetention", null);
__decorate([
    (0, common_1.Get)('views/:videoId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get views data for a specific video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns video views data' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found or not owned by tenant' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, mux_analytics_dto_1.GetMuxAnalyticsDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getVideoViews", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, common_1.Controller)('api/analytics'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('clerk')),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        mux_analytics_service_1.MuxAnalyticsService,
        prisma_service_1.PrismaService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map