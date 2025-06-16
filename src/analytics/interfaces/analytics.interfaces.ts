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

// Device analytics breakdown
export interface DeviceBreakdown {
  device: string;            // Device name (e.g., "iPhone 12")
  category: string;          // Device category (e.g., "phone", "desktop", "tablet")
  manufacturer: string;      // Device manufacturer (e.g., "Apple", "Samsung")
  views: number;             // Number of views from this device
  percentage: number;        // Percentage of total views
}

// Browser analytics breakdown
export interface BrowserBreakdown {
  browser: string;           // Browser name (e.g., "Chrome", "Safari")
  version: string;           // Browser version (e.g., "91.0.4472.124")
  views: number;             // Number of views from this browser
  percentage: number;        // Percentage of total views
}

// Location analytics breakdown
export interface LocationBreakdown {
  country: string;           // Country name (e.g., "United States")
  countryCode: string;       // Country code (e.g., "US")
  region?: string;           // State/region (e.g., "California")
  city?: string;             // City name (e.g., "San Francisco")
  views: number;             // Number of views from this location
  percentage: number;        // Percentage of total views
}

// Operating System analytics breakdown
export interface OSBreakdown {
  os: string;                // Operating system (e.g., "iOS", "Android", "Windows")
  version: string;           // OS version (e.g., "14.6")
  views: number;             // Number of views from this OS
  percentage: number;        // Percentage of total views
}

// Connection type analytics breakdown
export interface ConnectionBreakdown {
  connectionType: string;    // Connection type (e.g., "wifi", "cellular", "wired")
  views: number;             // Number of views from this connection type
  percentage: number;        // Percentage of total views
}

// Comprehensive device/browser/location analytics response
export interface ViewerAnalytics {
  devices: DeviceBreakdown[];
  browsers: BrowserBreakdown[];
  locations: LocationBreakdown[];
  operatingSystems: OSBreakdown[];
  connections: ConnectionBreakdown[];
  totalViews: number;
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