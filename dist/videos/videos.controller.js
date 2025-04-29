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
let VideosController = class VideosController {
    videosService;
    constructor(videosService) {
        this.videosService = videosService;
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
    async webhook(payload) {
        try {
            await this.videosService.handleCloudflareWebhook(payload);
            return { success: true };
        }
        catch (error) {
            throw new common_1.BadRequestException('Failed to process webhook');
        }
    }
    async getCloudflareUploadUrl(dto) {
        return this.videosService.getUploadUrl(dto);
    }
    async getVideoStatus(videoId) {
        return this.videosService.getVideoStatus(videoId);
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
    (0, swagger_1.ApiOperation)({ summary: 'Webhook endpoint for Cloudflare Stream events' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook processed successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "webhook", null);
__decorate([
    (0, common_1.Post)('get-upload-url'),
    (0, swagger_1.ApiOperation)({ summary: 'Get a direct upload URL for Cloudflare Stream' }),
    (0, swagger_1.ApiResponse)({ status: 201, description: 'Returns an upload URL and video ID.' }),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [get_upload_url_dto_1.GetUploadUrlDto]),
    __metadata("design:returntype", Promise)
], VideosController.prototype, "getCloudflareUploadUrl", null);
__decorate([
    (0, common_1.Get)('status/:videoId'),
    (0, swagger_1.ApiOperation)({ summary: 'Check the status of an uploaded video' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the video status.' }),
    (0, swagger_1.ApiResponse)({ status: 404, description: 'Video not found.' }),
    (0, swagger_1.ApiParam)({ name: 'videoId', description: 'The Cloudflare Stream video ID' }),
    (0, public_decorator_1.Public)(),
    __param(0, (0, common_1.Param)('videoId')),
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
exports.VideosController = VideosController = __decorate([
    (0, swagger_1.ApiTags)('videos'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/videos'),
    __metadata("design:paramtypes", [videos_service_1.VideosService])
], VideosController);
//# sourceMappingURL=videos.controller.js.map