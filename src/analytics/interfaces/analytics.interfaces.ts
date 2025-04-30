// Platform statistics
export interface PlatformStats {
  totalVideos: number;       // Total number of videos
  totalViews: number;        // Total views across all videos
  totalStorage: string;      // Formatted storage used (e.g., "2.4 GB")
  totalBandwidth: string;    // Formatted bandwidth used (e.g., "5.7 GB")
}

// Recent video upload
export interface RecentUpload {
  id: string;                // Video ID (Cloudflare UID)
  title: string;             // Video title
  thumbnailUrl: string;      // Thumbnail URL from Cloudflare
  uploadDate: string;        // Formatted upload date
  size: string;              // Formatted video size
  duration: string;          // Formatted duration (MM:SS)
}

// Popular video
export interface PopularVideo {
  id: string;                // Video ID (Cloudflare UID)
  title: string;             // Video title
  thumbnailUrl: string;      // Thumbnail URL from Cloudflare
  views: number;             // View count
  duration: string;          // Formatted duration (MM:SS)
}

// Combined dashboard response
export interface DashboardResponse {
  platformStats: PlatformStats;
  recentUploads: RecentUpload[];
  popularVideos: PopularVideo[];
}

// Cloudflare Video API Response
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

// Cloudflare Analytics Response
export interface CloudflareAnalyticsResponse {
  success: boolean;
  result: {
    totals: {
      bandwidth: number;
      storage: number;
      totalVideoViews: number;
    }
  };
}

// Cloudflare List Videos Response
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