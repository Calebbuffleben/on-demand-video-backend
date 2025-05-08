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
var VideosService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const mux_service_1 = require("../providers/mux/mux.service");
const mux_node_1 = require("@mux/mux-node");
let VideosService = VideosService_1 = class VideosService {
    prisma;
    configService;
    muxService;
    logger = new common_1.Logger(VideosService_1.name);
    constructor(prisma, configService, muxService) {
        this.prisma = prisma;
        this.configService = configService;
        this.muxService = muxService;
    }
    async testCloudflareConnection(organizationId) {
        try {
            const response = await this.muxService.testMuxConnection(organizationId);
            return {
                success: response.success,
                status: response.status,
                message: 'Successfully connected to Video API',
                data: {
                    result: response.data.result,
                    resultInfo: {
                        count: response.data.result.length,
                        page: 1,
                        per_page: response.data.result.length,
                        total_count: response.data.result.length,
                    },
                },
            };
        }
        catch (error) {
            console.error('Error connecting to Video API:', error);
            throw new common_1.BadRequestException(`Failed to connect to Video API: ${error.message}`);
        }
    }
    async findAll(organizationId) {
        return this.prisma.video.findMany({
            where: { organizationId },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findOne(id, organizationId) {
        const video = await this.prisma.video.findUnique({
            where: { id },
        });
        if (!video) {
            throw new common_1.NotFoundException(`Video with ID ${id} not found`);
        }
        if (video.organizationId !== organizationId) {
            throw new common_1.ForbiddenException('You do not have access to this video');
        }
        return video;
    }
    async createDirectUploadUrl(createVideoDto, organizationId) {
        try {
            return await this.muxService.createDirectUploadUrl(createVideoDto.name, createVideoDto.description || '', createVideoDto.visibility || client_1.Visibility.PUBLIC, createVideoDto.tags || [], organizationId);
        }
        catch (error) {
            console.error('Error creating direct upload URL:', error);
            throw new common_1.BadRequestException('Failed to create upload URL');
        }
    }
    async update(id, updateVideoDto, organizationId) {
        const video = await this.findOne(id, organizationId);
        return this.prisma.video.update({
            where: { id },
            data: {
                name: updateVideoDto.name,
                description: updateVideoDto.description,
                tags: updateVideoDto.tags,
                visibility: updateVideoDto.visibility,
            },
        });
    }
    async remove(id, organizationId) {
        const video = await this.findOne(id, organizationId);
        try {
            if (video.muxAssetId) {
                const { tokenId, tokenSecret } = await this.muxService.getMuxCredentials(organizationId);
                const muxClient = new mux_node_1.default({
                    tokenId,
                    tokenSecret,
                });
                await muxClient.video.assets.delete(video.muxAssetId);
            }
            await this.prisma.video.delete({
                where: { id },
            });
        }
        catch (error) {
            console.error('Error removing video:', error);
            throw new common_1.BadRequestException(`Failed to remove video: ${error.message}`);
        }
    }
    async syncVideoStatus(id, organizationId) {
        const video = await this.findOne(id, organizationId);
        try {
            if (video.muxUploadId) {
                await this.muxService.checkUploadStatus(id, organizationId);
                const updatedVideo = await this.prisma.video.findUnique({
                    where: { id },
                });
                if (!updatedVideo) {
                    throw new common_1.NotFoundException(`Video with ID ${id} not found`);
                }
                return updatedVideo;
            }
            throw new common_1.BadRequestException('Video cannot be synced - no provider ID found');
        }
        catch (error) {
            console.error('Error syncing video status:', error);
            throw new common_1.BadRequestException(`Failed to sync video status: ${error.message}`);
        }
    }
    async handleCloudflareWebhook(payload) {
    }
    async handleMuxWebhook(payload, signature) {
        try {
            const isValid = await this.muxService.verifyWebhookSignature(payload, signature);
            if (!isValid) {
                this.logger.error('Invalid MUX webhook signature');
                throw new common_1.BadRequestException('Invalid webhook signature');
            }
            switch (payload.type) {
                case 'video.asset.ready':
                    await this.handleMuxAssetReady(payload);
                    break;
                case 'video.asset.deleted':
                    await this.handleMuxAssetDeleted(payload);
                    break;
                case 'video.asset.errored':
                    await this.handleMuxAssetError(payload);
                    break;
                default:
                    this.logger.warn(`Unhandled MUX webhook event type: ${payload.type}`);
            }
        }
        catch (error) {
            this.logger.error('Error handling MUX webhook:', error);
            throw error;
        }
    }
    mapVideoStatus(status) {
        switch (status) {
            case client_1.VideoStatus.PROCESSING:
                return 'processing';
            case client_1.VideoStatus.READY:
                return 'ready';
            case client_1.VideoStatus.ERROR:
                return 'error';
            case client_1.VideoStatus.DELETED:
                return 'deleted';
            default:
                return 'unknown';
        }
    }
    isVideo(value) {
        return value !== null && typeof value === 'object' && 'id' in value;
    }
    async getVideoForEmbed(videoId, organizationId) {
        const video = await this.prisma.video.findFirst({
            where: {
                OR: [
                    { id: videoId },
                    { muxAssetId: videoId },
                    { muxPlaybackId: videoId },
                ],
            },
        });
        if (!this.isVideo(video)) {
            throw new common_1.NotFoundException('Video not found');
        }
        if (video.visibility === client_1.Visibility.PRIVATE) {
            throw new common_1.ForbiddenException('This video is private');
        }
        if (video.visibility === client_1.Visibility.ORGANIZATION && (!organizationId || video.organizationId !== organizationId)) {
            throw new common_1.ForbiddenException('This video is only accessible to organization members');
        }
        const embedVideo = {
            uid: video.id,
            thumbnail: video.thumbnailUrl,
            preview: video.thumbnailUrl,
            readyToStream: video.status === client_1.VideoStatus.READY,
            status: {
                state: this.mapVideoStatus(video.status),
            },
            meta: {
                name: video.name,
            },
            duration: video.duration,
            playback: {
                hls: video.playbackUrl,
                dash: video.playbackUrl ? video.playbackUrl.replace('.m3u8', '.mpd') : null,
            },
        };
        return {
            success: true,
            result: embedVideo,
        };
    }
    async handleMuxAssetReady(payload) {
        const { data } = payload;
        const video = await this.prisma.video.findFirst({
            where: { muxAssetId: data.id },
        });
        if (!this.isVideo(video)) {
            this.logger.warn(`Video not found for MUX Asset ID: ${data.id}`);
            return;
        }
        const updatedVideo = await this.prisma.video.update({
            where: { id: video.id },
            data: {
                status: client_1.VideoStatus.READY,
                thumbnailUrl: data.thumbnail_url || null,
                playbackUrl: data.playback_url || null,
                duration: Math.round(data.duration || 0),
            },
        });
        if (!this.isVideo(updatedVideo)) {
            this.logger.error('Failed to update video');
            return;
        }
        this.logger.log(`Video ${updatedVideo.id} is now ready for playback`);
    }
    async handleMuxAssetDeleted(payload) {
        const { data } = payload;
        const video = await this.prisma.video.findFirst({
            where: { muxAssetId: data.id },
        });
        if (!this.isVideo(video)) {
            this.logger.warn(`Video not found for MUX Asset ID: ${data.id}`);
            return;
        }
        const updatedVideo = await this.prisma.video.update({
            where: { id: video.id },
            data: {
                status: client_1.VideoStatus.DELETED,
            },
        });
        if (!this.isVideo(updatedVideo)) {
            this.logger.error('Failed to update video');
            return;
        }
        this.logger.log(`Video ${updatedVideo.id} has been deleted`);
    }
    async handleMuxAssetError(payload) {
        const { data } = payload;
        const video = await this.prisma.video.findFirst({
            where: { muxAssetId: data.id },
        });
        if (!this.isVideo(video)) {
            this.logger.warn(`Video not found for MUX Asset ID: ${data.id}`);
            return;
        }
        const updatedVideo = await this.prisma.video.update({
            where: { id: video.id },
            data: {
                status: client_1.VideoStatus.ERROR,
            },
        });
        if (!this.isVideo(updatedVideo)) {
            this.logger.error('Failed to update video');
            return;
        }
        this.logger.error(`Video ${updatedVideo.id} encountered an error: ${data.errors?.messages?.join(', ')}`);
    }
    async getUploadUrl(dto) {
        try {
            if (!dto.organizationId) {
                throw new common_1.BadRequestException('Organization ID is required');
            }
            const result = await this.muxService.createDirectUploadUrl(dto.name || 'Untitled', dto.description || '', dto.requireSignedURLs ? client_1.Visibility.PRIVATE : client_1.Visibility.PUBLIC, [], dto.organizationId);
            return {
                success: true,
                status: 200,
                message: 'Upload URL created successfully',
                data: {
                    success: true,
                    uploadURL: result.uploadUrl,
                    uid: result.videoId,
                },
            };
        }
        catch (error) {
            console.error('Error getting upload URL:', error);
            throw new common_1.BadRequestException(`Failed to get upload URL: ${error.message}`);
        }
    }
    async getVideoStatus(videoId) {
        try {
            const video = await this.prisma.video.findFirst({
                where: {
                    OR: [
                        { id: videoId },
                        { muxAssetId: videoId },
                        { muxPlaybackId: videoId },
                        { muxUploadId: videoId },
                    ],
                },
            });
            if (!video) {
                throw new common_1.NotFoundException(`Video with ID ${videoId} not found`);
            }
            if (video.muxUploadId) {
                const uploadStatus = await this.muxService.checkUploadStatus(video.id, video.organizationId);
                if (uploadStatus.status === 'ready') {
                    await this.prisma.video.update({
                        where: { id: video.id },
                        data: {
                            status: client_1.VideoStatus.READY,
                            thumbnailUrl: uploadStatus.thumbnailUrl,
                            playbackUrl: uploadStatus.playbackUrl,
                            duration: uploadStatus.duration,
                        },
                    });
                    video.status = client_1.VideoStatus.READY;
                    video.thumbnailUrl = uploadStatus.thumbnailUrl;
                    video.playbackUrl = uploadStatus.playbackUrl;
                    video.duration = uploadStatus.duration;
                }
            }
            return {
                success: true,
                readyToStream: video.status === client_1.VideoStatus.READY,
                status: this.mapVideoStatus(video.status),
                thumbnail: video.thumbnailUrl || '',
                preview: video.thumbnailUrl || '',
                playback: {
                    hls: video.playbackUrl || '',
                    dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
                },
                meta: {
                    name: video.name,
                },
                uid: video.muxAssetId || video.id,
                duration: video.duration || 0,
            };
        }
        catch (error) {
            console.error('Error getting video status:', error);
            throw new common_1.BadRequestException(`Failed to get video status: ${error.message}`);
        }
    }
    async getAllVideos() {
        try {
            const videos = await this.prisma.video.findMany({
                where: {
                    status: client_1.VideoStatus.READY,
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
            const result = videos.map(video => ({
                uid: video.muxAssetId || video.id,
                thumbnail: video.thumbnailUrl || '',
                readyToStream: video.status === client_1.VideoStatus.READY,
                status: {
                    state: this.mapVideoStatus(video.status),
                },
                meta: {
                    name: video.name,
                },
                created: video.createdAt.toISOString(),
                modified: video.updatedAt.toISOString(),
                duration: video.duration || 0,
                size: 0,
                preview: video.thumbnailUrl || '',
                playback: {
                    hls: video.playbackUrl || '',
                    dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
                },
            }));
            return {
                success: true,
                status: 200,
                message: 'Videos retrieved successfully',
                data: {
                    result,
                    result_info: {
                        count: result.length,
                        page: 1,
                        per_page: result.length,
                        total_count: result.length,
                    },
                },
            };
        }
        catch (error) {
            console.error('Error getting all videos:', error);
            throw new common_1.BadRequestException(`Failed to get videos: ${error.message}`);
        }
    }
    async getVideoByUid(uid) {
        try {
            const video = await this.prisma.video.findFirst({
                where: {
                    OR: [
                        { id: uid },
                        { muxAssetId: uid },
                        { muxPlaybackId: uid },
                    ],
                },
            });
            if (!video) {
                throw new common_1.NotFoundException(`Video with UID ${uid} not found`);
            }
            const result = {
                uid: video.muxAssetId || video.id,
                thumbnail: video.thumbnailUrl || '',
                readyToStream: video.status === client_1.VideoStatus.READY,
                status: {
                    state: this.mapVideoStatus(video.status),
                },
                meta: {
                    name: video.name,
                },
                created: video.createdAt.toISOString(),
                modified: video.updatedAt.toISOString(),
                duration: video.duration || 0,
                size: 0,
                preview: video.thumbnailUrl || '',
                playback: {
                    hls: video.playbackUrl || '',
                    dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
                },
            };
            return {
                success: true,
                status: 200,
                message: 'Video retrieved successfully',
                data: {
                    result,
                },
            };
        }
        catch (error) {
            console.error('Error getting video by UID:', error);
            throw new common_1.BadRequestException(`Failed to get video: ${error.message}`);
        }
    }
    async updateOrgCloudflareSettings(updateOrgCloudflareDto, organizationId) {
        try {
            await this.prisma.organization.update({
                where: { id: organizationId },
                data: {
                    muxTokenId: updateOrgCloudflareDto.cloudflareAccountId,
                    muxTokenSecret: updateOrgCloudflareDto.cloudflareApiToken,
                },
            });
            return {
                success: true,
                cloudflareAccountId: this.maskString(updateOrgCloudflareDto.cloudflareAccountId),
                cloudflareApiToken: this.maskString(updateOrgCloudflareDto.cloudflareApiToken),
            };
        }
        catch (error) {
            console.error('Error updating organization settings:', error);
            throw new common_1.BadRequestException(`Failed to update settings: ${error.message}`);
        }
    }
    async getOrgCloudflareSettings(organizationId) {
        try {
            const organization = await this.prisma.organization.findUnique({
                where: { id: organizationId },
                select: {
                    muxTokenId: true,
                    muxTokenSecret: true,
                },
            });
            if (!organization) {
                throw new common_1.NotFoundException(`Organization not found`);
            }
            return {
                success: true,
                cloudflareAccountId: this.maskString(organization.muxTokenId || ''),
                cloudflareApiToken: this.maskString(organization.muxTokenSecret || ''),
            };
        }
        catch (error) {
            console.error('Error getting organization settings:', error);
            throw new common_1.BadRequestException(`Failed to get settings: ${error.message}`);
        }
    }
    maskString(input) {
        if (!input || input.length < 4) {
            return input;
        }
        const visiblePrefixLength = Math.min(3, Math.floor(input.length / 4));
        const visibleSuffixLength = Math.min(3, Math.floor(input.length / 4));
        return (input.substring(0, visiblePrefixLength) +
            '*'.repeat(input.length - visiblePrefixLength - visibleSuffixLength) +
            input.substring(input.length - visibleSuffixLength));
    }
};
exports.VideosService = VideosService;
exports.VideosService = VideosService = VideosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        mux_service_1.MuxService])
], VideosService);
//# sourceMappingURL=videos.service.js.map