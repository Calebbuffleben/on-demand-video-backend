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
var MuxWebhookController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MuxWebhookController = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const public_decorator_1 = require("../../auth/decorators/public.decorator");
const swagger_1 = require("@nestjs/swagger");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
const mux_node_1 = require("@mux/mux-node");
let MuxWebhookController = MuxWebhookController_1 = class MuxWebhookController {
    configService;
    prismaService;
    logger = new common_1.Logger(MuxWebhookController_1.name);
    muxWebhookSecret;
    mux;
    constructor(configService, prismaService) {
        this.configService = configService;
        this.prismaService = prismaService;
        this.muxWebhookSecret = this.configService.get('MUX_WEBHOOK_SECRET', '');
        this.mux = new mux_node_1.default({
            webhookSecret: this.muxWebhookSecret
        });
    }
    async handleWebhook(req, payload, signature) {
        try {
            this.logger.log('Received MUX webhook');
            this.logger.log(`Headers: ${JSON.stringify(req.headers)}`);
            this.logger.log(`Full webhook payload: ${JSON.stringify(payload, null, 2)}`);
            this.logger.log(`Webhook payload type: ${payload.type}`);
            if (payload.type) {
                switch (payload.type) {
                    case 'video.asset.ready':
                        this.logger.log('Processing video.asset.ready event');
                        await this.handleAssetReady(payload.data);
                        break;
                    case 'video.asset.errored':
                        this.logger.log('Processing video.asset.errored event');
                        await this.handleAssetError(payload.data);
                        break;
                    case 'video.upload.cancelled':
                        this.logger.log('Processing video.upload.cancelled event');
                        await this.handleUploadCancelled(payload.data);
                        break;
                    default:
                        this.logger.log(`Unhandled MUX event type: ${payload.type}`);
                        break;
                }
            }
            else {
                this.logger.error('Invalid webhook payload: missing type');
                throw new common_1.BadRequestException('Invalid webhook payload');
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Failed to process MUX webhook: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to process webhook');
        }
    }
    async handleAssetReady(data) {
        try {
            this.logger.log(`Processing asset.ready event for asset ID: ${data.id}`);
            this.logger.log(`Asset data: ${JSON.stringify(data)}`);
            const assetId = data.id;
            this.logger.log(`Asset ID: ${assetId}`);
            let passthrough = {};
            try {
                passthrough = JSON.parse(data.passthrough || '{}');
            }
            catch (e) {
                this.logger.error(`Error parsing passthrough data: ${e.message}`);
            }
            this.logger.log(`Passthrough data: ${JSON.stringify(passthrough)}`);
            const organizationId = passthrough['organizationId'];
            this.logger.log(`Organization ID: ${organizationId}`);
            this.logger.log(`Looking for video with MUX upload ID: ${data.upload_id}`);
            let video = null;
            if (data.upload_id) {
                const allVideos = await this.prismaService.video.findMany({
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                    where: {
                        OR: [
                            { muxUploadId: data.upload_id },
                            { muxAssetId: assetId },
                        ],
                    },
                });
                this.logger.log(`Found ${allVideos.length} videos that might match. IDs: ${allVideos.map(v => v.id).join(', ')}`);
                video = await this.prismaService.video.findFirst({
                    where: {
                        muxUploadId: data.upload_id,
                    },
                });
                if (video) {
                    this.logger.log(`Found video with ID ${video.id} by upload ID ${data.upload_id}`);
                }
                else {
                    this.logger.log(`No video found with upload ID ${data.upload_id}`);
                }
            }
            if (!video) {
                this.logger.log(`Looking for video with MUX asset ID: ${assetId}`);
                video = await this.prismaService.video.findFirst({
                    where: {
                        muxAssetId: assetId,
                    },
                });
                if (video) {
                    this.logger.log(`Found video with ID ${video.id} by asset ID ${assetId}`);
                }
                else {
                    this.logger.log(`No video found with asset ID ${assetId}`);
                }
            }
            if (!video) {
                this.logger.log(`Looking for pending video with upload_id or asset_id`);
                const allPendingVideos = await this.prismaService.pendingVideo.findMany({
                    take: 10,
                    orderBy: { createdAt: 'desc' },
                });
                this.logger.log(`Found ${allPendingVideos.length} pending videos in total. Latest IDs: ${allPendingVideos.map(v => v.id).join(', ')}`);
                let pendingVideo = await this.prismaService.pendingVideo.findFirst({
                    where: { muxUploadId: data.upload_id },
                });
                if (!pendingVideo && assetId) {
                    pendingVideo = await this.prismaService.pendingVideo.findFirst({
                        where: { muxAssetId: assetId },
                    });
                }
                if (!pendingVideo) {
                    pendingVideo = await this.prismaService.pendingVideo.findFirst({
                        orderBy: { createdAt: 'desc' },
                    });
                    if (pendingVideo) {
                        this.logger.log(`No exact match found. Using most recent pending video: ${pendingVideo.id}`);
                        try {
                            await this.prismaService.pendingVideo.update({
                                where: { id: pendingVideo.id },
                                data: { muxAssetId: assetId },
                            });
                        }
                        catch (updateError) {
                            this.logger.error(`Error updating pending video with asset ID: ${updateError.message}`);
                        }
                    }
                }
                if (pendingVideo) {
                    this.logger.log(`Found pending video with ID ${pendingVideo.id}`);
                    this.logger.log(`Creating new video from pending video ${pendingVideo.id}`);
                    try {
                        const newVideo = await this.prismaService.video.create({
                            data: {
                                id: pendingVideo.id,
                                name: pendingVideo.name,
                                description: pendingVideo.description,
                                organizationId: pendingVideo.organizationId,
                                muxUploadId: pendingVideo.muxUploadId || data.upload_id,
                                muxAssetId: assetId,
                                muxPlaybackId: data.playback_ids?.[0]?.id,
                                thumbnailUrl: data.playback_ids?.[0]?.id ? `https://image.mux.com/${data.playback_ids[0].id}/thumbnail.jpg` : null,
                                playbackUrl: data.playback_ids?.[0]?.id ? `https://stream.mux.com/${data.playback_ids[0].id}.m3u8` : null,
                                tags: pendingVideo.tags,
                                visibility: pendingVideo.visibility,
                                status: client_1.VideoStatus.READY,
                            },
                        });
                        this.logger.log(`Created new video with ID ${newVideo.id}`);
                        video = newVideo;
                        try {
                            await this.prismaService.pendingVideo.delete({
                                where: { id: pendingVideo.id },
                            });
                            this.logger.log(`Deleted pending video ${pendingVideo.id}`);
                        }
                        catch (deleteError) {
                            this.logger.error(`Error deleting pending video: ${deleteError.message}`, deleteError.stack);
                        }
                    }
                    catch (error) {
                        this.logger.error(`Error creating video from pending video: ${error.message}`, error.stack);
                    }
                }
                else {
                    this.logger.warn(`No pending video found for MUX asset ID: ${assetId} or upload ID: ${data.upload_id}`);
                    if (data.upload_id && organizationId) {
                        this.logger.log(`Attempting to create a new video directly from webhook data`);
                        try {
                            const newVideo = await this.prismaService.video.create({
                                data: {
                                    name: data.playback_ids?.[0]?.id || 'Uploaded Video',
                                    description: '',
                                    organizationId: organizationId,
                                    muxUploadId: data.upload_id,
                                    muxAssetId: assetId,
                                    muxPlaybackId: data.playback_ids?.[0]?.id,
                                    thumbnailUrl: data.playback_ids?.[0]?.id ? `https://image.mux.com/${data.playback_ids[0].id}/thumbnail.jpg` : null,
                                    playbackUrl: data.playback_ids?.[0]?.id ? `https://stream.mux.com/${data.playback_ids[0].id}.m3u8` : null,
                                    tags: [],
                                    visibility: 'PUBLIC',
                                    status: client_1.VideoStatus.READY,
                                },
                            });
                            this.logger.log(`Created new video directly from webhook with ID ${newVideo.id}`);
                            video = newVideo;
                        }
                        catch (createError) {
                            this.logger.error(`Error creating video directly from webhook: ${createError.message}`, createError.stack);
                        }
                    }
                }
            }
            if (!video) {
                this.logger.warn(`No video or pending video found for MUX asset ID: ${assetId}`);
                return;
            }
            const playbackId = data.playback_ids?.[0]?.id;
            if (!playbackId) {
                this.logger.warn(`No playback ID found for MUX asset ID: ${assetId}`);
                return;
            }
            this.logger.log(`Playback ID: ${playbackId}`);
            this.logger.log(`Updating video ${video.id} with playback information`);
            try {
                const updatedVideo = await this.prismaService.video.update({
                    where: { id: video.id },
                    data: {
                        muxAssetId: assetId,
                        muxPlaybackId: playbackId,
                        status: client_1.VideoStatus.READY,
                        thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
                        playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
                        duration: Math.round(data.duration || 0),
                    },
                });
                this.logger.log(`Successfully updated video ${video.id} as ready with MUX asset ID: ${assetId}`);
                this.logger.log(`New video status: ${updatedVideo.status}`);
            }
            catch (updateError) {
                this.logger.error(`Error updating video: ${updateError.message}`, updateError.stack);
            }
        }
        catch (error) {
            this.logger.error(`Error handling asset.ready event: ${error.message}`, error.stack);
        }
    }
    async handleAssetError(data) {
        try {
            const assetId = data.id;
            let video = await this.prismaService.video.findFirst({
                where: {
                    OR: [
                        { muxUploadId: data.upload_id },
                        { muxAssetId: assetId },
                    ],
                },
            });
            if (!video) {
                this.logger.warn(`No video found for MUX asset ID: ${assetId}`);
                return;
            }
            await this.prismaService.video.update({
                where: { id: video.id },
                data: {
                    status: client_1.VideoStatus.ERROR,
                },
            });
            this.logger.log(`Updated video ${video.id} status to ERROR for MUX asset ID: ${assetId}`);
        }
        catch (error) {
            this.logger.error('Error handling asset.errored event', error);
        }
    }
    async handleUploadCancelled(data) {
        try {
            const uploadId = data.id;
            const video = await this.prismaService.video.findFirst({
                where: {
                    muxUploadId: uploadId,
                },
            });
            if (!video) {
                this.logger.warn(`No video found for MUX upload ID: ${uploadId}`);
                return;
            }
            await this.prismaService.video.update({
                where: { id: video.id },
                data: {
                    status: client_1.VideoStatus.DELETED,
                },
            });
            this.logger.log(`Updated video ${video.id} status to DELETED for cancelled upload ID: ${uploadId}`);
        }
        catch (error) {
            this.logger.error('Error handling upload.cancelled event', error);
        }
    }
    async handleSimulatedWebhook(payload) {
        try {
            this.logger.log('Received simulated MUX webhook');
            this.logger.log(`Full webhook payload: ${JSON.stringify(payload, null, 2)}`);
            this.logger.log(`Webhook payload type: ${payload.type}`);
            if (payload.type) {
                switch (payload.type) {
                    case 'video.asset.ready':
                        this.logger.log('Processing simulated video.asset.ready event');
                        await this.handleAssetReady(payload.data);
                        break;
                    case 'video.asset.errored':
                        this.logger.log('Processing simulated video.asset.errored event');
                        await this.handleAssetError(payload.data);
                        break;
                    case 'video.upload.cancelled':
                        this.logger.log('Processing simulated video.upload.cancelled event');
                        await this.handleUploadCancelled(payload.data);
                        break;
                    default:
                        this.logger.log(`Unhandled MUX event type: ${payload.type}`);
                        break;
                }
            }
            else {
                this.logger.error('Invalid webhook payload: missing type');
                throw new common_1.BadRequestException('Invalid webhook payload');
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error(`Failed to process simulated MUX webhook: ${error.message}`, error.stack);
            throw new common_1.BadRequestException('Failed to process webhook');
        }
    }
};
exports.MuxWebhookController = MuxWebhookController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook endpoint for MUX events' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook processed successfully.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Headers)('mux-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object, String]),
    __metadata("design:returntype", Promise)
], MuxWebhookController.prototype, "handleWebhook", null);
exports.MuxWebhookController = MuxWebhookController = MuxWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('webhooks'),
    (0, common_1.Controller)('api/webhooks/mux'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MuxWebhookController);
//# sourceMappingURL=mux-webhook.controller.js.map