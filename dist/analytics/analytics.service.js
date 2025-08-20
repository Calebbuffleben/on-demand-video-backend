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
var AnalyticsService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalyticsService = void 0;
const common_1 = require("@nestjs/common");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    prisma;
    cacheManager;
    logger = new common_1.Logger(AnalyticsService_1.name);
    constructor(prisma, cacheManager) {
        this.prisma = prisma;
        this.cacheManager = cacheManager;
    }
    async getUniqueViews(videoId) {
        const bySession = await this.prisma.videoPlaybackEvent.groupBy({
            by: ['sessionId'],
            where: { videoId, eventType: { in: ['play', 'ended'] }, sessionId: { not: null } },
            _count: { _all: true },
        });
        if (bySession.length > 0) {
            return bySession.length;
        }
        const byUser = await this.prisma.videoPlaybackEvent.groupBy({
            by: ['userId'],
            where: { videoId, eventType: { in: ['play', 'ended'] }, userId: { not: null } },
            _count: { _all: true },
        });
        if (byUser.length > 0) {
            return byUser.length;
        }
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT DISTINCT (COALESCE(ip,'') || '|' || COALESCE("userAgent",'')) as k
      FROM "VideoPlaybackEvent"
      WHERE "videoId" = ${videoId} AND "eventType" IN ('play','ended')
    `);
        return rows.length;
    }
    async getWatchTimeSeconds(videoId) {
        const events = await this.prisma.videoPlaybackEvent.findMany({
            where: { videoId, eventType: { in: ['timeupdate', 'ended'] } },
            orderBy: [{ sessionId: 'asc' }, { createdAt: 'asc' }],
            select: { sessionId: true, currentTime: true, createdAt: true },
        });
        let total = 0;
        let prevSession = '';
        let prevTime = 0;
        for (const e of events) {
            const s = e.sessionId || 'anon';
            if (s !== prevSession) {
                prevSession = s;
                prevTime = e.currentTime || 0;
                continue;
            }
            const delta = (e.currentTime || 0) - prevTime;
            if (delta > 0 && delta < 60)
                total += delta;
            prevTime = e.currentTime || 0;
        }
        return Math.floor(total);
    }
    async getRetentionBuckets(videoId, duration, bucketSize = 10) {
        if (!duration || duration <= 0)
            return [];
        const bucketCount = Math.ceil(duration / bucketSize);
        const buckets = Array.from({ length: bucketCount }, (_, i) => ({ start: i * bucketSize, end: Math.min((i + 1) * bucketSize, duration), viewers: 0 }));
        const progresses = await this.getMaxProgresses(videoId);
        for (const p of progresses) {
            const reachedIndex = Math.min(Math.floor(p / bucketSize), bucketCount - 1);
            for (let i = 0; i <= reachedIndex; i++)
                buckets[i].viewers += 1;
        }
        const totalViewers = progresses.length || 1;
        return buckets.map(b => ({ ...b, pct: Math.round((b.viewers / totalViewers) * 100) }));
    }
    async getSecondBySecondRetention(videoId, duration) {
        if (!duration || duration <= 0)
            return [];
        const progresses = await this.getMaxProgresses(videoId);
        const total = progresses.length || 1;
        const result = [];
        for (let s = 0; s <= duration; s++) {
            const viewers = progresses.reduce((acc, p) => acc + (p >= s ? 1 : 0), 0);
            result.push({ time: s, pct: Math.round((viewers / total) * 100) });
        }
        return result;
    }
    async getMaxProgresses(videoId) {
        const bySession = await this.prisma.videoPlaybackEvent.groupBy({
            by: ['sessionId'],
            where: { videoId, eventType: { in: ['timeupdate', 'ended'] }, sessionId: { not: null } },
            _max: { currentTime: true },
        });
        if (bySession.length > 0)
            return bySession.map((r) => r._max?.currentTime ?? 0);
        const byUser = await this.prisma.videoPlaybackEvent.groupBy({
            by: ['userId'],
            where: { videoId, eventType: { in: ['timeupdate', 'ended'] }, userId: { not: null } },
            _max: { currentTime: true },
        });
        if (byUser.length > 0)
            return byUser.map((r) => r._max?.currentTime ?? 0);
        const rows = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT MAX("currentTime")::int as max_time
      FROM "VideoPlaybackEvent"
      WHERE "videoId" = ${videoId} AND "eventType" IN ('timeupdate','ended')
      GROUP BY (COALESCE(ip,'') || '|' || COALESCE("userAgent",''))
    `);
        return rows.map(r => r.max_time || 0);
    }
    formatFileSize(bytes) {
        if (bytes === 0)
            return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    formatDuration(seconds) {
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.floor(seconds % 60);
        return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
    }
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
        });
    }
    async getPlatformStats(organizationId) {
        const cacheKey = `platform_stats_${organizationId || 'default'}`;
        const cachedStats = await this.cacheManager.get(cacheKey);
        if (cachedStats) {
            return cachedStats;
        }
        try {
            const videos = await this.prisma.video.findMany({
                where: organizationId ? { organizationId } : undefined,
                select: { id: true },
            });
            const viewsByVideo = await this.getUniqueViewsByVideoMap(organizationId);
            const totalVideos = videos.length;
            const totalViews = videos.reduce((sum, v) => sum + (viewsByVideo[v.id] || 0), 0);
            const totalStorage = '0 GB';
            const totalBandwidth = '0 GB';
            const stats = {
                totalVideos,
                totalViews,
                totalStorage,
                totalBandwidth,
            };
            await this.cacheManager.set(cacheKey, stats, 60 * 5);
            return stats;
        }
        catch (error) {
            this.logger.error('Error getting platform stats', error);
            return {
                totalVideos: 0,
                totalViews: 0,
                totalStorage: '0 GB',
                totalBandwidth: '0 GB',
            };
        }
    }
    async getRecentUploads(limit = 5, organizationId) {
        const cacheKey = `recent_uploads_${limit}_${organizationId || 'default'}`;
        const cachedUploads = await this.cacheManager.get(cacheKey);
        if (cachedUploads) {
            return cachedUploads;
        }
        try {
            const videos = await this.prisma.video.findMany({
                where: organizationId ? { organizationId } : undefined,
                include: {
                    analytics: true,
                },
                orderBy: { createdAt: 'desc' },
                take: limit,
            });
            const recentUploads = videos.map(video => ({
                id: video.id,
                title: video.name || 'Untitled Video',
                thumbnailUrl: video.thumbnailUrl || '',
                uploadDate: this.formatDate(video.createdAt.toISOString()),
                size: this.formatFileSize(video.analytics?.watchTime || 0),
                duration: this.formatDuration(video.duration || 0),
            }));
            await this.cacheManager.set(cacheKey, recentUploads, 60 * 5);
            return recentUploads;
        }
        catch (error) {
            this.logger.error('Error getting recent uploads', error);
            return [];
        }
    }
    async getPopularVideos(limit = 5, organizationId) {
        const cacheKey = `popular_videos_${limit}_${organizationId || 'default'}`;
        const cachedVideos = await this.cacheManager.get(cacheKey);
        if (cachedVideos) {
            return cachedVideos;
        }
        try {
            const videos = await this.prisma.video.findMany({
                where: organizationId ? { organizationId } : undefined,
                select: {
                    id: true,
                    name: true,
                    thumbnailUrl: true,
                    duration: true,
                },
            });
            const viewsByVideo = await this.getUniqueViewsByVideoMap(organizationId);
            const popularVideos = videos
                .map(video => ({
                id: video.id,
                title: video.name || 'Untitled Video',
                thumbnailUrl: video.thumbnailUrl || '',
                views: viewsByVideo[video.id] || 0,
                duration: this.formatDuration(video.duration || 0),
            }))
                .sort((a, b) => b.views - a.views)
                .slice(0, limit);
            await this.cacheManager.set(cacheKey, popularVideos, 60 * 5);
            return popularVideos;
        }
        catch (error) {
            this.logger.error('Error getting popular videos', error);
            return [];
        }
    }
    async getDashboardData(organizationId) {
        const cacheKey = `dashboard_data_${organizationId || 'default'}`;
        const cachedData = await this.cacheManager.get(cacheKey);
        if (cachedData) {
            return cachedData;
        }
        try {
            const [platformStats, recentUploads, popularVideos] = await Promise.all([
                this.getPlatformStats(organizationId),
                this.getRecentUploads(5, organizationId),
                this.getPopularVideos(3, organizationId)
            ]);
            const dashboardData = {
                platformStats,
                recentUploads,
                popularVideos
            };
            await this.cacheManager.set(cacheKey, dashboardData, 60 * 5);
            return dashboardData;
        }
        catch (error) {
            this.logger.error('Error getting dashboard data', error);
            return {
                platformStats: {
                    totalVideos: 0,
                    totalViews: 0,
                    totalStorage: '0 GB',
                    totalBandwidth: '0 GB',
                },
                recentUploads: [],
                popularVideos: []
            };
        }
    }
    async getUniqueViewsByVideoMap(organizationId) {
        const bySession = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT "videoId", COUNT(DISTINCT "sessionId")::int AS views
      FROM "VideoPlaybackEvent"
      WHERE ${organizationId ? client_1.Prisma.sql `"organizationId" = ${organizationId} AND` : client_1.Prisma.sql ``}
            "eventType" IN ('play','ended') AND "sessionId" IS NOT NULL
      GROUP BY "videoId"
    `);
        const map = {};
        for (const row of bySession)
            map[row.videoId] = row.views || 0;
        if (bySession.length > 0)
            return map;
        const byUser = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT "videoId", COUNT(DISTINCT "userId")::int AS views
      FROM "VideoPlaybackEvent"
      WHERE ${organizationId ? client_1.Prisma.sql `"organizationId" = ${organizationId} AND` : client_1.Prisma.sql ``}
            "eventType" IN ('play','ended') AND "userId" IS NOT NULL
      GROUP BY "videoId"
    `);
        for (const row of byUser)
            map[row.videoId] = row.views || 0;
        if (byUser.length > 0)
            return map;
        const byIpUa = await this.prisma.$queryRaw(client_1.Prisma.sql `
      SELECT "videoId", COUNT(DISTINCT (COALESCE(ip,'') || '|' || COALESCE("userAgent",'')))::int AS views
      FROM "VideoPlaybackEvent"
      WHERE ${organizationId ? client_1.Prisma.sql `"organizationId" = ${organizationId} AND` : client_1.Prisma.sql ``}
            "eventType" IN ('play','ended')
      GROUP BY "videoId"
    `);
        for (const row of byIpUa)
            map[row.videoId] = row.views || 0;
        return map;
    }
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService, Object])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map