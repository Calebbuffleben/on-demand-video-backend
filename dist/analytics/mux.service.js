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
var MuxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MuxService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const mux_node_1 = require("@mux/mux-node");
const prisma_service_1 = require("../prisma/prisma.service");
let MuxService = MuxService_1 = class MuxService {
    configService;
    prisma;
    logger = new common_1.Logger(MuxService_1.name);
    muxClient;
    constructor(configService, prisma) {
        this.configService = configService;
        this.prisma = prisma;
        const tokenId = this.configService.get('MUX_TOKEN_ID');
        const tokenSecret = this.configService.get('MUX_TOKEN_SECRET');
        if (!tokenId || !tokenSecret) {
            this.logger.warn('Global MUX credentials not configured');
        }
        this.muxClient = new mux_node_1.default({
            tokenId,
            tokenSecret,
        });
    }
    async getMuxClientForOrganization(organizationId) {
        if (!organizationId) {
            return this.muxClient;
        }
        try {
            const organization = await this.prisma.organization.findUnique({
                where: { id: organizationId },
            });
            if (!organization?.muxTokenId || !organization?.muxTokenSecret) {
                this.logger.warn(`Mux credentials not found for organization ${organizationId}, using global credentials`);
                return this.muxClient;
            }
            return new mux_node_1.default({
                tokenId: organization.muxTokenId,
                tokenSecret: organization.muxTokenSecret,
            });
        }
        catch (error) {
            this.logger.error(`Error getting Mux client for organization ${organizationId}: ${error.message}`);
            return this.muxClient;
        }
    }
    async getVideos(organizationId) {
        try {
            const client = await this.getMuxClientForOrganization(organizationId);
            const { data: assets } = await client.video.assets.list({
                limit: 100,
            });
            return assets.map(asset => ({
                uid: asset.id,
                thumbnail: asset.thumbnails?.[0]?.url || '',
                status: {
                    state: asset.status,
                },
                meta: {
                    name: asset.title || 'Untitled',
                },
                created: asset.created_at,
                modified: asset.created_at,
                size: asset.size || 0,
                preview: asset.thumbnails?.[0]?.url || '',
                playback: {
                    hls: asset.playback_ids?.[0]?.id ? `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8` : null,
                    dash: asset.playback_ids?.[0]?.id ? `https://stream.mux.com/${asset.playback_ids[0].id}.mpd` : null,
                },
                duration: asset.duration || 0,
                input: {
                    width: asset.aspect_ratio ? Math.round(Number(asset.aspect_ratio) * 100) : null,
                    height: 100,
                },
                readyToStream: asset.status === 'ready',
                views: asset.views || 0,
            }));
        }
        catch (error) {
            this.logger.error('Error fetching videos from MUX', error);
            throw error;
        }
    }
    async getAnalytics(organizationId) {
        try {
            const client = await this.getMuxClientForOrganization(organizationId);
            const endTime = new Date();
            const startTime = new Date();
            startTime.setDate(startTime.getDate() - 30);
            const startTimeEpoch = Math.floor(startTime.getTime() / 1000);
            const endTimeEpoch = Math.floor(endTime.getTime() / 1000);
            const viewsResponse = await client.data.videoViews.list({
                query: {
                    timeframe: [startTimeEpoch, endTimeEpoch],
                    filters: [],
                }
            });
            const { data: assets } = await client.video.assets.list({
                limit: 100,
            });
            const assetsWithViews = assets;
            const totalViews = viewsResponse.data.reduce((sum, view) => sum + (view.watch_time || 0), 0);
            const totalStorage = assetsWithViews.reduce((sum, asset) => sum + (asset.size || 0), 0);
            const viewsPerVideo = viewsResponse.data.map(view => ({
                videoId: view.id,
                views: view.watch_time || 0
            }));
            return {
                success: true,
                result: {
                    totals: {
                        totalVideoViews: totalViews,
                        storage: totalStorage,
                        viewsPerVideo,
                        timeframe: {
                            start: startTime.toISOString(),
                            end: endTime.toISOString()
                        }
                    },
                },
            };
        }
        catch (error) {
            this.logger.error('Error fetching analytics from MUX', error);
            throw error;
        }
    }
    async getVideoAnalytics(videoId, organizationId) {
        try {
            const client = await this.getMuxClientForOrganization(organizationId);
            const endTime = new Date();
            const startTime = new Date();
            startTime.setDate(startTime.getDate() - 30);
            const startTimeEpoch = Math.floor(startTime.getTime() / 1000);
            const endTimeEpoch = Math.floor(endTime.getTime() / 1000);
            const viewsResponse = await client.data.videoViews.list({
                query: {
                    timeframe: [startTimeEpoch, endTimeEpoch],
                    filters: [`asset_id:${videoId}`],
                }
            });
            const { data: assets } = await client.video.assets.list({
                query: {
                    asset_id: videoId
                }
            });
            const videoDuration = assets[0]?.duration || 0;
            const totalViews = viewsResponse.data.length;
            const totalWatchTime = viewsResponse.data.reduce((sum, view) => sum + (view.watch_time || 0), 0);
            const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;
            const uniqueViewers = new Set(viewsResponse.data.map(view => view.id)).size;
            const engagementRate = videoDuration > 0 ? (averageWatchTime / videoDuration) * 100 : 0;
            return {
                success: true,
                data: {
                    totalViews,
                    averageWatchTime,
                    engagementRate,
                    uniqueViewers,
                    viewsOverTime: this.calculateViewsOverTime(viewsResponse.data),
                    retentionData: this.calculateRetentionData(viewsResponse.data, videoDuration),
                    viewerTimeline: this.calculateViewerTimeline(viewsResponse.data)
                }
            };
        }
        catch (error) {
            this.logger.error(`Error fetching analytics for video ${videoId}:`, error);
            throw error;
        }
    }
    calculateViewsOverTime(views) {
        const viewsMap = new Map();
        views.forEach(view => {
            const timestamp = new Date(view.created_at || Date.now()).toISOString();
            viewsMap.set(timestamp, (viewsMap.get(timestamp) || 0) + 1);
        });
        return Array.from(viewsMap.entries())
            .map(([timestamp, views]) => ({
            timestamp,
            views
        }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
    calculateRetentionData(views, videoDuration) {
        const retentionMap = new Map();
        const totalViews = views.length;
        views.forEach(view => {
            const percentage = Math.floor((view.watch_time / videoDuration) * 100);
            retentionMap.set(percentage, (retentionMap.get(percentage) || 0) + 1);
        });
        return Array.from(retentionMap.entries())
            .map(([time, count]) => ({
            time,
            retention: (count / totalViews) * 100
        }))
            .sort((a, b) => a.time - b.time);
    }
    calculateViewerTimeline(views) {
        const timelineMap = new Map();
        views.forEach(view => {
            const timestamp = new Date(view.created_at || Date.now()).toISOString();
            timelineMap.set(timestamp, (timelineMap.get(timestamp) || 0) + 1);
        });
        return Array.from(timelineMap.entries())
            .map(([timestamp, activeViewers]) => ({
            timestamp,
            activeViewers
        }))
            .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
    }
};
exports.MuxService = MuxService;
exports.MuxService = MuxService = MuxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MuxService);
//# sourceMappingURL=mux.service.js.map