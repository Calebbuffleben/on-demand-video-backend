import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformStats, RecentUpload, PopularVideo, DashboardResponse } from './interfaces/analytics.interfaces';
export declare class AnalyticsService {
    private prisma;
    private cacheManager;
    private readonly logger;
    constructor(prisma: PrismaService, cacheManager: Cache);
    getUniqueViews(videoId: string): Promise<number>;
    getWatchTimeSeconds(videoId: string): Promise<number>;
    getRetentionBuckets(videoId: string, duration: number, bucketSize?: number): Promise<{
        pct: number;
        start: number;
        end: number;
        viewers: number;
    }[]>;
    getSecondBySecondRetention(videoId: string, duration: number): Promise<{
        time: number;
        pct: number;
    }[]>;
    private getMaxProgresses;
    private formatFileSize;
    private formatDuration;
    private formatDate;
    getPlatformStats(organizationId?: string): Promise<PlatformStats>;
    getRecentUploads(limit?: number, organizationId?: string): Promise<RecentUpload[]>;
    getPopularVideos(limit?: number, organizationId?: string): Promise<PopularVideo[]>;
    getDashboardData(organizationId?: string): Promise<DashboardResponse>;
    private getUniqueViewsByVideoMap;
}
