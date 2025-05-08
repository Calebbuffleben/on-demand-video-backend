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
let MuxService = MuxService_1 = class MuxService {
    configService;
    logger = new common_1.Logger(MuxService_1.name);
    muxClient;
    constructor(configService) {
        this.configService = configService;
        const tokenId = this.configService.get('MUX_TOKEN_ID');
        const tokenSecret = this.configService.get('MUX_TOKEN_SECRET');
        if (!tokenId || !tokenSecret) {
            throw new Error('MUX credentials not configured');
        }
        this.muxClient = new mux_node_1.default({
            tokenId,
            tokenSecret,
        });
    }
    async getVideos(organizationId) {
        try {
            const { data: assets } = await this.muxClient.video.assets.list({
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
            }));
        }
        catch (error) {
            this.logger.error('Error fetching videos from MUX', error);
            throw error;
        }
    }
    async getAnalytics(organizationId) {
        try {
            const { data: metrics } = await this.muxClient.video.assets.list({
                limit: 100,
            });
            const totals = {
                totalVideoViews: metrics.length,
                storage: metrics.reduce((sum, asset) => sum + (asset.size || 0), 0),
                bandwidth: 0,
            };
            return {
                success: true,
                result: {
                    totals,
                },
            };
        }
        catch (error) {
            this.logger.error('Error fetching analytics from MUX', error);
            throw error;
        }
    }
};
exports.MuxService = MuxService;
exports.MuxService = MuxService = MuxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], MuxService);
//# sourceMappingURL=mux.service.js.map