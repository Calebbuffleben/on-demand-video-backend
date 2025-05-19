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
        const { displayOptions, embedOptions, ...basicData } = updateVideoDto;
        const updateData = {
            ...basicData,
        };
        if (displayOptions) {
            updateData.showProgressBar = displayOptions.showProgressBar;
            updateData.showTitle = displayOptions.showTitle;
            updateData.showPlaybackControls = displayOptions.showPlaybackControls;
            updateData.autoPlay = displayOptions.autoPlay;
            updateData.muted = displayOptions.muted;
            updateData.loop = displayOptions.loop;
        }
        if (embedOptions) {
            updateData.showVideoTitle = embedOptions.showVideoTitle;
            updateData.showUploadDate = embedOptions.showUploadDate;
            updateData.showMetadata = embedOptions.showMetadata;
            updateData.allowFullscreen = embedOptions.allowFullscreen;
            updateData.responsive = embedOptions.responsive;
            updateData.showBranding = embedOptions.showBranding;
            updateData.showTechnicalInfo = embedOptions.showTechnicalInfo;
        }
        return this.prisma.video.update({
            where: { id },
            data: updateData,
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
        const displayOptions = {
            showProgressBar: video.showProgressBar === false ? false : true,
            showTitle: video.showTitle === false ? false : true,
            showPlaybackControls: video.showPlaybackControls === false ? false : true,
            autoPlay: video.autoPlay === true ? true : false,
            muted: video.muted === true ? true : false,
            loop: video.loop === true ? true : false,
        };
        const embedOptions = {
            showVideoTitle: video.showVideoTitle === false ? false : true,
            showUploadDate: video.showUploadDate === false ? false : true,
            showMetadata: video.showMetadata === false ? false : true,
            allowFullscreen: video.allowFullscreen === false ? false : true,
            responsive: video.responsive === false ? false : true,
            showBranding: video.showBranding === false ? false : true,
            showTechnicalInfo: video.showTechnicalInfo === true ? true : false,
        };
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
                displayOptions,
                embedOptions,
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
                this.logger.error('Organization ID is missing in getUploadUrl request');
                throw new common_1.BadRequestException('Organization ID is required');
            }
            this.logger.log(`getUploadUrl called with organizationId: ${dto.organizationId}`);
            const organization = await this.prisma.organization.findUnique({
                where: { id: dto.organizationId },
            });
            if (!organization) {
                this.logger.error(`Organization with ID ${dto.organizationId} not found`);
                throw new common_1.BadRequestException(`Organization with ID ${dto.organizationId} not found`);
            }
            this.logger.log(`Creating upload URL for organization: ${organization.name}`);
            try {
                const result = await this.muxService.createDirectUploadUrl(dto.name || 'Untitled', dto.description || '', dto.requireSignedURLs ? client_1.Visibility.PRIVATE : client_1.Visibility.PUBLIC, [], dto.organizationId);
                const pendingVideo = await this.prisma.pendingVideo.findUnique({
                    where: { id: result.videoId },
                });
                if (!pendingVideo) {
                    this.logger.error(`PendingVideo with ID ${result.videoId} was not created`);
                    throw new common_1.InternalServerErrorException('Failed to create pending video record');
                }
                this.logger.log(`Upload URL created successfully. PendingVideo ID: ${result.videoId}`);
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
                this.logger.error(`Error in muxService.createDirectUploadUrl: ${error.message}`, error.stack);
                throw error;
            }
        }
        catch (error) {
            this.logger.error(`Error getting upload URL: ${error.message}`, error.stack);
            if (error instanceof common_1.BadRequestException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to get upload URL: ${error.message}`);
        }
    }
    async getVideoStatus(videoId) {
        try {
            this.logger.log(`Getting video status for ID: ${videoId} (TRACE: ${new Error().stack})`);
            const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
            this.logger.log(`ID ${videoId} is ${isUuid ? 'a valid UUID' : 'not a UUID'}`);
            const allVideos = await this.prisma.video.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`Found ${allVideos.length} videos in database. Latest IDs: ${allVideos.map(v => v.id).join(', ')}`);
            let video;
            if (isUuid) {
                this.logger.log(`Looking for video with exact ID: ${videoId}`);
                video = await this.prisma.video.findUnique({
                    where: { id: videoId },
                });
            }
            if (!video) {
                this.logger.log(`Looking for video by related IDs: ${videoId}`);
                video = await this.prisma.video.findFirst({
                    where: {
                        OR: [
                            { id: videoId },
                            { muxAssetId: videoId },
                            { muxPlaybackId: videoId },
                            { muxUploadId: videoId },
                        ],
                    },
                });
                if (video) {
                    this.logger.log(`Found video by related ID: ${video.id}, matched with field containing ${videoId}`);
                }
                else {
                    this.logger.log(`No video found with any related ID match for ${videoId}`);
                }
            }
            else {
                this.logger.log(`Found video by exact ID: ${video.id}`);
            }
            if (video) {
                this.logger.log(`Returning status for video: ${video.id}, status: ${video.status}`);
                const displayOptions = {
                    showProgressBar: video.showProgressBar === false ? false : true,
                    showTitle: video.showTitle === false ? false : true,
                    showPlaybackControls: video.showPlaybackControls === false ? false : true,
                    autoPlay: video.autoPlay === true ? true : false,
                    muted: video.muted === true ? true : false,
                    loop: video.loop === true ? true : false,
                };
                const embedOptions = {
                    showVideoTitle: video.showVideoTitle === false ? false : true,
                    showUploadDate: video.showUploadDate === false ? false : true,
                    showMetadata: video.showMetadata === false ? false : true,
                    allowFullscreen: video.allowFullscreen === false ? false : true,
                    responsive: video.responsive === false ? false : true,
                    showBranding: video.showBranding === false ? false : true,
                    showTechnicalInfo: video.showTechnicalInfo === true ? true : false,
                };
                return {
                    success: true,
                    video: {
                        uid: video.id,
                        readyToStream: video.status === client_1.VideoStatus.READY,
                        status: {
                            state: this.mapVideoStatus(video.status)
                        },
                        thumbnail: video.thumbnailUrl || '',
                        preview: video.thumbnailUrl || '',
                        playback: {
                            hls: video.playbackUrl || '',
                            dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
                        },
                        meta: {
                            name: video.name,
                            displayOptions,
                            embedOptions,
                        },
                        duration: video.duration || 100,
                    }
                };
            }
            this.logger.log(`Checking for pending video with ID: ${videoId}`);
            const allPendingVideos = await this.prisma.pendingVideo.findMany({
                take: 10,
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`Found ${allPendingVideos.length} pending videos. Latest IDs: ${allPendingVideos.map(v => v.id).join(', ')}`);
            let pendingVideo;
            if (isUuid) {
                pendingVideo = await this.prisma.pendingVideo.findUnique({
                    where: { id: videoId },
                });
                if (pendingVideo) {
                    this.logger.log(`Found pending video by exact ID: ${pendingVideo.id}`);
                }
            }
            if (!pendingVideo) {
                pendingVideo = await this.prisma.pendingVideo.findFirst({
                    where: {
                        OR: [
                            { id: videoId },
                            { muxUploadId: videoId },
                            { muxAssetId: videoId },
                        ],
                    },
                });
                if (pendingVideo) {
                    this.logger.log(`Found pending video by related ID: ${pendingVideo.id}`);
                }
                else {
                    this.logger.log(`No pending video found with any ID match`);
                }
            }
            if (pendingVideo) {
                this.logger.log(`Found pending video: ${pendingVideo.id}, status: ${pendingVideo.status}`);
                if (pendingVideo.muxUploadId) {
                    try {
                        this.logger.log(`Checking upload status for MUX upload ID: ${pendingVideo.muxUploadId}`);
                        const uploadStatus = await this.muxService.checkUploadStatus(pendingVideo.id, pendingVideo.organizationId);
                        this.logger.log(`MUX upload status: ${JSON.stringify(uploadStatus)}`);
                        if (uploadStatus.status === 'ready' && uploadStatus.assetId) {
                            this.logger.log(`Upload is ready with asset ID: ${uploadStatus.assetId}`);
                            const existingVideo = await this.prisma.video.findFirst({
                                where: { muxAssetId: uploadStatus.assetId }
                            });
                            if (existingVideo) {
                                this.logger.log(`Video already exists for asset ID: ${uploadStatus.assetId}`);
                                video = existingVideo;
                            }
                            else {
                                try {
                                    this.logger.log(`Creating new video from pending video: ${pendingVideo.id}`);
                                    const newVideo = await this.prisma.video.create({
                                        data: {
                                            name: pendingVideo.name,
                                            description: pendingVideo.description,
                                            organizationId: pendingVideo.organizationId,
                                            muxUploadId: pendingVideo.muxUploadId,
                                            muxAssetId: uploadStatus.assetId,
                                            tags: pendingVideo.tags,
                                            visibility: pendingVideo.visibility,
                                            status: client_1.VideoStatus.READY,
                                        },
                                    });
                                    this.logger.log(`Created new video with ID: ${newVideo.id}`);
                                    video = newVideo;
                                    try {
                                        await this.prisma.pendingVideo.delete({
                                            where: { id: pendingVideo.id },
                                        });
                                        this.logger.log(`Deleted pending video ${pendingVideo.id}`);
                                    }
                                    catch (deleteError) {
                                        this.logger.error(`Error deleting pending video: ${deleteError.message}`);
                                    }
                                }
                                catch (error) {
                                    this.logger.error(`Error creating video from pending video: ${error.message}`);
                                }
                            }
                            if (video) {
                                return {
                                    success: true,
                                    video: {
                                        uid: video.id,
                                        readyToStream: video.status === client_1.VideoStatus.READY,
                                        status: {
                                            state: this.mapVideoStatus(video.status)
                                        },
                                        thumbnail: video.thumbnailUrl || '',
                                        preview: video.thumbnailUrl || '',
                                        playback: {
                                            hls: video.playbackUrl || '',
                                            dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
                                        },
                                        meta: {
                                            name: video.name,
                                        },
                                        duration: video.duration || 100,
                                    }
                                };
                            }
                        }
                    }
                    catch (checkError) {
                        this.logger.error(`Error checking upload status: ${checkError.message}`, checkError.stack);
                    }
                }
                return {
                    success: true,
                    video: {
                        uid: pendingVideo.id,
                        readyToStream: false,
                        status: {
                            state: this.mapVideoStatus(client_1.VideoStatus.PROCESSING)
                        },
                        thumbnail: '',
                        preview: '',
                        playback: {
                            hls: '',
                            dash: '',
                        },
                        meta: {
                            name: pendingVideo.name,
                        },
                        duration: 100,
                    }
                };
            }
            this.logger.warn(`No video or pending video found with ID: ${videoId}`);
            if (!isUuid && videoId.length > 10) {
                try {
                    this.logger.log(`Checking MUX directly for asset/upload ID: ${videoId}`);
                }
                catch (error) {
                    this.logger.error(`Error checking MUX directly: ${error.message}`);
                }
            }
            return {
                success: true,
                video: {
                    uid: videoId,
                    readyToStream: false,
                    status: {
                        state: "processing"
                    },
                    thumbnail: '',
                    preview: '',
                    playback: {
                        hls: '',
                        dash: '',
                    },
                    meta: {
                        name: 'Video Processing',
                    },
                    duration: 0,
                }
            };
        }
        catch (error) {
            this.logger.error(`Error getting video status: ${error.message}`, error.stack);
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
            const result = videos.map(video => this.mapVideoToDto(video));
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
            const result = this.mapVideoToDto(video);
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
    mapVideoToDto(video) {
        const displayOptions = {
            showProgressBar: video.showProgressBar === false ? false : true,
            showTitle: video.showTitle === false ? false : true,
            showPlaybackControls: video.showPlaybackControls === false ? false : true,
            autoPlay: video.autoPlay === true ? true : false,
            muted: video.muted === true ? true : false,
            loop: video.loop === true ? true : false,
        };
        const embedOptions = {
            showVideoTitle: video.showVideoTitle === false ? false : true,
            showUploadDate: video.showUploadDate === false ? false : true,
            showMetadata: video.showMetadata === false ? false : true,
            allowFullscreen: video.allowFullscreen === false ? false : true,
            responsive: video.responsive === false ? false : true,
            showBranding: video.showBranding === false ? false : true,
            showTechnicalInfo: video.showTechnicalInfo === true ? true : false,
        };
        return {
            uid: video.id,
            thumbnail: video.thumbnailUrl || '',
            readyToStream: video.status === client_1.VideoStatus.READY,
            status: {
                state: this.mapVideoStatus(video.status),
            },
            meta: {
                name: video.name,
                displayOptions,
                embedOptions,
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