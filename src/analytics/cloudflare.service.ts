import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { CloudflareListVideosResponse, CloudflareVideoResponse, CloudflareAnalyticsResponse } from './interfaces/analytics.interfaces';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';

@Injectable()
export class CloudflareService {
  private readonly logger = new Logger(CloudflareService.name);
  private readonly defaultCloudflareAccountId: string;
  private readonly defaultCloudflareApiToken: string;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {
    this.defaultCloudflareAccountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID', '');
    this.defaultCloudflareApiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN', '');
  }

  /**
   * Get Cloudflare credentials for an organization with fallback to default
   */
  private async getCloudflareCredentials(organizationId?: string): Promise<{
    baseUrl: string;
    apiToken: string;
    accountId: string;
  }> {
    if (!organizationId) {
      if (!this.defaultCloudflareAccountId || !this.defaultCloudflareApiToken) {
        throw new BadRequestException('Default Cloudflare credentials are not configured');
      }
      
      return {
        accountId: this.defaultCloudflareAccountId,
        apiToken: this.defaultCloudflareApiToken,
        baseUrl: `https://api.cloudflare.com/client/v4/accounts/${this.defaultCloudflareAccountId}/stream`,
      };
    }

    // Get organization with Cloudflare credentials
    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
      select: {
        cloudflareAccountId: true,
        cloudflareApiToken: true,
      },
    });

    const accountId = organization?.cloudflareAccountId || this.defaultCloudflareAccountId;
    const apiToken = organization?.cloudflareApiToken || this.defaultCloudflareApiToken;

    if (!accountId || !apiToken) {
      throw new BadRequestException('Cloudflare credentials are not configured');
    }

    const baseUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream`;

    return { baseUrl, apiToken, accountId };
  }

  /**
   * Get list of videos from Cloudflare
   */
  async getVideos(organizationId?: string): Promise<CloudflareVideoResponse[]> {
    const cacheKey = `cloudflare_videos_${organizationId || 'default'}`;
    const cachedVideos = await this.cacheManager.get<CloudflareVideoResponse[]>(cacheKey);
    
    if (cachedVideos) {
      return cachedVideos;
    }

    const { baseUrl, apiToken } = await this.getCloudflareCredentials(organizationId);

    try {
      const response = await fetch(`${baseUrl}/videos?include_counts=true&limit=1000`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as CloudflareListVideosResponse;

      if (!data.success) {
        this.logger.error('Error fetching videos from Cloudflare', data);
        throw new BadRequestException(`Failed to fetch videos from Cloudflare: ${data.result || 'Unknown error'}`);
      }

      // Cache results for 5 minutes
      await this.cacheManager.set(cacheKey, data.result, 60 * 5);
      
      return data.result;
    } catch (error) {
      this.logger.error('Error fetching videos from Cloudflare', error);
      throw new BadRequestException(`Failed to fetch videos from Cloudflare: ${error.message}`);
    }
  }

  /**
   * Get analytics data from Cloudflare
   */
  async getAnalytics(organizationId?: string): Promise<CloudflareAnalyticsResponse> {
    const cacheKey = `cloudflare_analytics_${organizationId || 'default'}`;
    const cachedAnalytics = await this.cacheManager.get<CloudflareAnalyticsResponse>(cacheKey);
    
    if (cachedAnalytics) {
      return cachedAnalytics;
    }

    const { accountId, apiToken } = await this.getCloudflareCredentials(organizationId);

    // Set date range for last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    // Format dates as ISO strings
    const from = startDate.toISOString().split('T')[0];
    const to = endDate.toISOString().split('T')[0];

    try {
      const analyticsUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/stream/analytics/views?metrics=bandwidth,storage,viewer_minutes,video_views&since=${from}&until=${to}`;
      
      const response = await fetch(analyticsUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as CloudflareAnalyticsResponse;

      if (!data.success) {
        this.logger.error('Error fetching analytics from Cloudflare', data);
        throw new BadRequestException(`Failed to fetch analytics from Cloudflare: ${data.result || 'Unknown error'}`);
      }

      // Cache results for 5 minutes
      await this.cacheManager.set(cacheKey, data, 60 * 5);
      
      return data;
    } catch (error) {
      this.logger.error('Error fetching analytics from Cloudflare', error);
      throw new BadRequestException(`Failed to fetch analytics from Cloudflare: ${error.message}`);
    }
  }

  /**
   * Get video details from Cloudflare
   */
  async getVideo(videoId: string, organizationId?: string): Promise<CloudflareVideoResponse> {
    const cacheKey = `cloudflare_video_${videoId}_${organizationId || 'default'}`;
    const cachedVideo = await this.cacheManager.get<CloudflareVideoResponse>(cacheKey);
    
    if (cachedVideo) {
      return cachedVideo;
    }

    const { baseUrl, apiToken } = await this.getCloudflareCredentials(organizationId);

    try {
      const response = await fetch(`${baseUrl}/videos/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!data.success) {
        this.logger.error(`Error fetching video ${videoId} from Cloudflare`, data);
        throw new BadRequestException(`Failed to fetch video from Cloudflare: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Cache results for 5 minutes
      await this.cacheManager.set(cacheKey, data.result, 60 * 5);
      
      return data.result;
    } catch (error) {
      this.logger.error(`Error fetching video ${videoId} from Cloudflare`, error);
      throw new BadRequestException(`Failed to fetch video from Cloudflare: ${error.message}`);
    }
  }
} 