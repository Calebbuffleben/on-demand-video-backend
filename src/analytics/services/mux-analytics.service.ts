import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Mux from '@mux/mux-node';
import { GetMuxAnalyticsDto, MuxAnalyticsResponseDto, RetentionDataPointDto, ViewerTimelineDto } from '../dto/mux-analytics.dto';

@Injectable()
export class MuxAnalyticsService {
  private readonly logger = new Logger(MuxAnalyticsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getVideoAnalytics(
    videoId: string,
    tenantId: string,
    dto: GetMuxAnalyticsDto,
  ): Promise<MuxAnalyticsResponseDto> {
    // Log the viewer timelines for debugging
      this.logger.debug('--------------------------------- Got here:');
    // Get video and verify it belongs to tenant
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        organizationId: tenantId,
      },
      select: {
        muxAssetId: true,
        duration: true,
      },
    });

    if (!video || !video.muxAssetId) {
      throw new Error('Video not found or not associated with Mux');
    }

    // Get tenant Mux credentials
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        muxTokenId: true,
        muxTokenSecret: true,
      },
    });

    // If no Mux credentials, return default analytics
    if (!organization?.muxTokenId || !organization?.muxTokenSecret) {
      this.logger.warn(`Mux credentials not found for organization ${tenantId}, returning default analytics`);
      return this.getDefaultAnalytics(videoId, video.duration || 0);
    }

    // Initialize Mux client
    const muxClient = new Mux({
      tokenId: organization.muxTokenId,
      tokenSecret: organization.muxTokenSecret,
    });

    try {
      // Fetch views data from Mux
      const viewsResponse = await muxClient.data.videoViews.list({
        filters: [`asset_id:${video.muxAssetId}`],
        timeframe: dto.startDate && dto.endDate ? [dto.startDate, dto.endDate] : undefined,
      });

      // Log raw Mux data for debugging
      this.logger.debug('--------------------------------- Raw Mux data:', JSON.stringify(viewsResponse.data));

      // Process viewer timelines
      const viewerTimelines = viewsResponse.data.map(view => {
        // Convert watch_time from milliseconds to seconds
        const watchTimeInSeconds = Math.floor((view.watch_time || 0) / 1000);
        
        // Log individual view data for debugging
        this.logger.debug('--------------------------------- View data:', {
          view_start: view.view_start,
          watch_time_ms: view.watch_time,
          watch_time_seconds: watchTimeInSeconds,
          video_duration: video.duration
        });

        return {
          timestamp: view.view_start,
          duration: watchTimeInSeconds,
          percentage: (watchTimeInSeconds / (video.duration || 1)) * 100,
        };
      });

      // Log the viewer timelines for debugging
      this.logger.debug('--------------------------------- Viewer timelines:', JSON.stringify(viewerTimelines));

      // Calculate retention data
      const retention = this.calculateRetention(viewerTimelines, video.duration || 0);

      // Calculate aggregate metrics
      const totalViews = viewerTimelines.length;
      const totalWatchTime = viewerTimelines.reduce((sum, view) => sum + view.duration, 0);
      const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;

      // Format views over time data
      const viewsOverTime = this.formatViewsOverTime(viewerTimelines);

      // Save analytics to database
      await this.saveAnalytics(videoId, {
        views: totalViews,
        watchTime: totalWatchTime,
        retention: retention,
      });

      return {
        success: true,
        data: {
          totalViews,
          averageWatchTime,
          engagementRate: this.calculateEngagementRate(viewerTimelines, video.duration || 0),
          uniqueViewers: this.calculateUniqueViewers(viewerTimelines),
          viewsOverTime,
          retentionData: retention,
          viewerTimeline: viewerTimelines,
        },
      };
    } catch (error) {
      this.logger.error(`Error fetching Mux analytics: ${error.message}`, error.stack);
      // Return default analytics on error
      return this.getDefaultAnalytics(videoId, video.duration || 0);
    }
  }

  private getDefaultAnalytics(videoId: string, duration: number): MuxAnalyticsResponseDto {
    const defaultRetention = this.calculateRetention([], duration);
    const defaultViewsOverTime = this.formatViewsOverTime([]);

    return {
      success: true,
      data: {
        totalViews: 0,
        averageWatchTime: 0,
        engagementRate: 0,
        uniqueViewers: 0,
        viewsOverTime: defaultViewsOverTime,
        retentionData: defaultRetention,
        viewerTimeline: [],
      },
    };
  }

  private calculateRetention(
    viewerTimelines: ViewerTimelineDto[],
    videoDuration: number,
  ): RetentionDataPointDto[] {
    const retentionPoints: RetentionDataPointDto[] = [];
    const totalViewers = viewerTimelines.length;
    
    if (totalViewers === 0) {
      // If no viewers, return array of zero retention
      for (let second = 0; second <= videoDuration; second++) {
        retentionPoints.push({
          time: second,
          retention: 0,
        });
      }
      return retentionPoints;
    }

    // Create a point for each second
    for (let second = 0; second <= videoDuration; second++) {
      // Count viewers who are still watching at this second
      const activeViewers = viewerTimelines.filter(view => {
        // A viewer is considered active if they haven't reached their watch duration
        return second <= view.duration;
      }).length;

      // Calculate retention percentage
      const retention = (activeViewers / totalViewers) * 100;

      retentionPoints.push({
        time: second,
        retention,
      });
    }

    // Log the retention points for debugging
    this.logger.debug('Retention points:', JSON.stringify(retentionPoints));

    return retentionPoints;
  }

  private formatViewsOverTime(viewerTimelines: ViewerTimelineDto[]): any[] {
    // Group views by date
    const viewsByDate = new Map<string, number>();
    
    viewerTimelines.forEach(view => {
      const date = new Date(view.timestamp).toISOString().split('T')[0];
      viewsByDate.set(date, (viewsByDate.get(date) || 0) + 1);
    });

    // Convert to array format
    return Array.from(viewsByDate.entries()).map(([date, views]) => ({
      date,
      views,
    }));
  }

  private calculateEngagementRate(viewerTimelines: ViewerTimelineDto[], videoDuration: number): number {
    if (viewerTimelines.length === 0) return 0;
    
    const totalWatchTime = viewerTimelines.reduce((sum, view) => sum + view.duration, 0);
    const totalPossibleWatchTime = viewerTimelines.length * videoDuration;
    
    return (totalWatchTime / totalPossibleWatchTime) * 100;
  }

  private calculateUniqueViewers(viewerTimelines: ViewerTimelineDto[]): number {
    // In a real implementation, you would track unique viewers
    // For now, we'll use the total number of views as a proxy
    return viewerTimelines.length;
  }

  private async saveAnalytics(
    videoId: string,
    analytics: {
      views: number;
      watchTime: number;
      retention: RetentionDataPointDto[];
    },
  ): Promise<void> {
    await this.prisma.videoAnalytics.upsert({
      where: { videoId },
      update: {
        views: analytics.views,
        watchTime: analytics.watchTime,
        retention: JSON.stringify(analytics.retention),
        updatedAt: new Date(),
      },
      create: {
        videoId,
        views: analytics.views,
        watchTime: analytics.watchTime,
        retention: JSON.stringify(analytics.retention),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }
} 