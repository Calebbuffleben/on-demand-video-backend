import { Injectable, Logger } from '@nestjs/common';
import { MuxCredentials, VideoAnalytics, ViewCountData } from './mux.interface';
import { PrismaService } from '../../prisma/prisma.service';
import Mux from '@mux/mux-node';

@Injectable()
export class MuxService {
  private readonly logger = new Logger(MuxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getVideoAnalytics(videoId: string, tenantId: string): Promise<VideoAnalytics> {
    const credentials = await this.getTenantCredentials(tenantId);
    
    // Initialize Mux client with tenant credentials
    const muxClient = new Mux({
      tokenId: credentials.accessToken,
      tokenSecret: credentials.secretKey,
    });

    try {
      // Get video details from database
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

      // Fetch views data from Mux
      const viewsResponse = await muxClient.data.videoViews.list({
        filters: [`asset_id:${video.muxAssetId}`],
      });

      // Process viewer timelines
      const viewerTimelines = viewsResponse.data.map(view => ({
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

      return {
        videoId,
        views: totalViews,
        watchTime: totalWatchTime,
        retention,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
    } catch (error) {
      this.logger.error(`Error fetching Mux analytics: ${error.message}`, error.stack);
      throw new Error(`Failed to fetch Mux analytics: ${error.message}`);
    }
  }

  async getViewCountData(videoId: string, tenantId: string): Promise<ViewCountData> {
    const credentials = await this.getTenantCredentials(tenantId);
    // TODO: Implement Mux API calls using credentials
    throw new Error('Not implemented');
  }

  private async getTenantCredentials(tenantId: string): Promise<MuxCredentials> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        muxTokenId: true,
        muxTokenSecret: true,
      },
    });

    if (!organization || !organization.muxTokenId || !organization.muxTokenSecret) {
      throw new Error(`Organization ${tenantId} not found or missing Mux credentials`);
    }

    return {
      accessToken: organization.muxTokenId,
      secretKey: organization.muxTokenSecret,
      tenantId,
    };
  }

  private calculateRetention(viewerTimelines: any[], videoDuration: number): any[] {
    // Group viewers by timestamp
    const retentionMap = new Map<number, number>();
    const totalViewers = viewerTimelines.length;

    viewerTimelines.forEach(view => {
      const timestamp = Math.floor(view.timestamp);
      retentionMap.set(timestamp, (retentionMap.get(timestamp) || 0) + 1);
    });

    // Convert to retention data points
    return Array.from(retentionMap.entries()).map(([timestamp, viewers]) => ({
      timestamp,
      viewers,
      percentage: (viewers / totalViewers) * 100,
    }));
  }
} 