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
export interface DeviceBreakdown {
    device: string;
    category: string;
    manufacturer: string;
    views: number;
    percentage: number;
}
export interface BrowserBreakdown {
    browser: string;
    version: string;
    views: number;
    percentage: number;
}
export interface LocationBreakdown {
    country: string;
    countryCode: string;
    region?: string;
    city?: string;
    views: number;
    percentage: number;
}
export interface OSBreakdown {
    os: string;
    version: string;
    views: number;
    percentage: number;
}
export interface ConnectionBreakdown {
    connectionType: string;
    views: number;
    percentage: number;
}
export interface ViewerAnalytics {
    devices: DeviceBreakdown[];
    browsers: BrowserBreakdown[];
    locations: LocationBreakdown[];
    operatingSystems: OSBreakdown[];
    connections: ConnectionBreakdown[];
    totalViews: number;
}
export interface DashboardResponse {
    platformStats: PlatformStats;
    recentUploads: RecentUpload[];
    popularVideos: PopularVideo[];
}
export interface MuxVideoResponse {
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
        height: number | null;
    };
    readyToStream: boolean;
}
export interface MuxAnalyticsResponse {
    success: boolean;
    result: {
        totals: {
            bandwidth: number;
            storage: number;
            totalVideoViews: number;
        };
    };
}
export interface MuxListVideosResponse {
    success: boolean;
    result: MuxVideoResponse[];
    result_info: {
        page: number;
        per_page: number;
        count: number;
        total_count: number;
    };
}
