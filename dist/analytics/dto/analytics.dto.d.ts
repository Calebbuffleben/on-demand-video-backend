import { PlatformStats, RecentUpload, PopularVideo } from '../interfaces/analytics.interfaces';
export declare class QueryLimitDto {
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
