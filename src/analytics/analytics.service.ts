import { Injectable, Logger } from '@nestjs/common';
import { MuxService } from './mux.service';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { 
  PlatformStats, 
  RecentUpload, 
  PopularVideo, 
  DashboardResponse
} from './interfaces/analytics.interfaces';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private muxService: MuxService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Format file size from bytes to human readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration from seconds to MM:SS format
   */
  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format date to display format
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(organizationId?: string): Promise<PlatformStats> {
    const cacheKey = `platform_stats_${organizationId || 'default'}`;
    const cachedStats = await this.cacheManager.get<PlatformStats>(cacheKey);
    
    if (cachedStats) {
      return cachedStats;
    }

    try {
      // Get videos and analytics data
      const videos = await this.muxService.getVideos(organizationId);
      const analytics = await this.muxService.getAnalytics(organizationId);

      // Calculate totals
      const totalVideos = videos.length;
      const totalViews = analytics.result.totals.totalVideoViews || 0;
      const totalStorage = this.formatFileSize(analytics.result.totals.storage || 0);
      const totalBandwidth = this.formatFileSize(analytics.result.totals.bandwidth || 0);

      const stats: PlatformStats = {
        totalVideos,
        totalViews,
        totalStorage,
        totalBandwidth,
      };

      // Cache the results
      await this.cacheManager.set(cacheKey, stats, 60 * 5); // 5 minutes

      return stats;
    } catch (error) {
      this.logger.error('Error getting platform stats', error);
      
      // Return default values on error
      return {
        totalVideos: 0,
        totalViews: 0,
        totalStorage: '0 GB',
        totalBandwidth: '0 GB',
      };
    }
  }

  /**
   * Get recent uploads
   */
  async getRecentUploads(limit: number = 5, organizationId?: string): Promise<RecentUpload[]> {
    const cacheKey = `recent_uploads_${limit}_${organizationId || 'default'}`;
    const cachedUploads = await this.cacheManager.get<RecentUpload[]>(cacheKey);
    
    if (cachedUploads) {
      return cachedUploads;
    }

    try {
      const videos = await this.muxService.getVideos(organizationId);

      // Sort by created date (newest first) and limit
      const recentUploads = videos
        .sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime())
        .slice(0, limit)
        .map(video => ({
          id: video.uid,
          title: video.meta?.name || 'Untitled Video',
          thumbnailUrl: video.thumbnail || '',
          uploadDate: this.formatDate(video.created),
          size: this.formatFileSize(video.size || 0),
          duration: this.formatDuration(video.duration || 0),
        }));

      // Cache the results
      await this.cacheManager.set(cacheKey, recentUploads, 60 * 5); // 5 minutes

      return recentUploads;
    } catch (error) {
      this.logger.error('Error getting recent uploads', error);
      return [];
    }
  }

  /**
   * Get popular videos
   */
  async getPopularVideos(limit: number = 5, organizationId?: string): Promise<PopularVideo[]> {
    const cacheKey = `popular_videos_${limit}_${organizationId || 'default'}`;
    const cachedVideos = await this.cacheManager.get<PopularVideo[]>(cacheKey);
    
    if (cachedVideos) {
      return cachedVideos;
    }

    try {
      const videos = await this.muxService.getVideos(organizationId);

      // Mock view count since MUX API doesn't directly provide view counts per video in the list endpoint
      // In a real implementation, you would fetch individual video analytics or use database tracking
      const popularVideos = videos
        .map(video => ({
          id: video.uid,
          title: video.meta?.name || 'Untitled Video',
          thumbnailUrl: video.thumbnail || '',
          // This is a mock view count - in production, you would get actual counts
          views: Math.floor(Math.random() * 10000), // Mock view count
          duration: this.formatDuration(video.duration || 0),
        }))
        .sort((a, b) => b.views - a.views) // Sort by view count (highest first)
        .slice(0, limit);

      // Cache the results
      await this.cacheManager.set(cacheKey, popularVideos, 60 * 5); // 5 minutes

      return popularVideos;
    } catch (error) {
      this.logger.error('Error getting popular videos', error);
      return [];
    }
  }

  /**
   * Get dashboard data (combined endpoint)
   */
  async getDashboardData(organizationId?: string): Promise<DashboardResponse> {
    const cacheKey = `dashboard_data_${organizationId || 'default'}`;
    const cachedData = await this.cacheManager.get<DashboardResponse>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      // Get all data in parallel
      const [
        platformStats,
        recentUploads,
        popularVideos
      ] = await Promise.all([
        this.getPlatformStats(organizationId),
        this.getRecentUploads(5, organizationId),
        this.getPopularVideos(3, organizationId)
      ]);

      const dashboardData: DashboardResponse = {
        platformStats,
        recentUploads,
        popularVideos
      };

      // Cache the results
      await this.cacheManager.set(cacheKey, dashboardData, 60 * 5); // 5 minutes

      return dashboardData;
    } catch (error) {
      this.logger.error('Error getting dashboard data', error);
      
      // Return empty data on error
      return {
        platformStats: {
          totalVideos: 0,
          totalViews: 0,
          totalStorage: '0 GB',
          totalBandwidth: '0 GB',
        },
        recentUploads: [],
        popularVideos: []
      };
    }
  }
} 