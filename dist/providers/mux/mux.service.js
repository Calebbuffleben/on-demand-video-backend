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
const prisma_service_1 = require("../../prisma/prisma.service");
const mux_node_1 = require("@mux/mux-node");
const client_1 = require("@prisma/client");
const crypto = require("crypto");
let MuxService = MuxService_1 = class MuxService {
    configService;
    prismaService;
    logger = new common_1.Logger(MuxService_1.name);
    defaultMuxTokenId;
    defaultMuxTokenSecret;
    muxClient;
    webhookSecret;
    constructor(configService, prismaService) {
        this.configService = configService;
        this.prismaService = prismaService;
        this.defaultMuxTokenId = this.configService.get('MUX_TOKEN_ID', '');
        this.defaultMuxTokenSecret = this.configService.get('MUX_TOKEN_SECRET', '');
        this.webhookSecret = this.configService.get('MUX_WEBHOOK_SECRET', '');
        this.muxClient = new mux_node_1.default({
            tokenId: this.defaultMuxTokenId,
            tokenSecret: this.defaultMuxTokenSecret,
            webhookSecret: this.webhookSecret,
        });
    }
    async verifyWebhookSignature(payload, signature) {
        if (!this.webhookSecret) {
            this.logger.warn('MUX webhook secret is not configured, skipping signature verification');
            return true;
        }
        if (!signature) {
            this.logger.error('No MUX signature provided');
            return false;
        }
        try {
            const [version, timestamp, signatureHash] = signature.split(',');
            if (!version || !timestamp || !signatureHash) {
                this.logger.error('Invalid MUX signature format');
                return false;
            }
            const timestampValue = parseInt(timestamp.split('=')[1], 10);
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (currentTimestamp - timestampValue > 300) {
                this.logger.error('MUX webhook timestamp is too old');
                return false;
            }
            const signatureData = `${timestamp},${JSON.stringify(payload)}`;
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(signatureData)
                .digest('hex');
            const providedSignature = signatureHash.split('=')[1];
            return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
        }
        catch (error) {
            this.logger.error('Error verifying MUX webhook signature:', error);
            return false;
        }
    }
    async getMuxCredentials(organizationId) {
        const organization = await this.prismaService.organization.findUnique({
            where: { id: organizationId },
        });
        const tokenId = organization?.muxTokenId || this.defaultMuxTokenId;
        const tokenSecret = organization?.muxTokenSecret || this.defaultMuxTokenSecret;
        if (!tokenId || !tokenSecret) {
            throw new common_1.BadRequestException('MUX credentials are not configured');
        }
        return { tokenId, tokenSecret };
    }
    async testMuxConnection(organizationId) {
        try {
            let muxClient;
            if (organizationId) {
                const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
                muxClient = new mux_node_1.default({
                    tokenId,
                    tokenSecret,
                });
            }
            else {
                if (!this.defaultMuxTokenId || !this.defaultMuxTokenSecret) {
                    throw new common_1.BadRequestException('Default MUX credentials are not configured');
                }
                muxClient = this.muxClient;
            }
            const response = await muxClient.video.assets.list({ limit: 1 });
            return {
                success: true,
                status: 200,
                message: 'Successfully connected to MUX API',
                data: {
                    result: response.data,
                },
            };
        }
        catch (error) {
            this.logger.error('Error connecting to MUX:', error);
            throw new common_1.BadRequestException(`Failed to connect to MUX: ${error.message}`);
        }
    }
    async createDirectUploadUrl(name, description, visibility, tags, organizationId) {
        try {
            const organization = await this.prismaService.organization.findUnique({
                where: { id: organizationId },
            });
            if (!organization) {
                throw new common_1.BadRequestException(`Organization with ID ${organizationId} not found`);
            }
            const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
            const muxClient = new mux_node_1.default({
                tokenId,
                tokenSecret,
            });
            const upload = await muxClient.video.uploads.create({
                cors_origin: 'https://*',
                new_asset_settings: {
                    playback_policy: visibility === client_1.Visibility.PRIVATE ? ['signed'] : ['public'],
                    passthrough: JSON.stringify({
                        name,
                        description,
                        tags,
                        organizationId,
                    })
                }
            });
            const video = await this.prismaService.video.create({
                data: {
                    name,
                    description,
                    muxUploadId: upload.id,
                    tags: tags || [],
                    visibility: visibility || client_1.Visibility.PUBLIC,
                    status: client_1.VideoStatus.PROCESSING,
                    organizationId,
                    thumbnailUrl: null,
                    playbackUrl: null,
                },
            });
            return {
                uploadUrl: upload.url,
                videoId: upload.id,
            };
        }
        catch (error) {
            this.logger.error('Error creating direct upload URL:', error);
            throw new common_1.BadRequestException('Failed to create upload URL');
        }
    }
    async checkUploadStatus(videoId, organizationId) {
        try {
            const video = await this.prismaService.video.findUnique({
                where: { id: videoId },
            });
            if (!video) {
                throw new common_1.BadRequestException(`Video with ID ${videoId} not found`);
            }
            if (video.organizationId !== organizationId) {
                throw new common_1.BadRequestException('You do not have access to this video');
            }
            const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
            const muxClient = new mux_node_1.default({
                tokenId,
                tokenSecret,
            });
            if (video.muxUploadId) {
                const upload = await muxClient.video.uploads.retrieve(video.muxUploadId);
                if (upload.asset_id) {
                    const asset = await muxClient.video.assets.retrieve(upload.asset_id);
                    let playbackId = asset.playback_ids?.[0]?.id;
                    if (!playbackId) {
                        const playbackResponse = await muxClient.video.assets.createPlaybackId(asset.id, {
                            policy: video.visibility === client_1.Visibility.PRIVATE ? 'signed' : 'public',
                        });
                        playbackId = playbackResponse.id;
                    }
                    await this.prismaService.video.update({
                        where: { id: video.id },
                        data: {
                            muxAssetId: asset.id,
                            muxPlaybackId: playbackId,
                            status: asset.status === 'ready' ? client_1.VideoStatus.READY : client_1.VideoStatus.PROCESSING,
                            thumbnailUrl: asset.status === 'ready' ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
                            playbackUrl: asset.status === 'ready' ? `https://stream.mux.com/${playbackId}.m3u8` : null,
                            duration: Math.round(asset.duration || 0),
                        },
                    });
                    return {
                        status: asset.status,
                        assetId: asset.id,
                        playbackId: playbackId,
                        ready: asset.status === 'ready',
                    };
                }
                return {
                    status: 'uploading',
                    uploadId: upload.id,
                    ready: false,
                };
            }
            return {
                status: 'unknown',
                ready: false,
            };
        }
        catch (error) {
            this.logger.error('Error checking upload status:', error);
            throw new common_1.BadRequestException(`Failed to check upload status: ${error.message}`);
        }
    }
};
exports.MuxService = MuxService;
exports.MuxService = MuxService = MuxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MuxService);
//# sourceMappingURL=mux.service.js.map