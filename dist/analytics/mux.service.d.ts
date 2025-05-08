import { ConfigService } from '@nestjs/config';
export declare class MuxService {
    private configService;
    private readonly logger;
    private readonly muxClient;
    constructor(configService: ConfigService);
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
    }[]>;
    getAnalytics(organizationId?: string): Promise<{
        success: boolean;
        result: {
            totals: {
                totalVideoViews: number;
                storage: number;
                bandwidth: number;
            };
        };
    }>;
}
