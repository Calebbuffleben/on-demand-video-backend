import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareVideoResponse, CloudflareAnalyticsResponse } from './interfaces/analytics.interfaces';
import { Cache } from 'cache-manager';
export declare class CloudflareService {
    private configService;
    private prismaService;
    private cacheManager;
    private readonly logger;
    private readonly defaultCloudflareAccountId;
    private readonly defaultCloudflareApiToken;
    constructor(configService: ConfigService, prismaService: PrismaService, cacheManager: Cache);
    private getCloudflareCredentials;
    getVideos(organizationId?: string): Promise<CloudflareVideoResponse[]>;
    getAnalytics(organizationId?: string): Promise<CloudflareAnalyticsResponse>;
    getVideo(videoId: string, organizationId?: string): Promise<CloudflareVideoResponse>;
}
