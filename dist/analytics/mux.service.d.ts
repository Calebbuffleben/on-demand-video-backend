import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
export declare class MuxService {
    private configService;
    private prisma;
    private readonly logger;
    private readonly muxClient;
    constructor(configService: ConfigService, prisma: PrismaService);
    private getMuxClientForOrganization;
    getVideos(organizationId?: string): Promise<{
        uid: string;
        thumbnail: string;
        status: {
            state: string;
        };
        meta: {
            name: string;
        };
        created: string;
        modified: string;
        size: number;
        preview: string;
        playback: {
            hls: string | null;
            dash: string | null;
        };
        duration: number;
        input: {
            width: number | null;
            height: number;
        };
        readyToStream: boolean;
        views: number;
    }[]>;
    getAnalytics(organizationId?: string): Promise<{
        success: boolean;
        result: {
            totals: {
                totalVideoViews: number;
                storage: number;
                viewsPerVideo: {
                    videoId: string;
                    views: number;
                }[];
                timeframe: {
                    start: string;
                    end: string;
                };
            };
        };
    }>;
    getVideoAnalytics(videoId: string, organizationId?: string): Promise<{
        success: boolean;
        data: {
            totalViews: number;
            averageWatchTime: number;
            engagementRate: number;
            uniqueViewers: number;
            viewsOverTime: {
                timestamp: string;
                views: number;
            }[];
            retentionData: {
                time: number;
                retention: number;
            }[];
            viewerTimeline: {
                timestamp: string;
                activeViewers: number;
            }[];
        };
    }>;
    private calculateViewsOverTime;
    private calculateRetentionData;
    private calculateViewerTimeline;
}
