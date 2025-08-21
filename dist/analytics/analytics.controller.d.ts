import { AnalyticsService } from './analytics.service';
import { GetVideosLimitDto } from './dto/analytics.dto';
import { PrismaService } from '../prisma/prisma.service';
interface AuthenticatedRequest extends Request {
    user: {
        organizationId: string;
    };
    organization: any;
}
export declare class AnalyticsController {
    private readonly analyticsService;
    private readonly prisma;
    constructor(analyticsService: AnalyticsService, prisma: PrismaService);
    ingestEvent(body: any, req: any): Promise<{
        success: boolean;
    }>;
    getEventsSummary(videoId: string, bucketSizeParam: string, perSecondParam: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
        data: {
            views: number;
            watchTime: number;
            duration: number;
            retention: {
                pct: number;
                start: number;
                end: number;
                viewers: number;
            }[];
            retentionPerSecond: {
                time: number;
                pct: number;
            }[] | undefined;
            bucketSize: number;
        };
    }>;
    getDashboard(req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").DashboardResponse>;
    getPlatformStats(req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").PlatformStats>;
    getRecentUploads(query: GetVideosLimitDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").RecentUpload[]>;
    getPopularVideos(query: GetVideosLimitDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").PopularVideo[]>;
    getVideoAnalytics(videoId: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
        data: {
            totalViews: number;
            averageWatchTime: number;
            engagementRate: number;
            uniqueViewers: number;
            viewsOverTime: never[];
            retentionData: {
                time: number;
                retention: number;
            }[];
            viewerTimeline: never[];
        };
    }>;
    getVideoRetention(videoId: string, req: AuthenticatedRequest): Promise<{
        retention: {
            time: number;
            retention: number;
        }[];
    }>;
    getVideoViews(videoId: string, req: AuthenticatedRequest): Promise<{
        totalViews: number;
        totalWatchTime: number;
        averageWatchTime: number;
        viewerTimelines: never[];
    }>;
    getViewerAnalytics(videoId: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
        data: {
            devices: never[];
            browsers: never[];
            locations: never[];
            operatingSystems: never[];
            connections: never[];
            totalViews: number;
        };
    }>;
    getOrganizationRetention(req: AuthenticatedRequest): Promise<{
        success: boolean;
        data: {
            videoId: string;
            title: string;
            retention: any;
            totalViews: number;
            averageWatchTime: number;
        }[];
    }>;
    private generateDefaultRetention;
}
export {};
