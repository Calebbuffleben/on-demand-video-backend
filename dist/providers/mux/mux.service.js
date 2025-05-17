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
var MuxService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.MuxService = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_service_1 = require("../../prisma/prisma.service");
const mux_node_1 = require("@mux/mux-node");
const client_1 = require("@prisma/client");
const crypto = require("crypto");
let MuxService = MuxService_1 = class MuxService {
    configService;
    prismaService;
    logger = new common_1.Logger(MuxService_1.name);
    defaultMuxTokenId;
    defaultMuxTokenSecret;
    muxClient;
    webhookSecret;
    constructor(configService, prismaService) {
        this.configService = configService;
        this.prismaService = prismaService;
        this.defaultMuxTokenId = this.configService.get('MUX_TOKEN_ID', '');
        this.defaultMuxTokenSecret = this.configService.get('MUX_TOKEN_SECRET', '');
        this.webhookSecret = this.configService.get('MUX_WEBHOOK_SECRET', '');
        this.muxClient = new mux_node_1.default({
            tokenId: this.defaultMuxTokenId,
            tokenSecret: this.defaultMuxTokenSecret,
            webhookSecret: this.webhookSecret,
        });
    }
    async verifyWebhookSignature(payload, signature) {
        if (!this.webhookSecret) {
            this.logger.warn('MUX webhook secret is not configured, skipping signature verification');
            return true;
        }
        if (!signature) {
            this.logger.error('No MUX signature provided');
            return false;
        }
        try {
            const [version, timestamp, signatureHash] = signature.split(',');
            if (!version || !timestamp || !signatureHash) {
                this.logger.error('Invalid MUX signature format');
                return false;
            }
            const timestampValue = parseInt(timestamp.split('=')[1], 10);
            const currentTimestamp = Math.floor(Date.now() / 1000);
            if (currentTimestamp - timestampValue > 300) {
                this.logger.error('MUX webhook timestamp is too old');
                return false;
            }
            const signatureData = `${timestamp},${JSON.stringify(payload)}`;
            const expectedSignature = crypto
                .createHmac('sha256', this.webhookSecret)
                .update(signatureData)
                .digest('hex');
            const providedSignature = signatureHash.split('=')[1];
            return crypto.timingSafeEqual(Buffer.from(expectedSignature), Buffer.from(providedSignature));
        }
        catch (error) {
            this.logger.error('Error verifying MUX webhook signature:', error);
            return false;
        }
    }
    async getMuxCredentials(organizationId) {
        const organization = await this.prismaService.organization.findUnique({
            where: { id: organizationId },
        });
        const tokenId = organization?.muxTokenId || this.defaultMuxTokenId;
        const tokenSecret = organization?.muxTokenSecret || this.defaultMuxTokenSecret;
        if (!tokenId || !tokenSecret) {
            throw new common_1.BadRequestException('MUX credentials are not configured');
        }
        return { tokenId, tokenSecret };
    }
    async testMuxConnection(organizationId) {
        try {
            let muxClient;
            if (organizationId) {
                const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
                muxClient = new mux_node_1.default({
                    tokenId,
                    tokenSecret,
                });
            }
            else {
                if (!this.defaultMuxTokenId || !this.defaultMuxTokenSecret) {
                    throw new common_1.BadRequestException('Default MUX credentials are not configured');
                }
                muxClient = this.muxClient;
            }
            const response = await muxClient.video.assets.list({ limit: 1 });
            return {
                success: true,
                status: 200,
                message: 'Successfully connected to MUX API',
                data: {
                    result: response.data,
                },
            };
        }
        catch (error) {
            this.logger.error('Error connecting to MUX:', error);
            throw new common_1.BadRequestException(`Failed to connect to MUX: ${error.message}`);
        }
    }
    async createDirectUploadUrl(name, description, visibility, tags, organizationId) {
        try {
            this.logger.log(`Creating direct upload URL for organization ${organizationId} with name "${name}"`);
            this.logger.log(`Checking if organization ${organizationId} exists...`);
            const organization = await this.prismaService.organization.findUnique({
                where: { id: organizationId },
            });
            if (!organization) {
                this.logger.error(`Organization with ID ${organizationId} not found`);
                throw new common_1.BadRequestException(`Organization with ID ${organizationId} not found`);
            }
            this.logger.log(`Organization found: ${organization.name}`);
            this.logger.log(`Getting MUX credentials for organization ${organizationId}...`);
            const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
            this.logger.log(`Using MUX credentials for organization ${organizationId} - Token ID: ${tokenId.substring(0, 5)}...`);
            this.logger.log(`Initializing MUX client...`);
            const muxClient = new mux_node_1.default({
                tokenId,
                tokenSecret,
            });
            this.logger.log('Creating direct upload with MUX...');
            let upload;
            try {
                upload = await muxClient.video.uploads.create({
                    cors_origin: '*',
                    new_asset_settings: {
                        playback_policy: visibility === client_1.Visibility.PRIVATE ? ['signed'] : ['public'],
                        passthrough: JSON.stringify({
                            name,
                            description,
                            tags,
                            organizationId,
                        })
                    }
                });
                this.logger.log(`MUX upload created with ID: ${upload.id}`);
            }
            catch (muxError) {
                this.logger.error(`Error creating MUX upload: ${muxError.message}`, muxError.stack);
                throw new common_1.BadRequestException(`Failed to create MUX upload: ${muxError.message}`);
            }
            this.logger.log(`Creating pending video record in database using transaction...`);
            let pendingVideo;
            try {
                pendingVideo = await this.prismaService.$transaction(async (prisma) => {
                    const existing = await prisma.pendingVideo.findFirst({
                        where: { muxUploadId: upload.id }
                    });
                    if (existing) {
                        this.logger.log(`Found existing pending video with upload ID ${upload.id}: ${existing.id}`);
                        return existing;
                    }
                    const newPendingVideo = await prisma.pendingVideo.create({
                        data: {
                            name,
                            description,
                            muxUploadId: upload.id,
                            tags: tags || [],
                            visibility: visibility || client_1.Visibility.PUBLIC,
                            status: client_1.VideoStatus.PROCESSING,
                            organizationId,
                        },
                    });
                    this.logger.log(`Created new pending video with ID: ${newPendingVideo.id}`);
                    return newPendingVideo;
                });
            }
            catch (dbError) {
                this.logger.error(`Transaction failed when creating pending video: ${dbError.message}`, dbError.stack);
                throw new common_1.BadRequestException(`Failed to create pending video record: ${dbError.message}`);
            }
            if (!pendingVideo || !pendingVideo.id) {
                this.logger.error(`PendingVideo creation failed for upload ID: ${upload.id}`);
                throw new common_1.BadRequestException('Failed to create pending video record');
            }
            this.logger.log(`Pending video created with ID: ${pendingVideo.id} for MUX upload ID: ${upload.id}`);
            const checkPendingVideo = await this.prismaService.pendingVideo.findUnique({
                where: { id: pendingVideo.id }
            });
            if (!checkPendingVideo) {
                this.logger.error(`PendingVideo with ID ${pendingVideo.id} not found in database verification check!`);
            }
            else {
                this.logger.log(`PendingVideo verified in database: ${checkPendingVideo.id}`);
            }
            return {
                uploadUrl: upload.url,
                videoId: pendingVideo.id,
            };
        }
        catch (error) {
            this.logger.error(`Error creating direct upload URL: ${error.message}`, error.stack);
            if (error.message.includes('organization')) {
                throw new common_1.BadRequestException(`Failed to create upload URL: Organization issue - ${error.message}`);
            }
            else if (error.message.includes('credentials')) {
                throw new common_1.BadRequestException(`Failed to create upload URL: Credential issue - ${error.message}`);
            }
            else if (error instanceof Error) {
                throw new common_1.BadRequestException(`Failed to create upload URL: ${error.message}`);
            }
            else {
                throw new common_1.BadRequestException('Failed to create upload URL: Unknown error');
            }
        }
    }
    async checkUploadStatus(pendingVideoId, organizationId) {
        try {
            const pendingVideo = await this.prismaService.pendingVideo.findUnique({
                where: { id: pendingVideoId },
            });
            if (!pendingVideo) {
                throw new common_1.BadRequestException(`Pending video with ID ${pendingVideoId} not found`);
            }
            if (pendingVideo.organizationId !== organizationId) {
                throw new common_1.BadRequestException('You do not have access to this video');
            }
            const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
            const muxClient = new mux_node_1.default({
                tokenId,
                tokenSecret,
            });
            if (pendingVideo.muxUploadId) {
                const upload = await muxClient.video.uploads.retrieve(pendingVideo.muxUploadId);
                if (upload.asset_id) {
                    const asset = await muxClient.video.assets.retrieve(upload.asset_id);
                    await this.prismaService.pendingVideo.update({
                        where: { id: pendingVideo.id },
                        data: {
                            muxAssetId: asset.id,
                        },
                    });
                    return {
                        status: asset.status,
                        assetId: asset.id,
                        ready: asset.status === 'ready',
                    };
                }
                return {
                    status: 'uploading',
                    uploadId: upload.id,
                    ready: false,
                };
            }
            return {
                status: 'unknown',
                ready: false,
            };
        }
        catch (error) {
            this.logger.error('Error checking upload status:', error);
            throw new common_1.BadRequestException(`Failed to check upload status: ${error.message}`);
        }
    }
};
exports.MuxService = MuxService;
exports.MuxService = MuxService = MuxService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService,
        prisma_service_1.PrismaService])
], MuxService);
//# sourceMappingURL=mux.service.js.map