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
const platform_express_1 = require("@nestjs/platform-express");
const videos_service_1 = require("./videos.service");
const create_video_dto_1 = require("./dto/create-video.dto");
const update_video_dto_1 = require("./dto/update-video.dto");
const swagger_1 = require("@nestjs/swagger");
const public_decorator_1 = require("../auth/decorators/public.decorator");
const organization_scoped_decorator_1 = require("../common/decorators/organization-scoped.decorator");
const get_upload_url_dto_1 = require("./dto/get-upload-url.dto");
const update_org_cloudflare_dto_1 = require("./dto/update-org-cloudflare.dto");
const client_1 = require("@prisma/client");
const common_2 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto_1 = require("crypto");
const mux_webhook_controller_1 = require("../providers/mux/mux-webhook.controller");
const upload_service_1 = require("./upload.service");
const transcode_callback_dto_1 = require("./dto/transcode-callback.dto");
const multipart_dto_1 = require("./dto/multipart.dto");
let VideosController = VideosController_1 = class VideosController {
    videosService;
    prismaService;
    muxWebhookController;
    uploadService;
    logger = new common_2.Logger(VideosController_1.name);
    constructor(videosService, prismaService, muxWebhookController, uploadService) {
        this.videosService = videosService;
        this.prismaService = prismaService;
        this.muxWebhookController = muxWebhookController;
        this.uploadService = uploadService;
    }
    async generateTestPlaybackToken(videoId, body) {
        const testOrganizationId = '00c38d90-c35d-4598-97e0-2a243505eba6';
        return this.videosService.generatePlaybackToken(videoId, testOrganizationId, body.expiryMinutes);
    }
    async serveHls(videoId, filename, res) {
        return this.videosService.serveHlsFile(videoId, filename, res);
    }
    async serveSignedMasterPlaylist(videoId, token, res, req) {
        if (!token) {
            try {
                const testOrganizationId = '00c38d90-c35d-4598-97e0-2a243505eba6';
                const tokenResult = await this.videosService.generatePlaybackToken(videoId, testOrganizationId, 60);
                token = tokenResult.token;
                console.log('Generated test token for video:', videoId);
            }
            catch (error) {
                console.error('Failed to generate test token:', error.message);
                throw error;
            }
        }
        return this.videosService.serveSignedMasterPlaylist(videoId, token, res, req);
    }
    async serveSignedSegment(videoId, filename, token, res, req) {
        if (!token) {
            try {
                const testOrganizationId = '00c38d90-c35d-4598-97e0-2a243505eba6';
                const tokenResult = await this.videosService.generatePlaybackToken(videoId, testOrganizationId, 60);
                token = tokenResult.token;
                console.log('Generated test token for segment:', filename);
            }
            catch (error) {
                console.error('Failed to generate test token for segment:', error.message);
                throw error;
            }
        }
        return this.videosService.serveSignedSegment(videoId, filename, token, res, req);
    }
    async serveSignedThumbnail(videoId, filename, token, res, req) {
        if (!token) {
            try {
                const testOrganizationId = '00c38d90-c35d-4598-97e0-2a243505eba6';
                const tokenResult = await this.videosService.generatePlaybackToken(videoId, testOrganizationId, 60);
                token = tokenResult.token;
                console.log('Generated test token for thumbnail:', filename);
            }
            catch (error) {
                console.error('Failed to generate test token for thumbnail:', error.message);
            }
        }
        return this.videosService.serveSignedThumbnail(videoId, filename, token, res, req);
    }
    async serveThumbnail(videoId, res) {
        return this.videosService.serveThumbnail(videoId, res);
    }
    async serveThumbFile(videoId, filename, res) {
        return this.videosService.serveThumbFile(videoId, filename, res);
    }
    async generatePlaybackToken(videoId, body, req) {
        return this.videosService.generatePlaybackToken(videoId, req.organizationId, body.expiryMinutes);
    }
    async findAllOrganizationVideos(req) {
        const organizationId = req.organization.id;
        const videos = await this.videosService.findAll(organizationId);
        const result = videos.map(video => this.videosService.mapVideoToDto(video));
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
    async getAvailableProviders(req) {
        const organizationId = req.organization.id;
        return this.videosService.getAvailableProviders(organizationId);
    }
    async testAllProviders(req) {
        const organizationId = req.organization.id;
        return this.videosService.testAllProviders(organizationId);
    }
    async findOrgVideo(id, req) {
        const organizationId = req.organization.id;
        return this.videosService.findOne(id, organizationId);
    }
    async createOrgUploadUrl(createVideoDto, req) {
        const organizationId = req.organization.id;
        return this.videosService.createDirectUploadUrl(createVideoDto, organizationId);
    }
    async removeOrgVideo(id, req) {
        const organizationId = req.organization.id;
        await this.videosService.remove(id, organizationId);
    }
    async updateOrgVideo(id, updateVideoDto, req) {
        const organizationId = req.organization.id;
        return this.videosService.update(id, updateVideoDto, organizationId);
    }
    async syncOrgVideoStatus(id, req) {
        const organizationId = req.organization.id;
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
    async transcodeCallback(dto) {
        return this.videosService.handleTranscodeCallback(dto);
    }
    async getCloudflareUploadUrl(dto, req) {
        const organizationId = req['organization']?.id || dto.organizationId;
        if (!organizationId) {
            throw new common_1.BadRequestException('Organization ID is required');
        }
        return this.videosService.getUploadUrl({ ...dto, organizationId });
    }
    async multipartInit(dto, req) {
        const organizationId = req.organization?.id || dto.organizationId;
        return this.videosService.multipartInit({ ...dto, organizationId });
    }
    async multipartPartUrl(dto) {
        return this.videosService.multipartPartUrl(dto);
    }
    async multipartComplete(dto, req) {
        const organizationId = req.organization?.id || dto.organizationId;
        return this.videosService.multipartComplete({ ...dto, organizationId });
    }
    async multipartAbort(dto) {
        return this.videosService.multipartAbort(dto);
    }
    async getVideoStatus(uid) {
        return this.videosService.getVideoStatus(uid);
    }
    async getVideoStatusAlias(id) {
        return this.videosService.getVideoStatus(id);
    }
    async getAllCloudflareVideos() {
        return this.videosService.getAllVideos();
    }
    async getVideoForEmbed(uid, req, res) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', '*');
        res.header('Access-Control-Allow-Credentials', 'false');
        res.header('X-Frame-Options', 'ALLOWALL');
        res.header('Content-Security-Policy', 'frame-ancestors *;');
        res.header('X-Embed-API', 'true');
        res.header('X-Cross-Domain-Ready', 'true');
        const organizationId = req['organization']?.id;
        const result = await this.videosService.getVideoForEmbed(uid, organizationId);
        return res.json(result);
    }
    async testEmbedCors(req, res) {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', '*');
        res.header('Access-Control-Allow-Credentials', 'false');
        res.header('X-Frame-Options', 'ALLOWALL');
        res.header('Content-Security-Policy', 'frame-ancestors *;');
        res.header('X-Embed-Test', 'true');
        res.header('X-Cross-Domain-Ready', 'true');
        return res.json({
            success: true,
            message: 'CORS test successful',
            timestamp: new Date().toISOString(),
            origin: req.headers['origin'] || 'No origin',
            userAgent: req.headers['user-agent'] || 'No user agent',
            method: req.method,
            url: req.url
        });
    }
    async getVideoByUid(uid) {
        return this.videosService.getVideoByUid(uid);
    }
    async testOrgCloudflare(req) {
        const organizationId = req.organization.id;
        return this.videosService.testCloudflareConnection(organizationId);
    }
    async updateOrgCloudflareSettings(updateOrgCloudflareDto, req) {
        const organizationId = req.organization.id;
        return this.videosService.updateOrgCloudflareSettings(updateOrgCloudflareDto, organizationId);
    }
    async getOrgCloudflareSettings(req) {
        const organizationId = req.organization.id;
        return this.videosService.getOrgCloudflareSettings(organizationId);
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
    async uploadCoverImage(videoId, files, req) {
        this.logger.log(`Received request to upload cover for video ${videoId}. Files received: ${files?.length}`);
        const coverFile = files?.find(file => file.fieldname === 'cover');
        if (!coverFile) {
            this.logger.error('No cover image file with fieldname \'cover\' was uploaded.');
            throw new common_1.BadRequestException('No cover image file with fieldname \'cover\' uploaded.');
        }
        this.logger.log(`Processing cover file: ${coverFile.originalname}, size: ${coverFile.size}`);
        const organizationId = req.organization.id;
        return this.uploadService.uploadCoverImage(coverFile, videoId, organizationId);
    }
    async removeCoverImage(videoId, req) {
        const organizationId = req.organization.id;
        return this.uploadService.removeCoverImage(videoId, organizationId);
    }
};
exports.VideosController = VideosController;
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)(':videoId/test-playback-token'),
    (0, swagger_1.ApiOperation)({ summary: 'Generate JWT token for video playback (TEST - PUBLIC)' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Playback token generated successfully.' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "generateTestPlaybackToken", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('stream/:videoId/hls/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve HLS files for internal videos' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'HLS file content.' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "serveHls", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('stream/:videoId/master.m3u8'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve signed HLS master playlist' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'HLS master playlist with signed URLs.' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Query)('token')),
    __param(2, (0, common_1.Res)()),
    __param(3, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "serveSignedMasterPlaylist", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('stream/:videoId/seg/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve HLS segments with token validation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'HLS segment content.' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Query)('token')),
    __param(3, (0, common_1.Res)()),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "serveSignedSegment", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('thumb/:videoId/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve thumbnails with token validation' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Thumbnail content.' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Query)('token')),
    __param(3, (0, common_1.Res)()),
    __param(4, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "serveSignedThumbnail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('stream/:videoId/thumbnail'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve thumbnail for internal videos' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Thumbnail image.' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "serveThumbnail", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('stream/:videoId/thumbs/:filename'),
    (0, swagger_1.ApiOperation)({ summary: 'Serve thumbnail sprites and VTT files for internal videos' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Thumbnail sprite or VTT file.' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Param)('filename')),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "serveThumbFile", null);
__decorate([
    (0, common_1.Post)(':videoId/playback-token'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Generate JWT token for video playback' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Playback token generated successfully.' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "generatePlaybackToken", null);
__decorate([
    (0, common_1.Get)('organization'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get all videos for the authenticated organization' }),
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
    (0, common_1.Get)('organization/providers'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get available video providers for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Available providers list.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getAvailableProviders", null);
__decorate([
    (0, common_1.Post)('organization/test-providers'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Test all available video providers for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Provider test results.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "testAllProviders", null);
__decorate([
    (0, common_1.Get)('organization/:id'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
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
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get a direct upload URL for Cloudflare Stream and save to organization' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Returns an upload URL and video ID.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [create_video_dto_1.CreateVideoDto, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "createOrgUploadUrl", null);
__decorate([
    (0, common_1.Delete)('organization/:id'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
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
    (0, common_1.Put)('organization/:id'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
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
    (0, common_1.Post)('organization/:id/sync'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
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
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('transcode/callback'),
    (0, swagger_1.ApiOperation)({ summary: 'Internal callback when FFmpeg worker finishes transcode' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Callback processed.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [transcode_callback_dto_1.TranscodeCallbackDto]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "transcodeCallback", null);
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
    (0, common_1.Post)('multipart/init'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Init multipart upload and create PendingVideo' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [multipart_dto_1.MultipartInitDto, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "multipartInit", null);
__decorate([
    (0, common_1.Post)('multipart/part-url'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get presigned URL for a specific part' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [multipart_dto_1.MultipartPartUrlDto]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "multipartPartUrl", null);
__decorate([
    (0, common_1.Post)('multipart/complete'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Complete multipart upload and enqueue transcode' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [multipart_dto_1.MultipartCompleteDto, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "multipartComplete", null);
__decorate([
    (0, common_1.Post)('multipart/abort'),
    (0, swagger_1.ApiOperation)({ summary: 'Abort multipart upload' }),
    (0, swagger_1.ApiResponse)({ status: 200 }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [multipart_dto_1.MultipartAbortDto]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "multipartAbort", null);
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
    (0, common_1.Get)('status/:id'),
    (0, swagger_1.ApiOperation)({ summary: 'Alias: Check video status by ID' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the video status.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    (0, swagger_1.ApiParam)({ name: 'id', description: 'Video ID or related provider ID' }),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('id')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getVideoStatusAlias", null);
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
    (0, common_1.Get)('embed/:uid'),
    (0, public_decorator_1.Public)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get video details for embedding' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the video with embed information.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    (0, swagger_1.ApiParam)({ name: 'uid', description: 'The Cloudflare Stream video UID' }),
    __param(0, (0, common_1.Param)('uid')),
    __param(1, (0, common_1.Req)()),
    __param(2, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getVideoForEmbed", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('embed-test'),
    (0, swagger_1.ApiOperation)({ summary: 'Test endpoint for cross-domain CORS' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'CORS test successful.' }),
    __param(0, (0, common_1.Req)()),
    __param(1, (0, common_1.Res)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "testEmbedCors", null);
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
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
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
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
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
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Get Cloudflare settings for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Settings retrieved.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getOrgCloudflareSettings", null);
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
__decorate([
    (0, common_1.Post)(':videoId/cover'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, common_1.UseInterceptors)((0, platform_express_1.AnyFilesInterceptor)({
        fileFilter: (req, file, cb) => {
            const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
            if (allowedTypes.includes(file.mimetype)) {
                cb(null, true);
            }
            else {
                cb(new common_1.BadRequestException('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
            }
        },
        limits: {
            fileSize: 10 * 1024 * 1024,
        }
    })),
    (0, swagger_1.ApiOperation)({ summary: 'Upload a cover image for a video' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Cover image uploaded successfully.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Bad request (e.g., no file, invalid file type, video not found).' }),
    (0, swagger_1.ApiParam)({ name: 'videoId', description: 'The ID of the video' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.UploadedFiles)()),
    __param(2, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Array, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "uploadCoverImage", null);
__decorate([
    (0, common_1.Delete)(':videoId/cover'),
    (0, organization_scoped_decorator_1.OrganizationScoped)(),
    (0, swagger_1.ApiOperation)({ summary: 'Remove the cover image for a video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Cover image removed.' }),
    (0, swagger_1.ApiParam)({ name: 'videoId', description: 'The ID of the video' }),
    __param(0, (0, common_1.Param)('videoId')),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "removeCoverImage", null);
exports.VideosController = VideosController = VideosController_1 = __decorate([
    (0, swagger_1.ApiTags)('videos'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/videos'),
    __metadata("design:paramtypes", [videos_service_1.VideosService,
        prisma_service_1.PrismaService,
        mux_webhook_controller_1.MuxWebhookController,
        upload_service_1.UploadService])
], VideosController);
//# sourceMappingURL=videos.controller.js.map