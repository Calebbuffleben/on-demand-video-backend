import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Mux from '@mux/mux-node';

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
  [key: string]: any;
};

@Injectable()
export class MuxService {
  private readonly logger = new Logger(MuxService.name);
  private readonly muxClient: Mux;

  constructor(private configService: ConfigService) {
    const tokenId = this.configService.get<string>('MUX_TOKEN_ID');
    const tokenSecret = this.configService.get<string>('MUX_TOKEN_SECRET');

    if (!tokenId || !tokenSecret) {
      throw new Error('MUX credentials not configured');
    }

    this.muxClient = new Mux({
      tokenId,
      tokenSecret,
    });
  }

  /**
   * Get all videos from MUX
   */
  async getVideos(organizationId?: string) {
    try {
      const { data: assets } = await this.muxClient.video.assets.list({
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
      const { data: metrics } = await this.muxClient.video.assets.list({
        limit: 100,
      });

      // Calculate totals from metrics
      const totals = {
        totalVideoViews: metrics.length,
        storage: metrics.reduce((sum, asset: MuxAsset) => sum + (asset.size || 0), 0),
        bandwidth: 0, // MUX doesn't provide this directly
      };

      return {
        success: true,
        result: {
          totals,
        },
      };
    } catch (error) {
      this.logger.error('Error fetching analytics from MUX', error);
      throw error;
    }
  }
} 