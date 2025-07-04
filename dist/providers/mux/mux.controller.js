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
var MuxController_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MuxController = void 0;
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const mux_service_1 = require("./mux.service");
const update_org_mux_dto_1 = require("./dto/update-org-mux.dto");
const prisma_service_1 = require("../../prisma/prisma.service");
const public_decorator_1 = require("../../auth/decorators/public.decorator");
const client_1 = require("@prisma/client");
const mux_node_1 = require("@mux/mux-node");
let MuxController = MuxController_1 = class MuxController {
    muxService;
    prismaService;
    logger = new common_1.Logger(MuxController_1.name);
    constructor(muxService, prismaService) {
        this.muxService = muxService;
        this.prismaService = prismaService;
    }
    async testConnection() {
        try {
            return await this.muxService.testMuxConnection();
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to connect to MUX API: ${error.message}`);
        }
    }
    async updateOrgMuxSettings(updateOrgMuxDto, req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
        const organizationId = req['organization'].id;
        try {
            await this.prismaService.organization.update({
                where: { id: organizationId },
                data: {
                    muxTokenId: updateOrgMuxDto.muxTokenId,
                    muxTokenSecret: updateOrgMuxDto.muxTokenSecret,
                },
            });
            await this.muxService.testMuxConnection(organizationId);
            return {
                success: true,
                muxTokenId: this.maskString(updateOrgMuxDto.muxTokenId),
                muxTokenSecret: this.maskString(updateOrgMuxDto.muxTokenSecret),
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to update MUX settings: ${error.message}`);
        }
    }
    async getOrgMuxSettings(req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
        const organizationId = req['organization'].id;
        try {
            const organization = await this.prismaService.organization.findUnique({
                where: { id: organizationId },
                select: {
                    muxTokenId: true,
                    muxTokenSecret: true,
                },
            });
            if (!organization || !organization.muxTokenId || !organization.muxTokenSecret) {
                return {
                    success: false,
                    muxTokenId: '',
                    muxTokenSecret: '',
                };
            }
            return {
                success: true,
                muxTokenId: this.maskString(organization.muxTokenId),
                muxTokenSecret: this.maskString(organization.muxTokenSecret),
            };
        }
        catch (error) {
            throw new common_1.BadRequestException(`Failed to get MUX settings: ${error.message}`);
        }
    }
    async testOrgConnection(req) {
        if (!req['organization']) {
            throw new common_1.BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
        }
        const organizationId = req['organization'].id;
        return this.muxService.testMuxConnection(organizationId);
    }
    async simulateWebhook(payload) {
        try {
            this.logger.log(`Simulating MUX webhook with payload: ${JSON.stringify(payload)}`);
            if (!payload.type) {
                throw new common_1.BadRequestException('Missing webhook type');
            }
            switch (payload.type) {
                case 'video.asset.ready':
                    await this.handleAssetReady(payload.data);
                    break;
                default:
                    this.logger.log(`Unhandled webhook type: ${payload.type}`);
            }
            return { success: true, message: 'Webhook simulated successfully' };
        }
        catch (error) {
            this.logger.error(`Error simulating webhook: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Failed to simulate webhook: ${error.message}`);
        }
    }
    async testAssetReady(data) {
        try {
            this.logger.log(`Testing asset.ready event with data: ${JSON.stringify(data)}`);
            const payload = {
                id: data.assetId || 'test-asset-id',
                upload_id: data.uploadId,
                playback_ids: [{ id: data.playbackId || 'test-playback-id' }],
                passthrough: JSON.stringify({
                    organizationId: data.organizationId,
                    name: data.name || 'Test Video',
                }),
            };
            await this.handleAssetReady(payload);
            let result;
            if (data.assetId) {
                result = await this.prismaService.video.findFirst({
                    where: { muxAssetId: data.assetId },
                });
            }
            else if (data.uploadId) {
                result = await this.prismaService.video.findFirst({
                    where: { muxUploadId: data.uploadId },
                });
            }
            return {
                success: true,
                message: 'Asset ready event processed successfully',
                videoCreated: !!result,
                videoDetails: result,
            };
        }
        catch (error) {
            this.logger.error(`Error testing asset ready: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Failed to test asset ready: ${error.message}`);
        }
    }
    async handleAssetReady(data) {
        try {
            this.logger.log(`Processing asset ready event for asset ID: ${data.id}`);
            const assetId = data.id;
            const uploadId = data.upload_id;
            const playbackId = data.playback_ids?.[0]?.id;
            let passthrough = {};
            try {
                passthrough = JSON.parse(data.passthrough || '{}');
            }
            catch (e) {
                this.logger.error(`Error parsing passthrough data: ${e.message}`);
            }
            const organizationId = passthrough['organizationId'];
            const name = passthrough['name'] || 'Uploaded Video';
            let video = null;
            if (uploadId) {
                video = await this.prismaService.video.findFirst({
                    where: { muxUploadId: uploadId },
                });
            }
            if (!video && assetId) {
                video = await this.prismaService.video.findFirst({
                    where: { muxAssetId: assetId },
                });
            }
            if (!video) {
                let pendingVideo = null;
                if (uploadId) {
                    pendingVideo = await this.prismaService.pendingVideo.findFirst({
                        where: { muxUploadId: uploadId },
                    });
                }
                if (!pendingVideo && assetId) {
                    pendingVideo = await this.prismaService.pendingVideo.findFirst({
                        where: { muxAssetId: assetId },
                    });
                }
                if (pendingVideo) {
                    this.logger.log(`Creating video from pending video: ${pendingVideo.id}`);
                    video = await this.prismaService.video.create({
                        data: {
                            id: pendingVideo.id,
                            name: pendingVideo.name,
                            description: pendingVideo.description || '',
                            organizationId: pendingVideo.organizationId,
                            muxUploadId: pendingVideo.muxUploadId,
                            muxAssetId: assetId,
                            muxPlaybackId: playbackId,
                            status: client_1.VideoStatus.READY,
                            thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
                            playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
                            tags: pendingVideo.tags || [],
                            visibility: pendingVideo.visibility,
                        },
                    });
                    try {
                        await this.prismaService.pendingVideo.delete({
                            where: { id: pendingVideo.id },
                        });
                    }
                    catch (e) {
                        this.logger.error(`Failed to delete pending video: ${e.message}`);
                    }
                }
                else if (organizationId && uploadId) {
                    this.logger.log(`Creating video directly from webhook data`);
                    video = await this.prismaService.video.create({
                        data: {
                            name,
                            description: '',
                            organizationId,
                            muxUploadId: uploadId,
                            muxAssetId: assetId,
                            muxPlaybackId: playbackId,
                            status: client_1.VideoStatus.READY,
                            thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
                            playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
                            tags: [],
                            visibility: 'PUBLIC',
                        },
                    });
                }
            }
            else {
                this.logger.log(`Updating existing video: ${video.id}`);
                video = await this.prismaService.video.update({
                    where: { id: video.id },
                    data: {
                        muxAssetId: assetId,
                        muxPlaybackId: playbackId,
                        status: client_1.VideoStatus.READY,
                        thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
                        playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
                    },
                });
            }
            if (!video) {
                this.logger.warn(`Failed to create or update video for asset ID: ${assetId}`);
            }
            else {
                this.logger.log(`Successfully processed asset.ready event for video: ${video.id}`);
            }
            return video;
        }
        catch (error) {
            this.logger.error(`Error handling asset ready: ${error.message}`, error.stack);
            throw error;
        }
    }
    maskString(input) {
        if (!input || input.length < 4) {
            return input;
        }
        const visiblePrefixLength = 2;
        const visibleSuffixLength = 2;
        return (input.substring(0, visiblePrefixLength) +
            '***' +
            input.substring(input.length - visibleSuffixLength));
    }
    async checkPendingVideo(body) {
        try {
            this.logger.log(`Manual check for pending video with ID: ${body.pendingVideoId}`);
            if (!body.pendingVideoId) {
                throw new common_1.BadRequestException('Pending video ID is required');
            }
            const pendingVideo = await this.prismaService.pendingVideo.findUnique({
                where: { id: body.pendingVideoId },
            });
            if (!pendingVideo) {
                throw new common_1.BadRequestException(`Pending video with ID ${body.pendingVideoId} not found`);
            }
            this.logger.log(`Found pending video: ${JSON.stringify(pendingVideo)}`);
            const { tokenId, tokenSecret } = await this.muxService.getMuxCredentials(pendingVideo.organizationId);
            const muxClient = new mux_node_1.Mux({
                tokenId,
                tokenSecret,
            });
            let assetId = pendingVideo.muxAssetId;
            if (pendingVideo.muxUploadId && !assetId) {
                try {
                    const upload = await muxClient.video.uploads.retrieve(pendingVideo.muxUploadId);
                    if (upload.asset_id) {
                        assetId = upload.asset_id;
                        this.logger.log(`Found asset ID ${assetId} from upload ${pendingVideo.muxUploadId}`);
                        await this.prismaService.pendingVideo.update({
                            where: { id: pendingVideo.id },
                            data: { muxAssetId: assetId },
                        });
                    }
                }
                catch (error) {
                    this.logger.error(`Error retrieving upload info: ${error.message}`);
                }
            }
            if (!assetId) {
                return {
                    success: false,
                    message: 'No asset ID found for this pending video. The upload may still be in progress.',
                };
            }
            const asset = await muxClient.video.assets.retrieve(assetId);
            if (asset.status === 'ready') {
                const webhookPayload = {
                    type: 'video.asset.ready',
                    data: {
                        id: assetId,
                        upload_id: pendingVideo.muxUploadId,
                        playback_ids: asset.playback_ids,
                        duration: asset.duration,
                        passthrough: JSON.stringify({
                            name: pendingVideo.name,
                            description: pendingVideo.description,
                            organizationId: pendingVideo.organizationId,
                        }),
                    },
                };
                await this.simulateWebhook(webhookPayload);
                return {
                    success: true,
                    message: 'Video processed successfully',
                };
            }
            else {
                return {
                    success: false,
                    message: `Asset not ready yet. Current status: ${asset.status}`,
                    data: asset,
                };
            }
        }
        catch (error) {
            this.logger.error(`Error checking pending video: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Failed to check pending video: ${error.message}`);
        }
    }
    async listPendingVideos() {
        try {
            this.logger.log('Listing all pending videos');
            const pendingVideos = await this.prismaService.pendingVideo.findMany({
                orderBy: { createdAt: 'desc' },
            });
            this.logger.log(`Found ${pendingVideos.length} pending videos`);
            return {
                success: true,
                count: pendingVideos.length,
                pendingVideos: pendingVideos.map(pv => ({
                    id: pv.id,
                    name: pv.name,
                    muxUploadId: pv.muxUploadId,
                    muxAssetId: pv.muxAssetId,
                    status: pv.status,
                    createdAt: pv.createdAt,
                })),
            };
        }
        catch (error) {
            this.logger.error(`Error listing pending videos: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Failed to list pending videos: ${error.message}`);
        }
    }
    async testCreatePendingVideo(body) {
        try {
            this.logger.log(`Testing direct PendingVideo creation with: ${JSON.stringify(body)}`);
            if (!body.organizationId) {
                throw new common_1.BadRequestException('Organization ID is required');
            }
            const organization = await this.prismaService.organization.findUnique({
                where: { id: body.organizationId },
            });
            if (!organization) {
                throw new common_1.BadRequestException(`Organization with ID ${body.organizationId} not found`);
            }
            const pendingVideo = await this.prismaService.pendingVideo.create({
                data: {
                    name: body.name || 'Test Pending Video',
                    description: 'Created for testing purposes',
                    muxUploadId: body.muxUploadId || `test-upload-${Date.now()}`,
                    tags: [],
                    visibility: 'PUBLIC',
                    status: 'PROCESSING',
                    organizationId: body.organizationId,
                },
            });
            this.logger.log(`Successfully created PendingVideo with ID: ${pendingVideo.id}`);
            return {
                success: true,
                message: 'PendingVideo created successfully',
                pendingVideo,
            };
        }
        catch (error) {
            this.logger.error(`Error creating test pending video: ${error.message}`, error.stack);
            throw new common_1.BadRequestException(`Failed to create pending video: ${error.message}`);
        }
    }
};
exports.MuxController = MuxController;
__decorate([
    (0, common_1.Get)('test-connection'),
    (0, swagger_1.ApiOperation)({ summary: 'Test the connection to MUX API' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Returns the MUX API response.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "testConnection", null);
__decorate([
    (0, common_1.Post)('organization/settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Update MUX settings for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Settings updated.' }),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [update_org_mux_dto_1.UpdateOrgMuxDto, Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "updateOrgMuxSettings", null);
__decorate([
    (0, common_1.Get)('organization/settings'),
    (0, swagger_1.ApiOperation)({ summary: 'Get MUX settings for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Settings retrieved.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "getOrgMuxSettings", null);
__decorate([
    (0, common_1.Post)('organization/test-connection'),
    (0, swagger_1.ApiOperation)({ summary: 'Test MUX API connection for the organization' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Connection successful.' }),
    (0, swagger_1.ApiResponse)({ status: 400, description: 'Connection failed.' }),
    __param(0, (0, common_1.Req)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "testOrgConnection", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('simulate-webhook'),
    (0, swagger_1.ApiOperation)({ summary: 'Simulate a MUX webhook for testing' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Webhook simulated successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "simulateWebhook", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('test-asset-ready'),
    (0, swagger_1.ApiOperation)({ summary: 'Test processing a video.asset.ready event' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Asset ready event processed successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "testAssetReady", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('check-pending-video'),
    (0, swagger_1.ApiOperation)({ summary: 'Manually check a pending video and attempt to process it' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pending video checked successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "checkPendingVideo", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Get)('list-pending-videos'),
    (0, swagger_1.ApiOperation)({ summary: 'List all pending videos in the system for debugging' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'Pending videos retrieved successfully.' }),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "listPendingVideos", null);
__decorate([
    (0, public_decorator_1.Public)(),
    (0, common_1.Post)('test-create-pending-video'),
    (0, swagger_1.ApiOperation)({ summary: 'Test creating a PendingVideo record directly' }),
    (0, swagger_1.ApiResponse)({ status: 200, description: 'PendingVideo created successfully.' }),
    __param(0, (0, common_1.Body)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], MuxController.prototype, "testCreatePendingVideo", null);
exports.MuxController = MuxController = MuxController_1 = __decorate([
    (0, swagger_1.ApiTags)('mux'),
    (0, swagger_1.ApiBearerAuth)(),
    (0, common_1.Controller)('api/mux'),
    __metadata("design:paramtypes", [mux_service_1.MuxService,
        prisma_service_1.PrismaService])
], MuxController);
//# sourceMappingURL=mux.controller.js.map