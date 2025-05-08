// Platform statistics
export interface PlatformStats {
  totalVideos: number;       // Total number of videos
  totalViews: number;        // Total views across all videos
  totalStorage: string;      // Formatted storage used (e.g., "2.4 GB")
  totalBandwidth: string;    // Formatted bandwidth used (e.g., "5.7 GB")
}

// Recent video upload
export interface RecentUpload {
  id: string;                // Video ID (MUX Asset ID)
  title: string;             // Video title
  thumbnailUrl: string;      // Thumbnail URL from MUX
  uploadDate: string;        // Formatted upload date
  size: string;              // Formatted video size
  duration: string;          // Formatted duration (MM:SS)
}

// Popular video
export interface PopularVideo {
  id: string;                // Video ID (MUX Asset ID)
  title: string;             // Video title
  thumbnailUrl: string;      // Thumbnail URL from MUX
  views: number;             // View count
  duration: string;          // Formatted duration (MM:SS)
}

// Combined dashboard response
export interface DashboardResponse {
  platformStats: PlatformStats;
  recentUploads: RecentUpload[];
  popularVideos: PopularVideo[];
}

// MUX Video API Response
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

// MUX Analytics Response
export interface MuxAnalyticsResponse {
  success: boolean;
  result: {
    totals: {
      bandwidth: number;
      storage: number;
      totalVideoViews: number;
    }
  };
}

// MUX List Videos Response
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