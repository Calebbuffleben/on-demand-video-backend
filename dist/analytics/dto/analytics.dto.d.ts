import { PlatformStats, RecentUpload, PopularVideo, DeviceBreakdown, BrowserBreakdown, LocationBreakdown, OSBreakdown, ConnectionBreakdown, ViewerAnalytics } from '../interfaces/analytics.interfaces';
export declare class GetVideosLimitDto {
    limit?: number;
}
export declare class PlatformStatsDto implements PlatformStats {
    totalVideos: number;
    totalViews: number;
    totalStorage: string;
    totalBandwidth: string;
}
export declare class RecentUploadDto implements RecentUpload {
    id: string;
    title: string;
    thumbnailUrl: string;
    uploadDate: string;
    size: string;
    duration: string;
}
export declare class PopularVideoDto implements PopularVideo {
    id: string;
    title: string;
    thumbnailUrl: string;
    views: number;
    duration: string;
}
export declare class DeviceBreakdownDto implements DeviceBreakdown {
    device: string;
    category: string;
    manufacturer: string;
    views: number;
    percentage: number;
}
export declare class BrowserBreakdownDto implements BrowserBreakdown {
    browser: string;
    version: string;
    views: number;
    percentage: number;
}
export declare class LocationBreakdownDto implements LocationBreakdown {
    country: string;
    countryCode: string;
    region?: string;
    city?: string;
    views: number;
    percentage: number;
}
export declare class OSBreakdownDto implements OSBreakdown {
    os: string;
    version: string;
    views: number;
    percentage: number;
}
export declare class ConnectionBreakdownDto implements ConnectionBreakdown {
    connectionType: string;
    views: number;
    percentage: number;
}
export declare class ViewerAnalyticsDto implements ViewerAnalytics {
    devices: DeviceBreakdownDto[];
    browsers: BrowserBreakdownDto[];
    locations: LocationBreakdownDto[];
    operatingSystems: OSBreakdownDto[];
    connections: ConnectionBreakdownDto[];
    totalViews: number;
}
export declare class DashboardResponseDto {
    platformStats: PlatformStatsDto;
    recentUploads: RecentUploadDto[];
    popularVideos: PopularVideoDto[];
}
export declare class PlatformStatsResponseDto {
    data: PlatformStatsDto;
}
export declare class RecentUploadsResponseDto {
    data: RecentUploadDto[];
}
export declare class PopularVideosResponseDto {
    data: PopularVideoDto[];
}
