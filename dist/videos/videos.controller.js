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
var VideosController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosController = void 0;
const common_1 = require("@nestjs/common");
const videos_service_1 = require("./videos.service");
const create_video_dto_1 = require("./dto/create-video.dto");
const update_video_dto_1 = require("./dto/update-video.dto");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const get_upload_url_dto_1 = require("./dto/get-upload-url.dto");
const update_org_cloudflare_dto_1 = require("./dto/update-org-cloudflare.dto");
const client_1 = require("@prisma/client");
const common_2 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const mux_webhook_controller_1 = require("../providers/mux/mux-webhook.controller");
let VideosController = VideosController_1 = class VideosController {
    videosService;
    prismaService;
    muxWebhookController;
    logger = new common_2.Logger(VideosController_1.name);
    constructor(videosService, prismaService, muxWebhookController) {
        this.videosService = videosService;
        this.prismaService = prismaService;
        this.muxWebhookController = muxWebhookController;
    }
    async findAllOrganizationVideos(req) {
        const organizationId = req['organization'].id;
        return this.videosService.findAll(organizationId);
    }
    async testCloudflareConnection() {
        try {
            console.log('Testing Cloudflare Stream API connection...');
            const response = await this.videosService.testCloudflareConnection();
            console.log('Cloudflare Stream API connection test successful!');
            return response;
        }
        catch (error) {
            console.error('Cloudflare Stream API connection test failed:', error);
            throw new common_1.BadRequestException(`Failed to connect to Cloudflare Stream API: ${error.message}`);
        }
    }
    async findOrgVideo(id, req) {
        const organizationId = req['organization'].id;
        return this.videosService.findOne(id, organizationId);
    }
    async createOrgUploadUrl(createVideoDto, req) {
        const organizationId = req['organization'].id;
        return this.videosService.createDirectUploadUrl(createVideoDto, organizationId);
    }
    async updateOrgVideo(id, updateVideoDto, req) {
        const organizationId = req['organization'].id;
        return this.videosService.update(id, updateVideoDto, organizationId);
    }
    async removeOrgVideo(id, req) {
        const organizationId = req['organization'].id;
        await this.videosService.remove(id, organizationId);
    }
    async syncOrgVideoStatus(id, req) {
        const organizationId = req['organization'].id;
        return this.videosService.syncVideoStatus(id, organizationId);
    }
    async webhook(payload, signature) {
        try {
            await this.videosService.handleMuxWebhook(payload, signature);
            return { success: true };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to process webhook');
        }
    }
    async getCloudflareUploadUrl(dto, req) {
        const organizationId = req['organization']?.id || dto.organizationId;
        if (!organizationId) {
            throw new common_1.BadRequestException('Organization ID is required');
        }
        return this.videosService.getUploadUrl({ ...dto, organizationId });
    }
    async getVideoStatus(uid) {
        return this.videosService.getVideoStatus(uid);
    }
    async getAllCloudflareVideos() {
        return this.videosService.getAllVideos();
    }
    async getVideoByUid(uid) {
        return this.videosService.getVideoByUid(uid);
    }
    async testOrgCloudflare(req) {
        const organizationId = req['organization'].id;
        return this.videosService.testCloudflareConnection(organizationId);
    }
    async updateOrgCloudflareSettings(updateOrgCloudflareDto, req) {
        const organizationId = req['organization'].id;
        return this.videosService.updateOrgCloudflareSettings(updateOrgCloudflareDto, organizationId);
    }
    async getOrgCloudflareSettings(req) {
        const organizationId = req['organization'].id;
        return this.videosService.getOrgCloudflareSettings(organizationId);
    }
    async getVideoForEmbed(uid, req) {
        const organizationId = req['organization']?.id;
        return this.videosService.getVideoForEmbed(uid, organizationId);
    }
    async testUpload(dto) {
        this.logger.log(`Received test upload request with data: ${JSON.stringify(dto)}`);
        try {
            if (!dto.organizationId) {
                throw new common_1.BadRequestException('Organization ID is required');
            }
            const result = await this.videosService.createDirectUploadUrl({
                name: dto.name || 'Test Upload',
                description: dto.description || 'Created by test endpoint',
                visibility: dto.requireSignedURLs ? client_1.Visibility.PRIVATE : client_1.Visibility.PUBLIC,
                tags: [],
            }, dto.organizationId);
            this.logger.log(`Test upload created successfully. PendingVideo ID: ${result.videoId}`);
            const pendingVideo = await this.prismaService.pendingVideo.findUnique({
                where: { id: result.videoId },
            });
            if (!pendingVideo) {
                this.logger.error(`Failed to find PendingVideo with ID: ${result.videoId}`);
                throw new common_1.InternalServerErrorException('Failed to create pending video');
            }
            this.logger.log(`PendingVideo verified in database: ${JSON.stringify(pendingVideo)}`);
            return {
                success: true,
                pendingVideoId: result.videoId,
                uploadUrl: result.uploadUrl,
                message: 'Test upload created successfully',
            };
        }
        catch (error) {
            this.logger.error(`Error in test upload: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Test upload failed: ${error.message}`);
        }
    }
    async testPendingVideo(body) {
        try {
            this.logger.log(`Received request to create test pending video: ${JSON.stringify(body)}`);
            if (!body.organizationId) {
                throw new common_1.BadRequestException('Organization ID is required');
            }
            const organization = await this.prismaService.organization.findUnique({
                where: { id: body.organizationId },
            });
            if (!organization) {
                this.logger.error(`Organization with ID ${body.organizationId} not found`);
                throw new common_1.BadRequestException(`Organization not found`);
            }
            const id = body.id || (0, crypto_1.randomUUID)();
            const name = body.name || 'Test Video';
            const muxUploadId = `test-upload-${Date.now()}`;
            try {
                this.logger.log(`Creating pending video with ID: ${id}`);
                const pendingVideo = await this.prismaService.pendingVideo.create({
                    data: {
                        id,
                        name,
                        description: '',
                        organizationId: body.organizationId,
                        muxUploadId,
                        muxAssetId: null,
                        tags: [],
                        visibility: 'PUBLIC',
                        status: 'READY',
                    },
                });
                this.logger.log(`Created pending video: ${pendingVideo.id}`);
                try {
                    this.logger.log(`Simulating webhook for test video ${pendingVideo.id}`);
                    const webhookPayload = {
                        type: 'video.asset.ready',
                        data: {
                            id: `test-asset-${Date.now()}`,
                            upload_id: muxUploadId,
                            playback_ids: [{ id: `test-playback-${Date.now()}` }],
                            passthrough: JSON.stringify({
                                organizationId: body.organizationId,
                                name: name,
                                id: id
                            }),
                        },
                    };
                    await this.muxWebhookController.handleSimulatedWebhook(webhookPayload);
                    this.logger.log(`Webhook simulation completed for test video ${pendingVideo.id}`);
                }
                catch (webhookError) {
                    this.logger.error(`Error simulating webhook: ${webhookError.message}`, webhookError.stack);
                }
                return {
                    success: true,
                    pendingVideoId: pendingVideo.id,
                    message: 'Test pending video created successfully',
                };
            }
            catch (error) {
                this.logger.error(`Error creating test pending video: ${error.message}`, error.stack);
                throw new common_1.BadRequestException(`Failed to create test pending video: ${error.message}`);
            }
        }
        catch (error) {
            this.logger.error(`Error in test-pending-video endpoint: ${error.message}`, error.stack);
            throw error;
        }
    }
    async testCreateVideo(body) {
        try {
            this.logger.log(`Received request to manually create video: ${JSON.stringify(body)}`);
            if (!body.organizationId) {
                throw new common_1.BadRequestException('Organization ID is required');
            }
            const organization = await this.prismaService.organization.findUnique({
                where: { id: body.organizationId },
            });
            if (!organization) {
                this.logger.error(`Organization with ID ${body.organizationId} not found`);
                throw new common_1.BadRequestException(`Organization not found`);
            }
            try {
                const videoData = {
                    id: body.id || (0, crypto_1.randomUUID)(),
                    name: body.name || 'Test Video',
                    description: body.description || '',
                    organizationId: body.organizationId,
                    status: body.status || 'READY',
                    muxAssetId: body.muxAssetId || `test-asset-${Date.now()}`,
                    muxPlaybackId: body.muxPlaybackId || `test-playback-${Date.now()}`,
                    muxUploadId: body.muxUploadId || `test-upload-${Date.now()}`,
                    thumbnailUrl: body.thumbnailUrl || `https://image.mux.com/${body.muxPlaybackId || `test-playback-${Date.now()}`}/thumbnail.jpg`,
                    playbackUrl: body.playbackUrl || `https://stream.mux.com/${body.muxPlaybackId || `test-playback-${Date.now()}`}.m3u8`,
                    tags: body.tags || [],
                    visibility: body.visibility || 'PUBLIC',
                    duration: body.duration || 0,
                };
                this.logger.log(`Creating video with data: ${JSON.stringify(videoData)}`);
                if (body.id) {
                    try {
                        await this.prismaService.pendingVideo.delete({
                            where: { id: body.id },
                        });
                        this.logger.log(`Deleted existing PendingVideo with ID ${body.id}`);
                    }
                    catch (error) {
                        this.logger.log(`No existing PendingVideo with ID ${body.id} found to delete`);
                    }
                }
                const video = await this.prismaService.video.create({
                    data: videoData,
                });
                this.logger.log(`Created video with ID: ${video.id}`);
                return {
                    success: true,
                    message: 'Video created successfully',
                    video,
                };
            }
            catch (error) {
                this.logger.error(`Error creating video: ${error.message}`, error.stack);
                throw new common_1.BadRequestException(`Failed to create video: ${error.message}`);
            }
        }
        catch (error) {
            this.logger.error(`Error in test-create-video endpoint: ${error.message}`, error.stack);
            throw error;
        }
    }
};
exports.VideosController = VideosController;
__decorate([
    (0, common_1.Get)('organization'),
    (0, swagger_1.ApiOperation)({ summary: 'Get all videos for an organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return all videos for the authenticated organization.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "findAllOrganizationVideos", null);
__decorate([
    (0, common_1.Get)('test-cloudflare-connection'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Test the connection to Cloudflare Stream API' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the Cloudflare Stream API response.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "testCloudflareConnection", null);
__decorate([
    (0, common_1.Get)('organization/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a video by ID from the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Return the video with the specified ID.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "findOrgVideo", null);
__decorate([
    (0, common_1.Post)('organization/upload-url'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a direct upload URL for Cloudflare Stream and save to organization' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Returns an upload URL and video ID.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_video_dto_1.CreateVideoDto, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "createOrgUploadUrl", null);
__decorate([
    (0, common_1.Put)('organization/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Update a video in the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'The video has been successfully updated.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, update_video_dto_1.UpdateVideoDto, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "updateOrgVideo", null);
__decorate([
    (0, common_1.Delete)('organization/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Delete a video from the organization' }),
    (0, swagger_1.ApiResponse)({ status: 204, description: 'The video has been successfully deleted.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    (0, common_1.HttpCode)(204),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "removeOrgVideo", null);
__decorate([
    (0, common_1.Post)('organization/:id/sync'),
    (0, swagger_1.ApiOperation)({ summary: 'Sync video status with Cloudflare for organization video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Video status has been synced.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "syncOrgVideoStatus", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('webhook'),
    (0, swagger_1.ApiOperation)({ summary: 'Webhook endpoint for Mux Stream events' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook processed successfully.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Headers)('mux-signature')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "webhook", null);
__decorate([
    (0, common_1.Post)('get-upload-url'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a direct upload URL for MUX' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Returns an upload URL and video ID.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_upload_url_dto_1.GetUploadUrlDto, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getCloudflareUploadUrl", null);
__decorate([
    (0, common_1.Get)(':uid/status'),
    (0, swagger_1.ApiOperation)({ summary: 'Check the status of an uploaded video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the video status.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    (0, swagger_1.ApiParam)({ name: 'uid', description: 'The MUX upload ID' }),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('uid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getVideoStatus", null);
__decorate([
    (0, common_1.Get)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all videos from Cloudflare Stream' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns all videos.' }),
    (0, public_decorator_1.Public)(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getAllCloudflareVideos", null);
__decorate([
    (0, common_1.Get)(':uid'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a video by UID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the video with the specified UID.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    (0, swagger_1.ApiParam)({ name: 'uid', description: 'The Cloudflare Stream video UID' }),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('uid')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getVideoByUid", null);
__decorate([
    (0, common_1.Post)('organization/test-cloudflare'),
    (0, swagger_1.ApiOperation)({ summary: 'Test Cloudflare API connection for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Connection successful.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Connection failed.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "testOrgCloudflare", null);
__decorate([
    (0, common_1.Post)('organization/cloudflare-settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update Cloudflare settings for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Settings updated.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_org_cloudflare_dto_1.UpdateOrgCloudflareDto, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "updateOrgCloudflareSettings", null);
__decorate([
    (0, common_1.Get)('organization/cloudflare-settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get Cloudflare settings for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Settings retrieved.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getOrgCloudflareSettings", null);
__decorate([
    (0, common_1.Get)('embed/:uid'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get video details for embedding' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the video with embed information.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    (0, swagger_1.ApiParam)({ name: 'uid', description: 'The Cloudflare Stream video UID' }),
    __param(0, (0, common_1.Param)('uid')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Request]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getVideoForEmbed", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('test-upload'),
    (0, swagger_1.ApiOperation)({ summary: 'Test endpoint to create a pending video and test the upload flow' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Test upload created successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_upload_url_dto_1.GetUploadUrlDto]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "testUpload", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('test-pending-video'),
    (0, swagger_1.ApiOperation)({ summary: 'Test endpoint for creating a pending video' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Test pending video created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "testPendingVideo", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('test-create-video'),
    (0, swagger_1.ApiOperation)({ summary: 'Test endpoint for manually creating a video' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Test video created.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "testCreateVideo", null);
exports.VideosController = VideosController = VideosController_1 = __decorate([
    (0, swagger_1.ApiTags)('videos'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/videos'),
    __metadata("design:paramtypes", [videos_service_1.VideosService,
        prisma_service_1.PrismaService,
        mux_webhook_controller_1.MuxWebhookController])
], VideosController);
//# sourceMappingURL=videos.controller.js.map