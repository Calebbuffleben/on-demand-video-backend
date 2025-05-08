import { MuxService } from './mux.service';
import { Cache } from 'cache-manager';
import { PlatformStats, RecentUpload, PopularVideo, DashboardResponse } from './interfaces/analytics.interfaces';
export declare class AnalyticsService {
    private muxService;
    private cacheManager;
    private readonly logger;
    constructor(muxService: MuxService, cacheManager: Cache);
    private formatFileSize;
    private formatDuration;
    private formatDate;
    getPlatformStats(organizationId?: string): Promise<PlatformStats>;
    getRecentUploads(limit?: number, organizationId?: string): Promise<RecentUpload[]>;
    getPopularVideos(limit?: number, organizationId?: string): Promise<PopularVideo[]>;
    getDashboardData(organizationId?: string): Promise<DashboardResponse>;
}
