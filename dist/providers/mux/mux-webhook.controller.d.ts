import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
export declare class MuxWebhookController {
    private configService;
    private prismaService;
    private readonly logger;
    private readonly muxWebhookSecret;
    private readonly mux;
    constructor(configService: ConfigService, prismaService: PrismaService);
    handleWebhook(rawBody: string, headers: Record<string, string>): Promise<{
        success: boolean;
    }>;
    private handleAssetReady;
    private handleAssetError;
    private handleUploadCancelled;
}
