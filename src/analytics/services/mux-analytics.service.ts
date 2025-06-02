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

    if (!organization?.muxTokenId || !organization?.muxTokenSecret) {
      throw new Error('Mux credentials not found for organization');
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

      // Process viewer timelines
      const viewerTimelines: ViewerTimelineDto[] = viewsResponse.data.map(view => ({
        timestamp: view.view_start,
        duration: view.watch_time || 0,
        percentage: ((view.watch_time || 0) / (video.duration || 1)) * 100,
      }));

      // Calculate retention data
      const retention = this.calculateRetention(viewerTimelines, video.duration || 0);

      // Calculate aggregate metrics
      const totalViews = viewerTimelines.length;
      const totalWatchTime = viewerTimelines.reduce((sum, view) => sum + view.duration, 0);
      const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;

      // Save analytics to database
      await this.saveAnalytics(videoId, {
        views: totalViews,
        watchTime: totalWatchTime,
        retention: retention,
      });

      return {
        totalViews,
        totalWatchTime,
        averageWatchTime,
        retention,
        viewerTimelines,
      };
    } catch (error) {
      this.logger.error(`Error fetching Mux analytics: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch Mux analytics: ${error.message}`);
    }
  }

  private calculateRetention(
    viewerTimelines: ViewerTimelineDto[],
    videoDuration: number,
  ): RetentionDataPointDto[] {
    const retentionPoints: RetentionDataPointDto[] = [];
    const timePoints = Math.min(100, videoDuration); // Limit to 100 data points

    for (let i = 0; i <= timePoints; i++) {
      const timestamp = Math.floor((i / timePoints) * videoDuration);
      const viewersAtPoint = viewerTimelines.filter(
        view => view.duration >= timestamp,
      ).length;
      const percentage = (viewersAtPoint / viewerTimelines.length) * 100;

      retentionPoints.push({
        timestamp,
        viewers: viewersAtPoint,
        percentage,
      });
    }

    return retentionPoints;
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