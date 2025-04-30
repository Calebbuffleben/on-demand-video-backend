export interface PlatformStats {
    totalVideos: number;
    totalViews: number;
    totalStorage: string;
    totalBandwidth: string;
}
export interface RecentUpload {
    id: string;
    title: string;
    thumbnailUrl: string;
    uploadDate: string;
    size: string;
    duration: string;
}
export interface PopularVideo {
    id: string;
    title: string;
    thumbnailUrl: string;
    views: number;
    duration: string;
}
export interface DashboardResponse {
    platformStats: PlatformStats;
    recentUploads: RecentUpload[];
    popularVideos: PopularVideo[];
}
export interface CloudflareVideoResponse {
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
        hls: string;
        dash: string;
    };
    duration: number;
    input: {
        width: number;
        height: number;
    };
    readyToStream: boolean;
    requireSignedURLs: boolean;
    uploaded: string;
    watermark: any;
    liveInput: any;
}
export interface CloudflareAnalyticsResponse {
    success: boolean;
    result: {
        totals: {
            bandwidth: number;
            storage: number;
            totalVideoViews: number;
        };
    };
}
export interface CloudflareListVideosResponse {
    success: boolean;
    result: CloudflareVideoResponse[];
    result_info: {
        page: number;
        per_page: number;
        count: number;
        total_count: number;
    };
}
