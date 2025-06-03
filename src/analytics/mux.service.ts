import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';
import { PrismaService } from '../prisma/prisma.service';

type MuxAsset = {
  id: string;
  status: string;
  created_at: string;
  duration?: number;
  size?: number;
  title?: string;
  thumbnails?: Array<{ url: string }>;
  playback_ids?: Array<{ id: string }>;
  aspect_ratio?: string;
  views?: number;
  [key: string]: any;
};

type MuxViewsData = {
  video_id: string;
  value: number;
  [key: string]: any;
};

@Injectable()
export class MuxService {
  private readonly logger = new Logger(MuxService.name);
  private readonly muxClient: Mux;

  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const tokenId = this.configService.get<string>('MUX_TOKEN_ID');
    const tokenSecret = this.configService.get<string>('MUX_TOKEN_SECRET');

    if (!tokenId || !tokenSecret) {
      this.logger.warn('Global MUX credentials not configured');
    }

    this.muxClient = new Mux({
      tokenId,
      tokenSecret,
    });
  }

  private async getMuxClientForOrganization(organizationId?: string): Promise<Mux> {
    if (!organizationId) {
      return this.muxClient;
    }

    try {
      // Get organization from database
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization?.muxTokenId || !organization?.muxTokenSecret) {
        this.logger.warn(`Mux credentials not found for organization ${organizationId}, using global credentials`);
        return this.muxClient;
      }

      return new Mux({
        tokenId: organization.muxTokenId,
        tokenSecret: organization.muxTokenSecret,
      });
    } catch (error) {
      this.logger.error(`Error getting Mux client for organization ${organizationId}: ${error.message}`);
      return this.muxClient;
    }
  }

  /**
   * Get all videos from MUX
   */
  async getVideos(organizationId?: string) {
    try {
      const client = await this.getMuxClientForOrganization(organizationId);
      const { data: assets } = await client.video.assets.list({
        limit: 100,
      });

      return (assets as MuxAsset[]).map(asset => ({
        uid: asset.id,
        thumbnail: asset.thumbnails?.[0]?.url || '',
        status: {
          state: asset.status,
        },
        meta: {
          name: asset.title || 'Untitled',
        },
        created: asset.created_at,
        modified: asset.created_at,
        size: asset.size || 0,
        preview: asset.thumbnails?.[0]?.url || '',
        playback: {
          hls: asset.playback_ids?.[0]?.id ? `https://stream.mux.com/${asset.playback_ids[0].id}.m3u8` : null,
          dash: asset.playback_ids?.[0]?.id ? `https://stream.mux.com/${asset.playback_ids[0].id}.mpd` : null,
        },
        duration: asset.duration || 0,
        input: {
          width: asset.aspect_ratio ? Math.round(Number(asset.aspect_ratio) * 100) : null,
          height: 100,
        },
        readyToStream: asset.status === 'ready',
        views: asset.views || 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching videos from MUX', error);
      throw error;
    }
  }

  /**
   * Get analytics data from MUX
   */
  async getAnalytics(organizationId?: string) {
    try {
      const client = await this.getMuxClientForOrganization(organizationId);
      
      // Get the current date and 30 days ago for the time range
      const endTime = new Date();
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - 30);

      // Format dates for Mux API
      const startTimeStr = startTime.toISOString();
      const endTimeStr = endTime.toISOString();

      // Fetch views data for the last 30 days
      const { data: viewsData } = await (client as any).data.query({
        timeframe: ['1d'],
        filters: [],
        group_by: ['video_id'],
        measurement: 'views',
        start_time: startTimeStr,
        end_time: endTimeStr,
      });

      // Fetch assets to get storage usage
      const { data: assets } = await client.video.assets.list({
        limit: 100,
      });

      const assetsWithViews = assets as MuxAsset[];

      // Calculate total views from views data
      const totalViews = viewsData.reduce((sum, data) => sum + (data.value || 0), 0);

      // Calculate storage usage
      const totalStorage = assetsWithViews.reduce((sum, asset) => sum + (asset.size || 0), 0);

      // Get views per video
      const viewsPerVideo = viewsData.map(data => ({
        videoId: data.video_id,
        views: data.value || 0
      }));

      return {
        success: true,
        result: {
          totals: {
            totalVideoViews: totalViews,
            storage: totalStorage,
            viewsPerVideo,
            timeframe: {
              start: startTimeStr,
              end: endTimeStr
            }
          },
        },
      };
    } catch (error) {
      this.logger.error('Error fetching analytics from MUX', error);
      throw error;
    }
  }

  /**
   * Get detailed analytics for a specific video
   */
  async getVideoAnalytics(videoId: string, organizationId?: string) {
    try {
      const client = await this.getMuxClientForOrganization(organizationId);
      
      const endTime = new Date();
      const startTime = new Date();
      startTime.setDate(startTime.getDate() - 30);

      const startTimeStr = startTime.toISOString();
      const endTimeStr = endTime.toISOString();

      // Fetch views data for the specific video
      const { data: viewsData } = await (client as any).data.query({
        timeframe: ['1d'],
        filters: [`video_id:${videoId}`],
        group_by: ['video_id'],
        measurement: 'views',
        start_time: startTimeStr,
        end_time: endTimeStr,
      });

      const totalViews = viewsData.reduce((sum, data) => sum + (data.value || 0), 0);

      return {
        success: true,
        result: {
          videoId,
          views: totalViews,
          timeframe: {
            start: startTimeStr,
            end: endTimeStr
          }
        }
      };
    } catch (error) {
      this.logger.error(`Error fetching analytics for video ${videoId}`, error);
      throw error;
    }
  }
} 