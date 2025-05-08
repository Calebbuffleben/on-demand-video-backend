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
    async handleWebhook(rawBody, headers) {
        try {
            const event = this.mux.webhooks.unwrap(rawBody, headers);
            this.logger.log(`Received MUX webhook event: ${event.type}`);
            switch (event.type) {
                case 'video.asset.ready':
                    await this.handleAssetReady(event.data);
                    break;
                case 'video.asset.errored':
                    await this.handleAssetError(event.data);
                    break;
                case 'video.upload.cancelled':
                    await this.handleUploadCancelled(event.data);
                    break;
                default:
                    this.logger.log(`Unhandled MUX event type: ${event.type}`);
                    break;
            }
            return { success: true };
        }
        catch (error) {
            this.logger.error('Failed to process MUX webhook', error);
            throw new common_1.BadRequestException('Failed to process webhook');
        }
    }
    async handleAssetReady(data) {
        try {
            const assetId = data.id;
            const passthrough = JSON.parse(data.passthrough || '{}');
            const organizationId = passthrough.organizationId;
            let video = await this.prismaService.video.findFirst({
                where: {
                    muxUploadId: data.upload_id,
                },
            });
            if (!video) {
                video = await this.prismaService.video.findFirst({
                    where: {
                        muxAssetId: assetId,
                    },
                });
            }
            if (!video) {
                this.logger.warn(`No video found for MUX asset ID: ${assetId}`);
                return;
            }
            const playbackId = data.playback_ids?.[0]?.id;
            if (!playbackId) {
                this.logger.warn(`No playback ID found for MUX asset ID: ${assetId}`);
                return;
            }
            await this.prismaService.video.update({
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
            this.logger.log(`Updated video ${video.id} as ready with MUX asset ID: ${assetId}`);
        }
        catch (error) {
            this.logger.error('Error handling asset.ready event', error);
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
};
exports.MuxWebhookController = MuxWebhookController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)(),
    (0, common_1.HttpCode)(200),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook endpoint for MUX events' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook processed successfully.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], MuxWebhookController.prototype, "handleWebhook", null);
exports.MuxWebhookController = MuxWebhookController = MuxWebhookController_1 = __decorate([
    (0, swagger_1.ApiTags)('webhooks'),
    (0, common_1.Controller)('api/webhooks/mux'),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MuxWebhookController);
//# sourceMappingURL=mux-webhook.controller.js.map