import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { PlatformStats, RecentUpload, PopularVideo, DashboardResponse } from './interfaces/analytics.interfaces';
import { EventsTimeRangeDto } from './dto/events-time-range.dto';
export declare class AnalyticsService {
    private prisma;
    private cacheManager;
    private readonly logger;
    constructor(prisma: PrismaService, cacheManager: Cache);
    getUniqueViews(videoId: string, range?: EventsTimeRangeDto): Promise<number>;
    getWatchTimeSeconds(videoId: string, range?: EventsTimeRangeDto): Promise<number>;
    getRetentionBuckets(videoId: string, duration: number, bucketSize?: number, range?: EventsTimeRangeDto): Promise<{
        pct: number;
        start: number;
        end: number;
        viewers: number;
    }[]>;
    getSecondBySecondRetention(videoId: string, duration: number, range?: EventsTimeRangeDto): Promise<{
        time: number;
        pct: number;
    }[]>;
    private getMaxProgresses;
    getWatchHeatmap(videoId: string, duration: number, bucketSize?: number, range?: EventsTimeRangeDto): Promise<Array<{
        start: number;
        end: number;
        secondsWatched: number;
        intensityPct: number;
    }>>;
    getEventsInsights(videoId: string, duration: number, range?: EventsTimeRangeDto, bucketSize?: number, topDropOffs?: number): Promise<{
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
    }>;
    getViewerAnalyticsFromEvents(videoId: string, range?: EventsTimeRangeDto): Promise<{
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
        connections: Array<{
            connectionType: string;
            views: number;
            percentage: number;
        }>;
        totalViews: number;
    }>;
    private formatFileSize;
    private formatDuration;
    private formatDate;
    getPlatformStats(organizationId?: string): Promise<PlatformStats>;
    getRecentUploads(limit?: number, organizationId?: string): Promise<RecentUpload[]>;
    getPopularVideos(limit?: number, organizationId?: string): Promise<PopularVideo[]>;
    getDashboardData(organizationId?: string): Promise<DashboardResponse>;
    private getUniqueViewsByVideoMap;
}
