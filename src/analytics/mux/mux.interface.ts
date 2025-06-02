export interface MuxCredentials {
  accessToken: string;
  secretKey: string;
  tenantId: string;
}

export interface VideoAnalytics {
  videoId: string;
  views: number;
  watchTime: number;
  retention: RetentionData[];
  createdAt: Date;
  updatedAt: Date;
}

export interface RetentionData {
  timestamp: number;
  viewers: number;
  percentage: number;
}

export interface ViewCountData {
  videoId: string;
  totalViews: number;
  uniqueViewers: number;
  averageWatchTime: number;
  lastUpdated: Date;
} 