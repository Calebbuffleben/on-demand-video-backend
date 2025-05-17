import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Visibility } from '@prisma/client';
export declare class MuxService {
    private configService;
    private prismaService;
    private readonly logger;
    private readonly defaultMuxTokenId;
    private readonly defaultMuxTokenSecret;
    private readonly muxClient;
    private readonly webhookSecret;
    constructor(configService: ConfigService, prismaService: PrismaService);
    verifyWebhookSignature(payload: any, signature: string): Promise<boolean>;
    getMuxCredentials(organizationId: string): Promise<{
        tokenId: string;
        tokenSecret: string;
    }>;
    testMuxConnection(organizationId?: string): Promise<any>;
    createDirectUploadUrl(name: string, description: string, visibility: Visibility, tags: string[], organizationId: string): Promise<{
        uploadUrl: string;
        videoId: string;
    }>;
    checkUploadStatus(pendingVideoId: string, organizationId: string): Promise<any>;
}
