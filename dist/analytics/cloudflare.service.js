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
var CloudflareService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.CloudflareService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../prisma/prisma.service");
const cache_manager_1 = require("@nestjs/cache-manager");
const common_2 = require("@nestjs/common");
let CloudflareService = CloudflareService_1 = class CloudflareService {
    configService;
    prismaService;
    cacheManager;
    logger = new common_1.Logger(CloudflareService_1.name);
    defaultCloudflareAccountId;
    defaultCloudflareApiToken;
    constructor(configService, prismaService, cacheManager) {
        this.configService = configService;
        this.prismaService = prismaService;
        this.cacheManager = cacheManager;
        this.defaultCloudflareAccountId = this.configService.get('CLOUDFLARE_ACCOUNT_ID', '');
        this.defaultCloudflareApiToken = this.configService.get('CLOUDFLARE_API_TOKEN', '');
    }
    async getCloudflareCredentials(organizationId) {
        if (!organizationId) {
            if (!this.defaultCloudflareAccountId || !this.defaultCloudflareApiToken) {
                throw new common_1.BadRequestException('Default Cloudflare credentials are not configured');
            }
            return {
                accountId: this.defaultCloudflareAccountId,
                apiToken: this.defaultCloudflareApiToken,
                baseUrl: `https://api.cloudflare.com/client/v4/accounts/${this.defaultCloudflareAccountId}/stream`,
            };
        }
        const organization = await this.prismaService.organization.findUnique({
            where: { id: organizationId },
            select: {
                cloudflareAccountId: true,
                cloudflareApiToken: true,
            },
        });
        const accountId = organization?.cloudflareAccountId || this.defaultCloudflareAccountId;
        const apiToken = organization?.cloudflareApiToken || this.defaultCloudflareApiToken;
        if (!accountId || !apiToken) {
            throw new common_1.BadRequestException('Cloudflare credentials are not configured');
        }
        const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
        return { baseUrl, apiToken, accountId };
    }
    async getVideos(organizationId) {
        const cacheKey = `cloudflare_videos_${organizationId || 'default'}`;
        const cachedVideos = await this.cacheManager.get(cacheKey);
        if (cachedVideos) {
            return cachedVideos;
        }
        const { baseUrl, apiToken } = await this.getCloudflareCredentials(organizationId);
        try {
            const response = await fetch(`${baseUrl}/videos?include_counts=true&limit=1000`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (!data.success) {
                this.logger.error('Error fetching videos from Cloudflare', data);
                throw new common_1.BadRequestException(`Failed to fetch videos from Cloudflare: ${data.result || 'Unknown error'}`);
            }
            await this.cacheManager.set(cacheKey, data.result, 60 * 5);
            return data.result;
        }
        catch (error) {
            this.logger.error('Error fetching videos from Cloudflare', error);
            throw new common_1.BadRequestException(`Failed to fetch videos from Cloudflare: ${error.message}`);
        }
    }
    async getAnalytics(organizationId) {
        const cacheKey = `cloudflare_analytics_${organizationId || 'default'}`;
        const cachedAnalytics = await this.cacheManager.get(cacheKey);
        if (cachedAnalytics) {
            return cachedAnalytics;
        }
        const { accountId, apiToken } = await this.getCloudflareCredentials(organizationId);
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 30);
        const from = startDate.toISOString().split('T')[0];
        const to = endDate.toISOString().split('T')[0];
        try {
            const analyticsUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/analytics/views?metrics=bandwidth,storage,viewer_minutes,video_views&since=${from}&until=${to}`;
            const response = await fetch(analyticsUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (!data.success) {
                this.logger.error('Error fetching analytics from Cloudflare', data);
                throw new common_1.BadRequestException(`Failed to fetch analytics from Cloudflare: ${data.result || 'Unknown error'}`);
            }
            await this.cacheManager.set(cacheKey, data, 60 * 5);
            return data;
        }
        catch (error) {
            this.logger.error('Error fetching analytics from Cloudflare', error);
            throw new common_1.BadRequestException(`Failed to fetch analytics from Cloudflare: ${error.message}`);
        }
    }
    async getVideo(videoId, organizationId) {
        const cacheKey = `cloudflare_video_${videoId}_${organizationId || 'default'}`;
        const cachedVideo = await this.cacheManager.get(cacheKey);
        if (cachedVideo) {
            return cachedVideo;
        }
        const { baseUrl, apiToken } = await this.getCloudflareCredentials(organizationId);
        try {
            const response = await fetch(`${baseUrl}/videos/${videoId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (!data.success) {
                this.logger.error(`Error fetching video ${videoId} from Cloudflare`, data);
                throw new common_1.BadRequestException(`Failed to fetch video from Cloudflare: ${data.errors?.[0]?.message || 'Unknown error'}`);
            }
            await this.cacheManager.set(cacheKey, data.result, 60 * 5);
            return data.result;
        }
        catch (error) {
            this.logger.error(`Error fetching video ${videoId} from Cloudflare`, error);
            throw new common_1.BadRequestException(`Failed to fetch video from Cloudflare: ${error.message}`);
        }
    }
};
exports.CloudflareService = CloudflareService;
exports.CloudflareService = CloudflareService = CloudflareService_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(2, (0, common_2.Inject)(cache_manager_1.CACHE_MANAGER)),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService, Object])
], CloudflareService);
//# sourceMappingURL=cloudflare.service.js.map