import { AnalyticsService } from './analytics.service';
import { GetVideosLimitDto } from './dto/analytics.dto';
import { MuxAnalyticsService } from './services/mux-analytics.service';
import { GetMuxAnalyticsDto, MuxAnalyticsResponseDto } from './dto/mux-analytics.dto';
import { PrismaService } from '../prisma/prisma.service';
interface AuthenticatedRequest extends Request {
    user: {
        organizationId: string;
    };
    organization: any;
}
export declare class AnalyticsController {
    private readonly analyticsService;
    private readonly muxAnalyticsService;
    private readonly prisma;
    constructor(analyticsService: AnalyticsService, muxAnalyticsService: MuxAnalyticsService, prisma: PrismaService);
    getDashboard(req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").DashboardResponse>;
    getPlatformStats(req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").PlatformStats>;
    getRecentUploads(query: GetVideosLimitDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").RecentUpload[]>;
    getPopularVideos(query: GetVideosLimitDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").PopularVideo[]>;
    getVideoAnalytics(videoId: string, query: GetMuxAnalyticsDto, req: AuthenticatedRequest): Promise<MuxAnalyticsResponseDto>;
    getVideoRetention(videoId: string, query: GetMuxAnalyticsDto, req: AuthenticatedRequest): Promise<{
        retention: {
            time: number;
            retention: number;
        }[];
    }>;
    getVideoViews(videoId: string, query: GetMuxAnalyticsDto, req: AuthenticatedRequest): Promise<{
        totalViews: number;
        totalWatchTime: number;
        averageWatchTime: number;
        viewerTimelines: {
            timestamp: string;
            duration: number;
            percentage: number;
        }[];
    }>;
    getViewerAnalytics(videoId: string, query: GetMuxAnalyticsDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").ViewerAnalytics>;
}
export {};
