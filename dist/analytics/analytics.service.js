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
const cloudflare_service_1 = require("./cloudflare.service");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
let AnalyticsService = AnalyticsService_1 = class AnalyticsService {
    cloudflareService;
    cacheManager;
    logger = new common_1.Logger(AnalyticsService_1.name);
    constructor(cloudflareService, cacheManager) {
        this.cloudflareService = cloudflareService;
        this.cacheManager = cacheManager;
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
            const videos = await this.cloudflareService.getVideos(organizationId);
            const analytics = await this.cloudflareService.getAnalytics(organizationId);
            const totalVideos = videos.length;
            const totalViews = analytics.result.totals.totalVideoViews || 0;
            const totalStorage = this.formatFileSize(analytics.result.totals.storage || 0);
            const totalBandwidth = this.formatFileSize(analytics.result.totals.bandwidth || 0);
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
            const videos = await this.cloudflareService.getVideos(organizationId);
            const recentUploads = videos
                .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
                .slice(0, limit)
                .map(video => ({
                id: video.uid,
                title: video.meta?.name || 'Untitled Video',
                thumbnailUrl: video.thumbnail || '',
                uploadDate: this.formatDate(video.created),
                size: this.formatFileSize(video.size || 0),
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
            const videos = await this.cloudflareService.getVideos(organizationId);
            const popularVideos = videos
                .map(video => ({
                id: video.uid,
                title: video.meta?.name || 'Untitled Video',
                thumbnailUrl: video.thumbnail || '',
                views: Math.floor(Math.random() * 10000),
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
};
exports.AnalyticsService = AnalyticsService;
exports.AnalyticsService = AnalyticsService = AnalyticsService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(1, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [cloudflare_service_1.CloudflareService, Object])
], AnalyticsService);
//# sourceMappingURL=analytics.service.js.map