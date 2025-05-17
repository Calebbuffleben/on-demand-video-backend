import { RawBodyRequest } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { Request } from 'express';
export declare class MuxWebhookController {
    private configService;
    private prismaService;
    private readonly logger;
    private readonly muxWebhookSecret;
    private readonly mux;
    constructor(configService: ConfigService, prismaService: PrismaService);
    handleWebhook(req: RawBodyRequest<Request>, payload: any, signature: string): Promise<{
        success: boolean;
    }>;
    private handleAssetReady;
    private handleAssetError;
    private handleUploadCancelled;
    handleSimulatedWebhook(payload: any): Promise<{
        success: boolean;
    }>;
}
