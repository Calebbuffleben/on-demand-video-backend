import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { MuxService } from './mux.service';
import { PlatformStats, RecentUpload, PopularVideo, DashboardResponse } from './interfaces/analytics.interfaces';
export declare class AnalyticsService {
    private prisma;
    private muxService;
    private cacheManager;
    private readonly logger;
    constructor(prisma: PrismaService, muxService: MuxService, cacheManager: Cache);
    private formatFileSize;
    private formatDuration;
    private formatDate;
    getPlatformStats(organizationId?: string): Promise<PlatformStats>;
    getRecentUploads(limit?: number, organizationId?: string): Promise<RecentUpload[]>;
    getPopularVideos(limit?: number, organizationId?: string): Promise<PopularVideo[]>;
    getDashboardData(organizationId?: string): Promise<DashboardResponse>;
}
