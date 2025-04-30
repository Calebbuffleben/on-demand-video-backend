import { CloudflareService } from './cloudflare.service';
import { Cache } from 'cache-manager';
import { PlatformStats, RecentUpload, PopularVideo, DashboardResponse } from './interfaces/analytics.interfaces';
export declare class AnalyticsService {
    private cloudflareService;
    private cacheManager;
    private readonly logger;
    constructor(cloudflareService: CloudflareService, cacheManager: Cache);
    private formatFileSize;
    private formatDuration;
    private formatDate;
    getPlatformStats(organizationId?: string): Promise<PlatformStats>;
    getRecentUploads(limit?: number, organizationId?: string): Promise<RecentUpload[]>;
    getPopularVideos(limit?: number, organizationId?: string): Promise<PopularVideo[]>;
    getDashboardData(organizationId?: string): Promise<DashboardResponse>;
}
