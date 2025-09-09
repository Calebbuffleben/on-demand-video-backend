import { AnalyticsService } from './analytics.service';
import { GetVideosLimitDto } from './dto/analytics.dto';
import { PrismaService } from '../prisma/prisma.service';
import { EventsTimeRangeDto } from './dto/events-time-range.dto';
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
    getEventsSummary(videoId: string, bucketSizeParam: string, perSecondParam: string, range: EventsTimeRangeDto, req: AuthenticatedRequest): Promise<{
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
    getEventsInsights(videoId: string, range: EventsTimeRangeDto, bucketSizeParam: string, topDropParam: string, req: AuthenticatedRequest): Promise<{
        success: boolean;
        data: {
            quartiles: {
                q25: {
                    time: number;
                    reached: number;
                    pct: number;
                };
                q50: {
                    time: number;
                    reached: number;
                    pct: number;
                };
                q75: {
                    time: number;
                    reached: number;
                    pct: number;
                };
                q100: {
                    time: number;
                    reached: number;
                    pct: number;
                };
            };
            completionRate: {
                completed: number;
                pct: number;
            };
            replays: {
                count: number;
                sessionsWithReplay: number;
                ratePct: number;
            };
            heatmap: {
                start: number;
                end: number;
                secondsWatched: number;
                intensityPct: number;
            }[];
            dropOffPoints: {
                time: number;
                dropPct: number;
            }[];
        };
    }>;
    getDashboard(req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").DashboardResponse>;
    getPlatformStats(req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").PlatformStats>;
    getRecentUploads(query: GetVideosLimitDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").RecentUpload[]>;
    getPopularVideos(query: GetVideosLimitDto, req: AuthenticatedRequest): Promise<import("./interfaces/analytics.interfaces").PopularVideo[]>;
    getVideoAnalytics(videoId: string, range: EventsTimeRangeDto, req: AuthenticatedRequest): Promise<{
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
    getVideoViews(videoId: string, range: EventsTimeRangeDto, req: AuthenticatedRequest): Promise<{
        totalViews: number;
        totalWatchTime: number;
        averageWatchTime: number;
        viewerTimelines: never[];
    }>;
    getViewerAnalytics(videoId: string, range: EventsTimeRangeDto, req: AuthenticatedRequest): Promise<{
        success: boolean;
        data: {
            devices: {
                percentage: number;
                device: string;
                category: string;
                manufacturer: string;
                views: number;
            }[];
            browsers: {
                percentage: number;
                browser: string;
                version: string;
                views: number;
            }[];
            operatingSystems: {
                percentage: number;
                os: string;
                version: string;
                views: number;
            }[];
            locations: {
                percentage: number;
                country: string;
                countryCode: string;
                region?: string;
                city?: string;
                views: number;
            }[];
            connections: {
                connectionType: string;
                views: number;
                percentage: number;
            }[];
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
