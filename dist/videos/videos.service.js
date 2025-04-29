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
Object.defineProperty(exports, "__esModule", { value: true });
exports.VideosService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const client_1 = require("@prisma/client");
const node_fetch_1 = require("node-fetch");
let VideosService = class VideosService {
    prisma;
    configService;
    defaultCloudflareAccountId;
    defaultCloudflareApiToken;
    constructor(prisma, configService) {
        this.prisma = prisma;
        this.configService = configService;
        this.defaultCloudflareAccountId = this.configService.get('CLOUDFLARE_ACCOUNT_ID', '');
        this.defaultCloudflareApiToken = this.configService.get('CLOUDFLARE_API_TOKEN', '');
    }
    async getCloudflareCredentials(organizationId) {
        const organization = await this.prisma.organization.findUnique({
            where: { id: organizationId },
            select: {
                cloudflareAccountId: true,
                cloudflareApiToken: true,
            },
        });
        const accountId = organization?.cloudflareAccountId || this.defaultCloudflareAccountId;
        const apiToken = organization?.cloudflareApiToken || this.defaultCloudflareApiToken;
        if (!accountId || !apiToken) {
            throw new common_1.BadRequestException('Cloudflare credentials are not configured');
        }
        const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
        return { accountId, apiToken, baseUrl };
    }
    async testCloudflareConnection(organizationId) {
        try {
            let accountId;
            let apiToken;
            let baseUrl;
            if (organizationId) {
                const credentials = await this.getCloudflareCredentials(organizationId);
                accountId = credentials.accountId;
                apiToken = credentials.apiToken;
                baseUrl = credentials.baseUrl;
            }
            else {
                if (!this.defaultCloudflareAccountId || !this.defaultCloudflareApiToken) {
                    throw new common_1.BadRequestException('Default Cloudflare credentials are not configured');
                }
                accountId = this.defaultCloudflareAccountId;
                apiToken = this.defaultCloudflareApiToken;
                baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;
            }
            console.log(`Using Cloudflare Account ID: ${accountId.slice(0, 3)}...${accountId.slice(-3)}`);
            console.log(`API Token configured: ${apiToken ? 'Yes' : 'No'}`);
            console.log(`Base URL: ${baseUrl}`);
            const response = await (0, node_fetch_1.default)(baseUrl, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            console.log('Cloudflare API response status:', response.status);
            console.log('Cloudflare API response success:', data.success);
            if (!response.ok) {
                console.error('Error response from Cloudflare:', data.errors);
                throw new common_1.BadRequestException(`Failed to connect to Cloudflare: ${data.errors?.[0]?.message || 'Unknown error'}`);
            }
            return {
                success: data.success,
                status: response.status,
                message: 'Successfully connected to Cloudflare Stream API',
                data: {
                    result: data.result,
                    resultInfo: data.result_info,
                },
            };
        }
        catch (error) {
            console.error('Error connecting to Cloudflare:', error);
            throw new common_1.BadRequestException(`Failed to connect to Cloudflare: ${error.message}`);
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
            const { baseUrl, apiToken } = await this.getCloudflareCredentials(organizationId);
            const response = await (0, node_fetch_1.default)(`${baseUrl}/direct_upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    maxDurationSeconds: 3600,
                    expiry: new Date(Date.now() + 1000 * 60 * 60).toISOString(),
                    requireSignedURLs: createVideoDto.visibility === client_1.Visibility.PRIVATE,
                    creator: organizationId,
                    meta: {
                        name: createVideoDto.name,
                        organizationId,
                    },
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new common_1.BadRequestException(`Failed to create upload URL: ${data.errors?.[0]?.message || 'Unknown error'}`);
            }
            const video = await this.prisma.video.create({
                data: {
                    name: createVideoDto.name,
                    description: createVideoDto.description,
                    cloudflareId: data.result.uid,
                    tags: createVideoDto.tags || [],
                    visibility: createVideoDto.visibility || client_1.Visibility.PUBLIC,
                    status: client_1.VideoStatus.PROCESSING,
                    organizationId,
                    thumbnailUrl: null,
                    playbackUrl: null,
                },
            });
            return {
                uploadUrl: data.result.uploadURL,
                videoId: video.id,
            };
        }
        catch (error) {
            console.error('Error creating direct upload URL:', error);
            throw new common_1.BadRequestException('Failed to create upload URL');
        }
    }
    async update(id, updateVideoDto, organizationId) {
        await this.findOne(id, organizationId);
        return this.prisma.video.update({
            where: { id },
            data: updateVideoDto,
        });
    }
    async remove(id, organizationId) {
        const video = await this.findOne(id, organizationId);
        const { baseUrl, apiToken } = await this.getCloudflareCredentials(organizationId);
        try {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/${video.cloudflareId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                },
            });
            if (!response.ok) {
                const data = await response.json();
                console.error('Error deleting video from Cloudflare:', data);
            }
        }
        catch (error) {
            console.error('Error deleting video from Cloudflare:', error);
        }
        await this.prisma.video.delete({
            where: { id },
        });
    }
    async syncVideoStatus(id, organizationId) {
        const video = await this.findOne(id, organizationId);
        const { baseUrl, apiToken } = await this.getCloudflareCredentials(organizationId);
        try {
            const response = await (0, node_fetch_1.default)(`${baseUrl}/${video.cloudflareId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new common_1.BadRequestException(`Failed to get video status: ${data.errors?.[0]?.message || 'Unknown error'}`);
            }
            return this.prisma.video.update({
                where: { id: video.id },
                data: {
                    status: data.result.readyToStream ? client_1.VideoStatus.READY : client_1.VideoStatus.PROCESSING,
                    duration: data.result.duration,
                    thumbnailUrl: data.result.thumbnail,
                    playbackUrl: data.result.preview,
                },
            });
        }
        catch (error) {
            console.error('Error syncing video status:', error);
            throw new common_1.BadRequestException('Failed to sync video status');
        }
    }
    async handleCloudflareWebhook(payload) {
        if (!payload || !payload.uid) {
            throw new common_1.BadRequestException('Invalid webhook payload');
        }
        const video = await this.prisma.video.findUnique({
            where: { cloudflareId: payload.uid },
        });
        if (!video) {
            console.log(`No video found with Cloudflare ID: ${payload.uid}`);
            return;
        }
        switch (payload.status) {
            case 'ready':
                await this.prisma.video.update({
                    where: { id: video.id },
                    data: {
                        status: client_1.VideoStatus.READY,
                        duration: payload.duration || video.duration,
                        thumbnailUrl: payload.thumbnail || video.thumbnailUrl,
                        playbackUrl: payload.preview || video.playbackUrl,
                    },
                });
                break;
            case 'error':
                await this.prisma.video.update({
                    where: { id: video.id },
                    data: {
                        status: client_1.VideoStatus.ERROR,
                    },
                });
                break;
        }
    }
    async getUploadUrl(dto) {
        if (!this.defaultCloudflareAccountId || !this.defaultCloudflareApiToken) {
            throw new common_1.BadRequestException('Default Cloudflare credentials are not configured');
        }
        try {
            const response = await (0, node_fetch_1.default)(`https://api.cloudflare.com/client/v4/accounts/${this.defaultCloudflareAccountId}/stream/direct_upload`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.defaultCloudflareApiToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    maxDurationSeconds: dto.maxDurationSeconds,
                    expiry: new Date(Date.now() + 1000 * 60 * 30).toISOString(),
                }),
            });
            const data = await response.json();
            if (!response.ok) {
                throw new common_1.BadRequestException(`Failed to create upload URL: ${data.errors?.[0]?.message || 'Unknown error'}`);
            }
            return {
                uploadURL: data.result.uploadURL,
                uid: data.result.uid,
            };
        }
        catch (error) {
            console.error('Error creating direct upload URL:', error);
            throw new common_1.BadRequestException(`Failed to create upload URL: ${error.message}`);
        }
    }
    async getVideoStatus(videoId) {
        if (!this.defaultCloudflareAccountId || !this.defaultCloudflareApiToken) {
            throw new common_1.BadRequestException('Default Cloudflare credentials are not configured');
        }
        try {
            const response = await (0, node_fetch_1.default)(`https://api.cloudflare.com/client/v4/accounts/${this.defaultCloudflareAccountId}/stream/${videoId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.defaultCloudflareApiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 404) {
                    throw new common_1.NotFoundException(`Video with ID ${videoId} not found`);
                }
                throw new common_1.BadRequestException(`Failed to get video status: ${data.errors?.[0]?.message || 'Unknown error'}`);
            }
            const videoDto = {
                uid: data.result.uid,
                thumbnail: data.result.thumbnail,
                preview: data.result.preview,
                readyToStream: data.result.readyToStream,
                readyToStreamAt: data.result.readyToStreamAt,
                status: {
                    state: data.result.status?.state || 'unknown',
                    pctComplete: data.result.status?.pctComplete,
                    errorReasonCode: data.result.status?.errorReasonCode,
                    errorReasonText: data.result.status?.errorReasonText,
                },
                meta: data.result.meta,
                duration: data.result.duration,
                created: data.result.created,
                modified: data.result.modified,
                size: data.result.size,
                input: data.result.input,
                playback: data.result.playback,
            };
            return {
                success: true,
                readyToStream: data.result.readyToStream,
                status: data.result.status?.state || 'unknown',
                video: videoDto,
            };
        }
        catch (error) {
            console.error('Error getting video status:', error);
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to get video status: ${error.message}`);
        }
    }
    async getAllVideos() {
        if (!this.defaultCloudflareAccountId || !this.defaultCloudflareApiToken) {
            throw new common_1.BadRequestException('Default Cloudflare credentials are not configured');
        }
        try {
            const response = await (0, node_fetch_1.default)(`https://api.cloudflare.com/client/v4/accounts/${this.defaultCloudflareAccountId}/stream`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.defaultCloudflareApiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (!response.ok) {
                throw new common_1.BadRequestException(`Failed to get videos: ${data.errors?.[0]?.message || 'Unknown error'}`);
            }
            const videos = data.result.map(item => ({
                uid: item.uid,
                thumbnail: item.thumbnail,
                preview: item.preview,
                readyToStream: item.readyToStream,
                readyToStreamAt: item.readyToStreamAt,
                status: {
                    state: item.status?.state || 'unknown',
                    pctComplete: item.status?.pctComplete,
                    errorReasonCode: item.status?.errorReasonCode,
                    errorReasonText: item.status?.errorReasonText,
                },
                meta: item.meta,
                duration: item.duration,
                created: item.created,
                modified: item.modified,
                size: item.size,
                input: item.input,
                playback: item.playback,
            }));
            return {
                success: true,
                status: 200,
                message: 'Videos retrieved successfully',
                data: {
                    result: videos,
                },
            };
        }
        catch (error) {
            console.error('Error getting videos:', error);
            throw new common_1.BadRequestException(`Failed to get videos: ${error.message}`);
        }
    }
    async getVideoByUid(uid) {
        if (!this.defaultCloudflareAccountId || !this.defaultCloudflareApiToken) {
            throw new common_1.BadRequestException('Default Cloudflare credentials are not configured');
        }
        try {
            const response = await (0, node_fetch_1.default)(`https://api.cloudflare.com/client/v4/accounts/${this.defaultCloudflareAccountId}/stream/${uid}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.defaultCloudflareApiToken}`,
                    'Content-Type': 'application/json',
                },
            });
            const data = await response.json();
            if (!response.ok) {
                if (response.status === 404) {
                    throw new common_1.NotFoundException(`Video with UID ${uid} not found`);
                }
                throw new common_1.BadRequestException(`Failed to get video: ${data.errors?.[0]?.message || 'Unknown error'}`);
            }
            const videoDto = {
                uid: data.result.uid,
                thumbnail: data.result.thumbnail,
                preview: data.result.preview,
                readyToStream: data.result.readyToStream,
                readyToStreamAt: data.result.readyToStreamAt,
                status: {
                    state: data.result.status?.state || 'unknown',
                    pctComplete: data.result.status?.pctComplete,
                    errorReasonCode: data.result.status?.errorReasonCode,
                    errorReasonText: data.result.status?.errorReasonText,
                },
                meta: data.result.meta,
                duration: data.result.duration,
                created: data.result.created,
                modified: data.result.modified,
                size: data.result.size,
                input: data.result.input,
                playback: data.result.playback,
            };
            return {
                success: true,
                status: 200,
                message: 'Video retrieved successfully',
                data: {
                    result: videoDto,
                },
            };
        }
        catch (error) {
            console.error('Error getting video:', error);
            if (error instanceof common_1.NotFoundException) {
                throw error;
            }
            throw new common_1.BadRequestException(`Failed to get video: ${error.message}`);
        }
    }
    async updateOrgCloudflareSettings(updateOrgCloudflareDto, organizationId) {
        try {
            await this.prisma.organization.update({
                where: { id: organizationId },
                data: {
                    cloudflareAccountId: updateOrgCloudflareDto.cloudflareAccountId,
                    cloudflareApiToken: updateOrgCloudflareDto.cloudflareApiToken,
                },
            });
            await this.testCloudflareConnection(organizationId);
            return {
                hasCredentials: true,
                cloudflareAccountId: this.maskString(updateOrgCloudflareDto.cloudflareAccountId),
            };
        }
        catch (error) {
            console.error('Error updating organization Cloudflare settings:', error);
            if (error.message.includes('Cloudflare')) {
                await this.prisma.organization.update({
                    where: { id: organizationId },
                    data: {
                        cloudflareAccountId: null,
                        cloudflareApiToken: null,
                    },
                });
            }
            throw new common_1.BadRequestException(`Failed to update Cloudflare settings: ${error.message}`);
        }
    }
    async getOrgCloudflareSettings(organizationId) {
        try {
            const organization = await this.prisma.organization.findUnique({
                where: { id: organizationId },
                select: {
                    cloudflareAccountId: true,
                    cloudflareApiToken: true,
                },
            });
            const hasCredentials = !!(organization?.cloudflareAccountId && organization?.cloudflareApiToken);
            return {
                hasCredentials,
                cloudflareAccountId: hasCredentials && organization?.cloudflareAccountId ? this.maskString(organization.cloudflareAccountId) : undefined,
            };
        }
        catch (error) {
            console.error('Error getting organization Cloudflare settings:', error);
            throw new common_1.BadRequestException('Failed to get Cloudflare settings');
        }
    }
    maskString(input) {
        if (!input || input.length < 8)
            return input;
        const firstFour = input.substring(0, 4);
        const lastFour = input.substring(input.length - 4);
        const maskedPart = '*'.repeat(4);
        return `${firstFour}${maskedPart}${lastFour}`;
    }
};
exports.VideosService = VideosService;
exports.VideosService = VideosService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService])
], VideosService);
//# sourceMappingURL=videos.service.js.map