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
const public_decorator_1 = require("../auth/decorators/public.decorator");
const auth_guard_1 = require("../auth/guards/auth.guard");
const organization_scoped_decorator_1 = require("../common/decorators/organization-scoped.decorator");
const prisma_service_1 = require("../prisma/prisma.service");
const events_time_range_dto_1 = require("./dto/events-time-range.dto");
const device_context_util_1 = require("./utils/device-context.util");
let AnalyticsController = class AnalyticsController {
    analyticsService;
    prisma;
    constructor(analyticsService, prisma) {
        this.analyticsService = analyticsService;
        this.prisma = prisma;
    }
    clampNumber(value, min, max) {
        const n = Math.floor(Number(value));
        if (Number.isNaN(n))
            return null;
        return Math.max(min, Math.min(max, n));
    }
    async ingestEvent(body, req) {
        const { videoId, eventType, currentTime = 0, duration = 0, userId, sessionId, clientId, organizationId, context } = body || {};
        if (!videoId || !eventType) {
            throw new common_1.BadRequestException('videoId and eventType are required');
        }
        const normalizedEventType = String(eventType).toLowerCase();
        const clampedCurrent = Math.max(0, Math.floor(Number(currentTime) || 0));
        const clampedDuration = Math.max(0, Math.floor(Number(duration) || 0));
        const xff = req.headers['x-forwarded-for'] || '';
        const ip = xff.split(',')[0]?.trim().replace(/:\d+$/, '') || req.ip;
        const userAgent = req.headers['user-agent'] || undefined;
        await this.prisma.videoPlaybackEvent.create({
            data: {
                videoId,
                organizationId: organizationId || req['organization']?.id || null,
                userId: userId || req['user']?.id || null,
                sessionId: sessionId || null,
                clientId: clientId || null,
                eventType: normalizedEventType,
                currentTime: clampedCurrent,
                duration: clampedDuration,
                ip: ip || null,
                userAgent: userAgent,
            },
        });
        if (normalizedEventType === 'play' && sessionId && context) {
            try {
                const orgId = organizationId || req['organization']?.id || null;
                const ctx = (0, device_context_util_1.normalizeDeviceContext)(context);
                const ctxHash = (0, device_context_util_1.hashDeviceContext)(ctx);
                const dc = await this.prisma.deviceContext.upsert({
                    where: { hash: ctxHash },
                    update: { updatedAt: new Date() },
                    create: {
                        hash: ctxHash,
                        screenWidth: ctx.screenWidth,
                        screenHeight: ctx.screenHeight,
                        viewportWidth: ctx.viewportWidth,
                        viewportHeight: ctx.viewportHeight,
                        devicePixelRatio: ctx.devicePixelRatio,
                        orientation: ctx.orientation,
                        language: ctx.language,
                        timezone: ctx.timezone,
                        hardwareConcurrency: ctx.hardwareConcurrency,
                        deviceMemory: ctx.deviceMemory,
                    },
                });
                await this.prisma.viewerSession.upsert({
                    where: { videoId_sessionId: { videoId, sessionId } },
                    update: {
                        deviceContextId: dc.id,
                        userAgent: userAgent || null,
                        ip: ip || null,
                        updatedAt: new Date(),
                    },
                    create: {
                        videoId,
                        organizationId: orgId,
                        sessionId,
                        clientId: clientId || null,
                        userId: userId || null,
                        deviceContextId: dc.id,
                        userAgent: userAgent || null,
                        ip: ip || null,
                    },
                });
            }
            catch (e) {
                console.warn('device context upsert failed', e);
            }
        }
        return { success: true };
    }
    async getEventsSummary(videoId, bucketSizeParam, perSecondParam, range, req) {
        const video = await this.prisma.video.findUnique({ where: { id: videoId } });
        if (!video)
            throw new common_1.NotFoundException('Video not found');
        const views = await this.analyticsService.getUniqueViews(videoId, range);
        const watchTime = await this.analyticsService.getWatchTimeSeconds(videoId, range);
        const duration = video.duration || 0;
        const bucketSize = Math.max(1, Math.min(60, parseInt(bucketSizeParam || '10', 10) || 10));
        const retention = await this.analyticsService.getRetentionBuckets(videoId, duration, bucketSize, range);
        const perSecond = perSecondParam === 'true';
        const retentionPerSecond = perSecond ? await this.analyticsService.getSecondBySecondRetention(videoId, duration, range) : undefined;
        return { success: true, data: { views, watchTime, duration, retention, retentionPerSecond, bucketSize } };
    }
    async getEventsInsights(videoId, range, bucketSizeParam, topDropParam, req) {
        const video = await this.prisma.video.findUnique({ where: { id: videoId } });
        if (!video)
            throw new common_1.NotFoundException('Video not found');
        const duration = video.duration || 0;
        const bucketSize = Math.max(1, Math.min(60, parseInt(bucketSizeParam || '5', 10) || 5));
        const topDropOffs = Math.max(1, Math.min(20, parseInt(topDropParam || '5', 10) || 5));
        const insights = await this.analyticsService.getEventsInsights(videoId, duration, range, bucketSize, topDropOffs);
        return { success: true, data: insights };
    }
    async getDashboard(req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
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
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
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
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
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
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
        const organizationId = req['organization'].id;
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organization not found');
        }
        return this.analyticsService.getPopularVideos(query.limit, organizationId);
    }
    async getVideoAnalytics(videoId, range, req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
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
        const views = await this.analyticsService.getUniqueViews(videoId, range);
        const watchTime = await this.analyticsService.getWatchTimeSeconds(videoId, range);
        const duration = video.duration || 0;
        const retentionPerSecond = await this.analyticsService.getSecondBySecondRetention(videoId, duration, range);
        const retentionData = retentionPerSecond.map(p => ({ time: p.time, retention: p.pct }));
        return {
            success: true,
            data: {
                totalViews: views,
                averageWatchTime: views ? Math.round(watchTime / views) : 0,
                engagementRate: 0,
                uniqueViewers: views,
                viewsOverTime: [],
                retentionData,
                viewerTimeline: [],
            }
        };
    }
    async getVideoRetention(videoId, req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
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
        const duration = video.duration || 0;
        const sbs = await this.analyticsService.getSecondBySecondRetention(videoId, duration);
        return { retention: sbs.map(p => ({ time: p.time, retention: p.pct })) };
    }
    async getVideoViews(videoId, range, req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
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
        const totalViews = await this.analyticsService.getUniqueViews(videoId, range);
        const totalWatchTime = await this.analyticsService.getWatchTimeSeconds(videoId, range);
        const averageWatchTime = totalViews ? Math.round(totalWatchTime / totalViews) : 0;
        return { totalViews, totalWatchTime, averageWatchTime, viewerTimelines: [] };
    }
    async getViewerAnalytics(videoId, range, req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
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
        const viewerAnalytics = await this.analyticsService.getViewerAnalyticsFromEvents(videoId, range);
        return { success: true, data: viewerAnalytics };
    }
    async getOrganizationRetention(req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
        const organizationId = req['organization'].id;
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
        });
        if (!organization) {
            throw new common_1.NotFoundException('Organization not found');
        }
        const videos = await this.prisma.video.findMany({
            where: { organizationId },
            select: {
                id: true,
                name: true,
                duration: true,
                muxAssetId: true,
                analytics: {
                    select: {
                        views: true,
                        watchTime: true,
                        retention: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
        });
        const retentionData = await Promise.all(videos.map(async (video) => {
            try {
                {
                    const cachedAnalytics = video.analytics;
                    if (cachedAnalytics && cachedAnalytics.retention) {
                        const retention = typeof cachedAnalytics.retention === 'string'
                            ? JSON.parse(cachedAnalytics.retention)
                            : cachedAnalytics.retention;
                        return {
                            videoId: video.id,
                            title: video.name || 'Untitled Video',
                            retention: retention,
                            totalViews: cachedAnalytics.views || 0,
                            averageWatchTime: cachedAnalytics.watchTime || 0,
                        };
                    }
                    else {
                        const defaultRetention = this.generateDefaultRetention(video.duration || 300);
                        return {
                            videoId: video.id,
                            title: video.name || 'Untitled Video',
                            retention: defaultRetention,
                            totalViews: 0,
                            averageWatchTime: 0,
                        };
                    }
                }
            }
            catch (error) {
                console.error(`Error getting analytics for video ${video.id}:`, error);
                const defaultRetention = this.generateDefaultRetention(video.duration || 300);
                return {
                    videoId: video.id,
                    title: video.name || 'Untitled Video',
                    retention: defaultRetention,
                    totalViews: 0,
                    averageWatchTime: 0,
                };
            }
        }));
        return {
            success: true,
            data: retentionData,
        };
    }
    generateDefaultRetention(duration) {
        const retentionPoints = [];
        const maxRetention = 85;
        for (let second = 0; second <= duration; second++) {
            const progress = second / duration;
            const retention = Math.max(0, maxRetention * Math.exp(-progress * 1.2));
            retentionPoints.push({
                time: second,
                retention: Math.min(100, Math.max(0, retention)),
            });
        }
        return retentionPoints;
    }
};
exports.AnalyticsController = AnalyticsController;
__decorate([
    (0, common_1.Post)('events'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Ingest video player events (play, pause, ended, timeupdate)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Event stored' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "ingestEvent", null);
__decorate([
    (0, common_1.Get)('events/summary/:videoId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get aggregated analytics from collected events' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)('bucketSize')),
    __param(2, (0, common_1.Query)('perSecond')),
    __param(3, (0, common_1.Query)()),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, events_time_range_dto_1.EventsTimeRangeDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getEventsSummary", null);
__decorate([
    (0, common_1.Get)('events/insights/:videoId'),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get analytics insights from collected events' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Query)('bucketSize')),
    __param(3, (0, common_1.Query)('topDropOffs')),
    __param(4, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, events_time_range_dto_1.EventsTimeRangeDto, String, String, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getEventsInsights", null);
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
    __metadata("design:paramtypes", [analytics_dto_1.GetVideosLimitDto, Object]),
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
    __metadata("design:paramtypes", [analytics_dto_1.GetVideosLimitDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getPopularVideos", null);
__decorate([
    (0, common_1.Get)('videos/:videoId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get analytics for a specific video (internal only)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns video analytics data' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found or not owned by tenant' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, events_time_range_dto_1.EventsTimeRangeDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getVideoAnalytics", null);
__decorate([
    (0, common_1.Get)('retention/:videoId'),
    (0, swagger_1.ApiOperation)({ summary: 'Get retention data for a specific video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns video retention data' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found or not owned by tenant' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
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
    __metadata("design:paramtypes", [String, events_time_range_dto_1.EventsTimeRangeDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getVideoViews", null);
__decorate([
    (0, common_1.Get)('videos/:videoId/viewer-analytics'),
    (0, swagger_1.ApiOperation)({ summary: 'Get viewer analytics breakdown (internal only)' }),
    (0, swagger_1.ApiParam)({
        name: 'videoId',
        description: 'Video ID to get viewer analytics for',
        example: 'abc123',
    }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns viewer analytics breakdown including device, browser, and location data',
        type: analytics_dto_1.ViewerAnalyticsDto,
    }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, events_time_range_dto_1.EventsTimeRangeDto, Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getViewerAnalytics", null);
__decorate([
    (0, common_1.Get)('organization/retention'),
    (0, swagger_1.ApiOperation)({ summary: 'Get retention data for all videos in organization' }),
    (0, swagger_1.ApiResponse)({
        status: 200,
        description: 'Returns retention data for all videos in the organization',
    }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Organization not found' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AnalyticsController.prototype, "getOrganizationRetention", null);
exports.AnalyticsController = AnalyticsController = __decorate([
    (0, swagger_1.ApiTags)('analytics'),
    (0, common_1.Controller)('api/analytics'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, common_1.UseGuards)(auth_guard_1.AuthGuard),
    (0, swagger_1.ApiBearerAuth)(),
    __metadata("design:paramtypes", [analytics_service_1.AnalyticsService,
        prisma_service_1.PrismaService])
], AnalyticsController);
//# sourceMappingURL=analytics.controller.js.map