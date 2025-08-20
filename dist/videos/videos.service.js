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
const r2_service_1 = require("../storage/r2.service");
const client_1 = require("@prisma/client");
const crypto_1 = require("crypto");
const mux_service_1 = require("../providers/mux/mux.service");
const mux_node_1 = require("@mux/mux-node");
const transcode_queue_1 = require("../queue/transcode.queue");
const jwt_playback_service_1 = require("./jwt-playback.service");
const video_provider_factory_1 = require("./providers/video-provider.factory");
let VideosService = VideosService_1 = class VideosService {
    prisma;
    configService;
    muxService;
    r2;
    transcodeQueue;
    jwtPlayback;
    providerFactory;
    logger = new common_1.Logger(VideosService_1.name);
    constructor(prisma, configService, muxService, r2, transcodeQueue, jwtPlayback, providerFactory) {
        this.prisma = prisma;
        this.configService = configService;
        this.muxService = muxService;
        this.r2 = r2;
        this.transcodeQueue = transcodeQueue;
        this.jwtPlayback = jwtPlayback;
        this.providerFactory = providerFactory;
    }
    async testCloudflareConnection(organizationId) {
        try {
            if (organizationId) {
                const results = await this.testAllProviders(organizationId);
                return {
                    success: Object.values(results).some(r => r.success),
                    status: 200,
                    message: 'Provider connection test completed',
                    data: { result: results },
                };
            }
            else {
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
        }
        catch (error) {
            console.error('Error connecting to Video API:', error);
            throw new common_1.BadRequestException(`Failed to connect to Video API: ${error.message}`);
        }
    }
    async getAvailableProviders(organizationId) {
        return this.providerFactory.getAvailableProviders(organizationId);
    }
    async testAllProviders(organizationId) {
        return this.providerFactory.testAllProviders(organizationId);
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
        this.logger.log('Updating video with ID: ' + id);
        this.logger.log('----------- Current video display options: -----------', displayOptions);
        this.logger.log('----------- Current video embed options: -----------', embedOptions);
        const updateData = {
            ...basicData,
        };
        if (displayOptions) {
            this.logger.log('Received new display options:', displayOptions);
            updateData.showProgressBar = displayOptions.showProgressBar;
            updateData.showTitle = displayOptions.showTitle;
            updateData.showPlaybackControls = displayOptions.showPlaybackControls;
            updateData.autoPlay = displayOptions.autoPlay;
            updateData.muted = displayOptions.muted;
            updateData.loop = displayOptions.loop;
            updateData.useOriginalProgressBar = displayOptions.useOriginalProgressBar;
            updateData.progressBarColor = displayOptions.progressBarColor;
            updateData.progressEasing = displayOptions.progressEasing;
            updateData.playButtonColor = displayOptions.playButtonColor;
            updateData.playButtonSize = displayOptions.playButtonSize;
            updateData.playButtonBgColor = displayOptions.playButtonBgColor;
            updateData.showSoundControl = displayOptions.showSoundControl;
            if (displayOptions.soundControlText !== undefined) {
                this.logger.log('Updating soundControlText:', {
                    current: video.soundControlText,
                    new: displayOptions.soundControlText
                });
                updateData.soundControlText = displayOptions.soundControlText;
            }
            if (displayOptions.soundControlColor !== undefined) {
                this.logger.log('Updating soundControlColor:', {
                    current: video.soundControlColor,
                    new: displayOptions.soundControlColor
                });
                updateData.soundControlColor = displayOptions.soundControlColor;
            }
            if (displayOptions.soundControlOpacity !== undefined) {
                this.logger.log('Updating soundControlOpacity:', {
                    current: video.soundControlOpacity,
                    new: displayOptions.soundControlOpacity
                });
                updateData.soundControlOpacity = displayOptions.soundControlOpacity;
            }
            if (displayOptions.soundControlSize !== undefined) {
                this.logger.log('Updating soundControlSize:', {
                    current: video.soundControlSize,
                    new: displayOptions.soundControlSize
                });
                updateData.soundControlSize = displayOptions.soundControlSize;
            }
        }
        if (embedOptions) {
            this.logger.log('Received new embed options:', embedOptions);
            updateData.showVideoTitle = embedOptions.showVideoTitle;
            updateData.showUploadDate = embedOptions.showUploadDate;
            updateData.showMetadata = embedOptions.showMetadata;
            updateData.allowFullscreen = embedOptions.allowFullscreen;
            updateData.responsive = embedOptions.responsive;
            updateData.showBranding = embedOptions.showBranding;
            updateData.showTechnicalInfo = embedOptions.showTechnicalInfo;
        }
        if (typeof updateVideoDto.ctaText !== 'undefined')
            updateData.ctaText = updateVideoDto.ctaText;
        if (typeof updateVideoDto.ctaButtonText !== 'undefined')
            updateData.ctaButtonText = updateVideoDto.ctaButtonText;
        if (typeof updateVideoDto.ctaLink !== 'undefined')
            updateData.ctaLink = updateVideoDto.ctaLink;
        if (typeof updateVideoDto.ctaStartTime !== 'undefined')
            updateData.ctaStartTime = updateVideoDto.ctaStartTime;
        if (typeof updateVideoDto.ctaEndTime !== 'undefined')
            updateData.ctaEndTime = updateVideoDto.ctaEndTime;
        this.logger.log('Final update data:', {
            displayOptions: {
                soundControlText: updateData.soundControlText,
                soundControlColor: updateData.soundControlColor,
                soundControlOpacity: updateData.soundControlOpacity,
                soundControlSize: updateData.soundControlSize
            }
        });
        const updatedVideo = await this.prisma.video.update({
            where: { id },
            data: updateData,
        });
        this.logger.log('Video updated successfully. New sound control values:', {
            soundControlText: updatedVideo.soundControlText,
            soundControlColor: updatedVideo.soundControlColor,
            soundControlOpacity: updatedVideo.soundControlOpacity,
            soundControlSize: updatedVideo.soundControlSize
        });
        return updatedVideo;
    }
    async remove(id, organizationId) {
        const video = await this.findOne(id, organizationId);
        try {
            if (video.muxAssetId) {
                try {
                    const { tokenId, tokenSecret } = await this.muxService.getMuxCredentials(organizationId);
                    const muxClient = new mux_node_1.default({
                        tokenId,
                        tokenSecret,
                    });
                    await muxClient.video.assets.delete(video.muxAssetId);
                    this.logger.log(`Successfully deleted MUX asset: ${video.muxAssetId}`);
                }
                catch (muxError) {
                    if (muxError.status === 404) {
                        this.logger.warn(`MUX asset ${video.muxAssetId} not found - it may have been deleted already`);
                    }
                    else {
                        this.logger.error(`Error deleting MUX asset ${video.muxAssetId}:`, muxError.message);
                    }
                }
            }
            await this.prisma.video.delete({
                where: { id },
            });
            this.logger.log(`Successfully deleted video: ${id}`);
        }
        catch (error) {
            this.logger.error('Error removing video:', error);
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
    generatePlaybackUrls(video) {
        if (video.provider === 'INTERNAL') {
            const appUrl = this.configService.get('APP_URL') || 'http://localhost:4000';
            const hlsUrl = `${appUrl}/api/videos/stream/${video.id}/master.m3u8`;
            const dashUrl = hlsUrl.replace('.m3u8', '.mpd');
            return {
                hls: hlsUrl,
                dash: dashUrl,
            };
        }
        return {
            hls: video.playbackUrl || null,
            dash: video.playbackUrl ? video.playbackUrl.replace('.m3u8', '.mpd') : null,
        };
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
            useOriginalProgressBar: video.useOriginalProgressBar === true ? true : false,
            progressBarColor: video.progressBarColor || '#3B82F6',
            progressEasing: video.progressEasing || 0.25,
            playButtonColor: video.playButtonColor || '#FFFFFF',
            playButtonSize: video.playButtonSize || 60,
            playButtonBgColor: video.playButtonBgColor || 'rgba(0,0,0,0.6)',
            soundControlText: video.soundControlText || '',
            soundControlColor: video.soundControlColor || '#FFFFFF',
            soundControlOpacity: video.soundControlOpacity ?? 0.8,
            soundControlSize: video.soundControlSize ?? 64,
            showSoundControl: video.showSoundControl === true,
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
            playback: this.generatePlaybackUrls(video),
            ctaText: video.ctaText,
            ctaButtonText: video.ctaButtonText,
            ctaLink: video.ctaLink,
            ctaStartTime: video.ctaStartTime,
            ctaEndTime: video.ctaEndTime,
        };
        return {
            success: true,
            result: embedVideo,
        };
    }
    async handleMuxAssetReady(payload) {
        const { data } = payload;
        this.logger.log(`Handling MUX asset ready event for asset ID: ${data.id}`);
        this.logger.log(`MUX asset data: ${JSON.stringify(data, null, 2)}`);
        const video = await this.prisma.video.findFirst({
            where: { muxAssetId: data.id },
        });
        if (!this.isVideo(video)) {
            this.logger.warn(`Video not found for MUX Asset ID: ${data.id}`);
            const pendingVideo = await this.prisma.pendingVideo.findFirst({
                where: { muxAssetId: data.id },
            });
            if (pendingVideo) {
                this.logger.log(`Found pending video with MUX Asset ID: ${data.id}`);
                const playbackId = data.playback_ids && data.playback_ids.length > 0
                    ? data.playback_ids[0].id
                    : null;
                const playbackUrl = playbackId
                    ? `https://stream.mux.com/${playbackId}.m3u8`
                    : null;
                const thumbnailUrl = playbackId
                    ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
                    : null;
                this.logger.log(`Creating a new video for MUX Asset ID: ${data.id}`);
                try {
                    const newVideo = await this.prisma.video.create({
                        data: {
                            name: pendingVideo.name,
                            description: pendingVideo.description,
                            organizationId: pendingVideo.organizationId,
                            muxUploadId: pendingVideo.muxUploadId,
                            muxAssetId: data.id,
                            muxPlaybackId: playbackId,
                            playbackUrl: playbackUrl,
                            thumbnailUrl: thumbnailUrl,
                            tags: pendingVideo.tags,
                            visibility: pendingVideo.visibility,
                            status: client_1.VideoStatus.READY,
                            duration: Math.round(data.duration || 0),
                            showProgressBar: true,
                            showTitle: true,
                            showPlaybackControls: true,
                            autoPlay: false,
                            muted: false,
                            loop: false,
                            useOriginalProgressBar: false,
                            progressBarColor: "#3B82F6",
                            progressEasing: 0.25,
                            playButtonColor: "#FFFFFF",
                            playButtonSize: 60,
                            playButtonBgColor: "rgba(0,0,0,0.6)",
                            showVideoTitle: true,
                            showUploadDate: true,
                            showMetadata: true,
                            allowFullscreen: true,
                            responsive: true,
                            showBranding: true,
                            showTechnicalInfo: false,
                        },
                    });
                    this.logger.log(`Created new video with ID: ${newVideo.id}`);
                    await this.prisma.pendingVideo.delete({
                        where: { id: pendingVideo.id },
                    });
                    this.logger.log(`Deleted pending video ${pendingVideo.id}`);
                }
                catch (error) {
                    this.logger.error(`Error creating video from pending video: ${error.message}`);
                }
            }
            return;
        }
        const playbackId = data.playback_ids && data.playback_ids.length > 0
            ? data.playback_ids[0].id
            : null;
        const playbackUrl = playbackId
            ? `https://stream.mux.com/${playbackId}.m3u8`
            : null;
        const thumbnailUrl = playbackId
            ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
            : null;
        const updatedVideo = await this.prisma.video.update({
            where: { id: video.id },
            data: {
                status: client_1.VideoStatus.READY,
                thumbnailUrl: thumbnailUrl || data.thumbnail_url || null,
                playbackUrl: playbackUrl || data.playback_url || null,
                muxPlaybackId: playbackId,
                duration: Math.round(data.duration || 0),
            },
        });
        if (!this.isVideo(updatedVideo)) {
            this.logger.error('Failed to update video');
            return;
        }
        this.logger.log(`Video ${updatedVideo.id} is now ready for playback with URL: ${updatedVideo.playbackUrl || 'N/A'}`);
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
            const provider = await this.providerFactory.getProvider(dto.organizationId);
            this.logger.log(`Using ${provider.name} provider for organization: ${dto.organizationId}`);
            const result = await provider.createUploadUrl({
                organizationId: dto.organizationId,
                name: dto.name || 'Untitled',
                description: dto.description || '',
                visibility: dto.requireSignedURLs ? client_1.Visibility.PRIVATE : client_1.Visibility.PUBLIC,
                tags: [],
                requireSignedURLs: dto.requireSignedURLs,
                maxDurationSeconds: dto.maxDurationSeconds,
            });
            return {
                success: true,
                status: 200,
                message: 'Upload URL created successfully',
                data: {
                    success: result.success,
                    uploadURL: result.uploadURL,
                    uid: result.uid,
                },
            };
        }
        catch (error) {
            this.logger.error(`Error getting upload URL: ${error.message}`, error.stack);
            if (error instanceof common_1.BadRequestException || error instanceof common_1.InternalServerErrorException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to get upload URL: ${error.message}`);
        }
    }
    async multipartInit(dto) {
        if (!dto.organizationId)
            throw new common_1.BadRequestException('Organization ID is required');
        const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
        if (!org)
            throw new common_1.BadRequestException('Organization not found');
        const id = (0, crypto_1.randomUUID)();
        const assetKey = `org/${dto.organizationId}/video/${id}`;
        const sourceKey = `${assetKey}/uploads/input.mp4`;
        await this.prisma.pendingVideo.create({
            data: {
                id,
                name: dto.name || 'Untitled',
                description: dto.description || '',
                organizationId: dto.organizationId,
                status: client_1.VideoStatus.PROCESSING,
                tags: [],
                visibility: client_1.Visibility.PUBLIC,
            },
        });
        const { uploadId } = await this.r2.createMultipartUpload(sourceKey, dto.contentType || 'video/mp4');
        return { success: true, data: { uid: id, key: sourceKey, uploadId } };
    }
    async multipartPartUrl(dto) {
        if (!dto.key || !dto.uploadId || !dto.partNumber)
            throw new common_1.BadRequestException('Missing fields');
        const url = await this.r2.getPresignedUploadPartUrl(dto.key, dto.uploadId, dto.partNumber);
        return { success: true, data: { url } };
    }
    async multipartComplete(dto) {
        if (!dto.key || !dto.uploadId || !dto.parts?.length)
            throw new common_1.BadRequestException('Missing fields');
        const parts = dto.parts.map(p => ({ PartNumber: p.partNumber, ETag: p.eTag }));
        await this.r2.completeMultipartUpload(dto.key, dto.uploadId, parts);
        const provider = await this.providerFactory.getProvider(dto.organizationId);
        const assetKey = dto.key.split('/uploads/')[0];
        await provider.startTranscode({
            videoId: dto.videoId,
            organizationId: dto.organizationId,
            assetKey,
            sourcePath: dto.key,
        });
        return { success: true };
    }
    async multipartAbort(dto) {
        if (!dto.key || !dto.uploadId)
            throw new common_1.BadRequestException('Missing fields');
        await this.r2.abortMultipartUpload(dto.key, dto.uploadId);
        return { success: true };
    }
    async handleTranscodeCallback(dto) {
        try {
            if (!dto?.videoId || !dto?.assetKey || !dto?.hlsMasterPath) {
                throw new common_1.BadRequestException('Missing required fields');
            }
            const normalizedHlsPath = typeof dto.hlsMasterPath === 'string' && dto.hlsMasterPath.includes('/hls/')
                ? dto.hlsMasterPath.substring(dto.hlsMasterPath.indexOf('hls/'))
                : dto.hlsMasterPath;
            const normalizedAssetKey = typeof dto.hlsMasterPath === 'string' && dto.hlsMasterPath.includes('/hls/')
                ? dto.hlsMasterPath.substring(0, dto.hlsMasterPath.indexOf('/hls/'))
                : dto.assetKey;
            let video = await this.prisma.video.findUnique({ where: { id: dto.videoId } });
            if (!video) {
                const pending = await this.prisma.pendingVideo.findUnique({ where: { id: dto.videoId } });
                if (!pending) {
                    throw new common_1.NotFoundException('Video not found');
                }
                video = await this.prisma.video.create({
                    data: {
                        id: pending.id,
                        name: pending.name,
                        description: pending.description || '',
                        organizationId: pending.organizationId,
                        tags: pending.tags,
                        visibility: pending.visibility,
                        status: client_1.VideoStatus.PROCESSING,
                    },
                });
                await this.prisma.pendingVideo.delete({ where: { id: pending.id } }).catch(() => undefined);
            }
            const updated = await this.prisma.video.update({
                where: { id: video.id },
                data: {
                    provider: 'INTERNAL',
                    assetKey: normalizedAssetKey,
                    playbackHlsPath: normalizedHlsPath,
                    thumbnailPath: dto.thumbnailPath || video.thumbnailUrl || null,
                    duration: dto.durationSeconds ?? video.duration,
                    status: client_1.VideoStatus.READY,
                },
            });
            return { success: true, videoId: updated.id };
        }
        catch (e) {
            this.logger.error('handleTranscodeCallback error', e);
            throw e;
        }
    }
    async serveHlsFile(videoId, filename, res) {
        try {
            const video = await this.prisma.video.findUnique({ where: { id: videoId } });
            if (!video || video.provider !== 'INTERNAL' || !video.assetKey) {
                this.logger.error(`Video not found or not available: ${videoId}, provider: ${video?.provider}, assetKey: ${video?.assetKey}`);
                throw new common_1.NotFoundException('Video not found or not available for streaming');
            }
            const hlsPath = `${video.assetKey}/hls/${filename}`;
            this.logger.log(`Attempting to serve HLS file: ${hlsPath}`);
            const { stream } = await this.r2.getObjectStream(hlsPath);
            let contentType = 'application/octet-stream';
            if (filename.endsWith('.m3u8')) {
                contentType = 'application/vnd.apple.mpegurl';
            }
            else if (filename.endsWith('.ts')) {
                contentType = 'video/mp2t';
            }
            res.set({
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*'
            });
            stream.pipe(res);
        }
        catch (error) {
            this.logger.error(`Error serving HLS file: ${error.message}`);
            throw new common_1.NotFoundException('HLS file not found');
        }
    }
    async serveThumbnail(videoId, res) {
        try {
            const video = await this.prisma.video.findUnique({ where: { id: videoId } });
            if (!video || video.provider !== 'INTERNAL' || !video.assetKey || !video.thumbnailPath) {
                throw new common_1.NotFoundException('Thumbnail not found');
            }
            const thumbnailPath = `${video.assetKey}/${video.thumbnailPath}`;
            const { stream } = await this.r2.getObjectStream(thumbnailPath);
            res.set({
                'Content-Type': 'image/jpeg',
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
            });
            stream.pipe(res);
        }
        catch (error) {
            this.logger.error(`Error serving thumbnail: ${error.message}`);
            throw new common_1.NotFoundException('Thumbnail not found');
        }
    }
    async serveThumbFile(videoId, filename, res) {
        try {
            const video = await this.prisma.video.findUnique({ where: { id: videoId } });
            if (!video || video.provider !== 'INTERNAL' || !video.assetKey) {
                throw new common_1.NotFoundException('Video not found or not available for streaming');
            }
            const thumbPath = `${video.assetKey}/thumbs/${filename}`;
            const { stream } = await this.r2.getObjectStream(thumbPath);
            let contentType = 'application/octet-stream';
            if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
                contentType = 'image/jpeg';
            }
            else if (filename.endsWith('.vtt')) {
                contentType = 'text/vtt';
            }
            else if (filename.endsWith('.png')) {
                contentType = 'image/png';
            }
            res.set({
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=86400',
                'Access-Control-Allow-Origin': '*'
            });
            stream.pipe(res);
        }
        catch (error) {
            this.logger.error(`Error serving thumb file: ${error.message}`);
            throw new common_1.NotFoundException('Thumbnail file not found');
        }
    }
    async generatePlaybackToken(videoId, organizationId, expiryMinutes) {
        const video = await this.prisma.video.findUnique({ where: { id: videoId } });
        if (!video) {
            throw new common_1.NotFoundException('Video not found');
        }
        if (video.organizationId !== organizationId) {
            throw new common_1.ForbiddenException('Access denied to this video');
        }
        if (video.provider !== 'INTERNAL') {
            throw new common_1.BadRequestException('Signed streaming is only available for internal videos');
        }
        const token = this.jwtPlayback.generatePlaybackToken(videoId, organizationId, expiryMinutes);
        return {
            success: true,
            token,
            expiresIn: (expiryMinutes || 5) * 60,
            videoId,
        };
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
                    useOriginalProgressBar: video.useOriginalProgressBar === true ? true : false,
                    progressBarColor: video.progressBarColor || '#3B82F6',
                    progressEasing: video.progressEasing || 0.25,
                    playButtonColor: video.playButtonColor || '#FFFFFF',
                    playButtonSize: video.playButtonSize || 60,
                    playButtonBgColor: video.playButtonBgColor || 'rgba(0,0,0,0.6)',
                    soundControlText: video.soundControlText || '',
                    soundControlColor: video.soundControlColor || '#FFFFFF',
                    soundControlOpacity: video.soundControlOpacity ?? 0.8,
                    soundControlSize: video.soundControlSize ?? 64,
                    showSoundControl: video.showSoundControl === true,
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
                let hlsUrl = '';
                let thumbnailUrl = '';
                if (video.provider === 'INTERNAL') {
                    const baseUrl = `${this.configService.get('APP_URL') || 'http://localhost:4000'}/api/videos`;
                    hlsUrl = `${baseUrl}/stream/${video.id}/master.m3u8`;
                    if (video.thumbnailPath) {
                        thumbnailUrl = `${baseUrl}/thumb/${video.id}/0001.jpg`;
                    }
                }
                else {
                    hlsUrl = video.playbackUrl || '';
                    thumbnailUrl = video.thumbnailUrl || '';
                }
                const dashUrl = '';
                return {
                    success: true,
                    video: {
                        uid: video.id,
                        readyToStream: video.status === client_1.VideoStatus.READY && !!hlsUrl,
                        status: {
                            state: this.mapVideoStatus(video.status)
                        },
                        thumbnail: thumbnailUrl,
                        preview: thumbnailUrl,
                        playback: {
                            hls: hlsUrl,
                            dash: dashUrl,
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
                                    const { tokenId, tokenSecret } = await this.muxService.getMuxCredentials(pendingVideo.organizationId);
                                    const muxClient = new mux_node_1.default({
                                        tokenId,
                                        tokenSecret,
                                    });
                                    const asset = await muxClient.video.assets.retrieve(uploadStatus.assetId);
                                    const playbackId = asset?.playback_ids && asset.playback_ids.length > 0
                                        ? asset.playback_ids[0].id
                                        : null;
                                    const playbackUrl = playbackId
                                        ? `https://stream.mux.com/${playbackId}.m3u8`
                                        : null;
                                    const thumbnailUrl = playbackId
                                        ? `https://image.mux.com/${playbackId}/thumbnail.jpg`
                                        : null;
                                    const newVideo = await this.prisma.video.create({
                                        data: {
                                            name: pendingVideo.name,
                                            description: pendingVideo.description,
                                            organizationId: pendingVideo.organizationId,
                                            muxUploadId: pendingVideo.muxUploadId,
                                            muxAssetId: uploadStatus.assetId,
                                            muxPlaybackId: playbackId,
                                            playbackUrl: playbackUrl,
                                            thumbnailUrl: thumbnailUrl,
                                            tags: pendingVideo.tags,
                                            visibility: pendingVideo.visibility,
                                            status: client_1.VideoStatus.READY,
                                            duration: Math.round(asset?.duration || 0),
                                            showProgressBar: true,
                                            showTitle: true,
                                            showPlaybackControls: true,
                                            autoPlay: false,
                                            muted: false,
                                            loop: false,
                                            useOriginalProgressBar: false,
                                            progressBarColor: "#3B82F6",
                                            progressEasing: 0.25,
                                            playButtonColor: "#FFFFFF",
                                            playButtonSize: 60,
                                            playButtonBgColor: "rgba(0,0,0,0.6)",
                                            showVideoTitle: true,
                                            showUploadDate: true,
                                            showMetadata: true,
                                            allowFullscreen: true,
                                            responsive: true,
                                            showBranding: true,
                                            showTechnicalInfo: false,
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
            useOriginalProgressBar: video.useOriginalProgressBar === true ? true : false,
            progressBarColor: video.progressBarColor || '#3B82F6',
            progressEasing: video.progressEasing || 0.25,
            playButtonColor: video.playButtonColor || '#FFFFFF',
            playButtonSize: video.playButtonSize || 60,
            playButtonBgColor: video.playButtonBgColor || 'rgba(0,0,0,0.6)',
            soundControlText: video.soundControlText || '',
            soundControlColor: video.soundControlColor || '#FFFFFF',
            soundControlOpacity: video.soundControlOpacity ?? 0.8,
            soundControlSize: video.soundControlSize ?? 64,
            showSoundControl: video.showSoundControl === true,
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
        let hlsUrl = '';
        let thumbnailUrl = video.thumbnailUrl || '';
        if (video.provider === 'INTERNAL') {
            const baseUrl = `${this.configService.get('APP_URL') || 'http://localhost:4000'}/api/videos`;
            hlsUrl = `${baseUrl}/stream/${video.id}/master.m3u8`;
            if (video.thumbnailPath) {
                thumbnailUrl = `${baseUrl}/thumb/${video.id}/0001.jpg`;
            }
        }
        else {
            hlsUrl = video.playbackUrl || '';
        }
        return {
            uid: video.id,
            thumbnail: thumbnailUrl,
            readyToStream: video.status === client_1.VideoStatus.READY && !!hlsUrl,
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
            preview: thumbnailUrl,
            playback: {
                hls: hlsUrl,
                dash: hlsUrl ? hlsUrl.replace('.m3u8', '.mpd') : '',
            },
            ctaText: video.ctaText,
            ctaButtonText: video.ctaButtonText,
            ctaLink: video.ctaLink,
            ctaStartTime: video.ctaStartTime,
            ctaEndTime: video.ctaEndTime,
        };
    }
    async serveSignedMasterPlaylist(videoId, token, res, req) {
        try {
            const payload = this.jwtPlayback.verifyPlaybackToken(token);
            if (payload.videoId !== videoId) {
                throw new common_1.UnauthorizedException('Token is not valid for this video');
            }
            const video = await this.prisma.video.findUnique({ where: { id: videoId } });
            if (!video || video.provider !== 'INTERNAL' || !video.assetKey || !video.playbackHlsPath) {
                throw new common_1.NotFoundException('Video not available for streaming');
            }
            const masterPath = `${video.assetKey}/${video.playbackHlsPath}`;
            const { stream } = await this.r2.getObjectStream(masterPath);
            const chunks = [];
            stream.on('data', (chunk) => chunks.push(chunk));
            await new Promise((resolve, reject) => {
                stream.on('end', resolve);
                stream.on('error', reject);
            });
            let content = Buffer.concat(chunks).toString('utf-8');
            const baseUrl = `${req.protocol}://${req.get('host')}/api/videos/stream/${videoId}/seg`;
            content = content.replace(/^(variant_\d+p\.m3u8)$/gm, `${baseUrl}/$1?token=${token}`);
            res.set({
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Cache-Control': 'no-cache',
                'Access-Control-Allow-Origin': '*',
                'ETag': `"${video.id}-${payload.iat}"`,
            });
            res.send(content);
        }
        catch (error) {
            this.logger.error(`Error serving signed master playlist: ${error.message}`);
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.NotFoundException('Master playlist not found');
        }
    }
    async serveSignedSegment(videoId, filename, token, res, req) {
        try {
            const payload = this.jwtPlayback.verifyPlaybackToken(token);
            if (payload.videoId !== videoId) {
                throw new common_1.UnauthorizedException('Token is not valid for this video');
            }
            const video = await this.prisma.video.findUnique({ where: { id: videoId } });
            if (!video || video.provider !== 'INTERNAL' || !video.assetKey) {
                throw new common_1.NotFoundException('Video not available for streaming');
            }
            let hlsPath;
            let contentType;
            if (filename.endsWith('.m3u8')) {
                hlsPath = `${video.assetKey}/hls/${filename}`;
                contentType = 'application/vnd.apple.mpegurl';
                const { stream } = await this.r2.getObjectStream(hlsPath);
                const chunks = [];
                stream.on('data', (chunk) => chunks.push(chunk));
                await new Promise((resolve, reject) => {
                    stream.on('end', resolve);
                    stream.on('error', reject);
                });
                let content = Buffer.concat(chunks).toString('utf-8');
                const baseUrl = `${req.protocol}://${req.get('host')}/api/videos/stream/${videoId}/seg`;
                content = content.replace(/^(segment_\d+p_\d+\.ts)$/gm, `${baseUrl}/$1?token=${token}`);
                res.set({
                    'Content-Type': contentType,
                    'Cache-Control': 'no-cache',
                    'Access-Control-Allow-Origin': '*',
                    'ETag': `"${filename}-${payload.iat}"`,
                });
                res.send(content);
                return;
            }
            else if (filename.endsWith('.ts')) {
                hlsPath = `${video.assetKey}/hls/${filename}`;
                contentType = 'video/mp2t';
            }
            else {
                throw new common_1.NotFoundException('Invalid file type');
            }
            const { stream } = await this.r2.getObjectStream(hlsPath);
            res.set({
                'Content-Type': contentType,
                'Cache-Control': 'public, max-age=3600',
                'Access-Control-Allow-Origin': '*',
                'Accept-Ranges': 'bytes',
                'ETag': `"${filename}-${video.id}"`,
            });
            stream.pipe(res);
        }
        catch (error) {
            this.logger.error(`Error serving signed segment: ${error.message}`);
            if (error instanceof common_1.UnauthorizedException) {
                throw error;
            }
            throw new common_1.NotFoundException('Segment not found');
        }
    }
    async serveSignedThumbnail(videoId, filename, token, res, req) {
        try {
            const video = await this.prisma.video.findUnique({ where: { id: videoId } });
            if (!video || video.provider !== 'INTERNAL' || !video.assetKey) {
                throw new common_1.NotFoundException('Video not available for streaming');
            }
            if (token) {
                try {
                    const payload = this.jwtPlayback.verifyPlaybackToken(token);
                    if (payload.videoId !== videoId) {
                        console.log(`Token mismatch for thumbnail: expected ${videoId}, got ${payload.videoId}`);
                    }
                }
                catch (tokenError) {
                    console.log(`Invalid token for thumbnail: ${tokenError.message}`);
                }
            }
            const thumbPath = `${video.assetKey}/thumbs/${filename}`;
            try {
                const { stream } = await this.r2.getObjectStream(thumbPath);
                let contentType = 'application/octet-stream';
                if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
                    contentType = 'image/jpeg';
                }
                else if (filename.endsWith('.vtt')) {
                    contentType = 'text/vtt';
                }
                else if (filename.endsWith('.png')) {
                    contentType = 'image/png';
                }
                res.set({
                    'Content-Type': contentType,
                    'Cache-Control': 'public, max-age=86400',
                    'Access-Control-Allow-Origin': '*',
                    'Accept-Ranges': 'bytes',
                    'ETag': `"${filename}-${video.id}"`,
                });
                stream.pipe(res);
            }
            catch (r2Error) {
                if (r2Error.message.includes('The specified key does not exist')) {
                    console.log(`Thumbnail not found in R2: ${thumbPath}, serving placeholder`);
                    const placeholderSvg = `<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1f2937"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">No Thumbnail</text>
          </svg>`;
                    res.set({
                        'Content-Type': 'image/svg+xml',
                        'Cache-Control': 'public, max-age=3600',
                        'Access-Control-Allow-Origin': '*',
                    });
                    res.send(placeholderSvg);
                }
                else {
                    throw r2Error;
                }
            }
        }
        catch (error) {
            this.logger.error(`Error serving signed thumbnail: ${error.message}`);
            throw new common_1.NotFoundException('Thumbnail not found');
        }
    }
};
exports.VideosService = VideosService;
exports.VideosService = VideosService = VideosService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        mux_service_1.MuxService,
        r2_service_1.R2Service,
        transcode_queue_1.TranscodeQueue,
        jwt_playback_service_1.JwtPlaybackService,
        video_provider_factory_1.VideoProviderFactory])
], VideosService);
//# sourceMappingURL=videos.service.js.map