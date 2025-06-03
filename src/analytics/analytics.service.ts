import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { MuxService } from './mux.service';
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
    private prisma: PrismaService,
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
      // Get videos from database
      const videos = await this.prisma.video.findMany({
        where: organizationId ? { organizationId } : undefined,
        include: {
          analytics: true,
        },
      });

      // Get Mux analytics data
      const muxAnalytics = await this.muxService.getAnalytics(organizationId);

      // Calculate totals
      const totalVideos = videos.length;
      const totalViews = videos.reduce((sum, video) => sum + (video.analytics?.views || 0), 0);
      const totalStorage = this.formatFileSize(muxAnalytics.result.totals.storage);
      const totalBandwidth = '0 GB'; // Mux doesn't provide this directly

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
      const videos = await this.prisma.video.findMany({
        where: organizationId ? { organizationId } : undefined,
        include: {
          analytics: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const recentUploads = videos.map(video => ({
        id: video.id,
        title: video.name || 'Untitled Video',
        thumbnailUrl: video.thumbnailUrl || '',
        uploadDate: this.formatDate(video.createdAt.toISOString()),
        size: this.formatFileSize(video.analytics?.watchTime || 0),
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
      // Get videos with their Mux asset IDs
      const videos = await this.prisma.video.findMany({
        where: organizationId ? { organizationId } : undefined,
        include: {
          analytics: true,
        },
        orderBy: {
          analytics: {
            views: 'desc',
          },
        },
        take: limit,
      });

      // Get detailed analytics from Mux for each video
      const videosWithMuxData = await Promise.all(
        videos.map(async (video) => {
          if (!video.muxAssetId) return video;

          try {
            const muxAnalytics = await this.muxService.getAnalytics(organizationId);
            return {
              ...video,
              muxAnalytics: muxAnalytics.result.totals,
            };
          } catch (error) {
            this.logger.error(`Error fetching Mux analytics for video ${video.id}:`, error);
            return video;
          }
        })
      );

      const popularVideos = videosWithMuxData.map(video => ({
        id: video.id,
        title: video.name || 'Untitled Video',
        thumbnailUrl: video.thumbnailUrl || '',
        views: video.analytics?.views || 0,
        duration: this.formatDuration(video.duration || 0),
      }));

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