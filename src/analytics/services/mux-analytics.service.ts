import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import Mux from '@mux/mux-node';
import { GetMuxAnalyticsDto, MuxAnalyticsResponseDto, RetentionDataPointDto, ViewerTimelineDto } from '../dto/mux-analytics.dto';
import { ViewerAnalytics, DeviceBreakdown, BrowserBreakdown, LocationBreakdown, OSBreakdown, ConnectionBreakdown } from '../interfaces/analytics.interfaces';

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
    this.logger.debug('Time range params:', JSON.stringify(dto));
    
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
      // Convert dates to UTC if timezone is provided
      let startDate = dto.startDate;
      let endDate = dto.endDate;
      
      if (startDate && endDate) {
        // Convert to Unix timestamps (seconds)
        const start = new Date(startDate);
        const end = new Date(endDate);
        
        // Set start date to beginning of day in UTC
        start.setUTCHours(0, 0, 0, 0);
        // Set end date to end of day in UTC
        end.setUTCHours(23, 59, 59, 999);
        
        // Convert to Unix timestamps (seconds)
        startDate = Math.floor(start.getTime() / 1000).toString();
        endDate = Math.floor(end.getTime() / 1000).toString();
      }

      // Log the formatted dates for debugging
      this.logger.debug('Formatted dates:', { startDate, endDate });

      // Fetch views data from Mux
      const viewsResponse = await muxClient.data.videoViews.list({
        query: {
          filters: [`asset_id:${video.muxAssetId}`],
          timeframe: startDate && endDate ? [startDate, endDate] : undefined,
        }
      });

      // Log raw Mux data for debugging
      this.logger.debug('--------------------------------- Raw Mux data:', JSON.stringify(viewsResponse.data));

      // Process viewer timelines
      const viewerTimelines = viewsResponse.data.map(view => {
        // Convert watch_time from milliseconds to seconds
        const watchTimeInSeconds = Math.floor((view.watch_time || 0) / 1000);

        return {
          timestamp: view.view_start,
          duration: watchTimeInSeconds,
          percentage: (watchTimeInSeconds / (video.duration || 1)) * 100,
        };
      });

      // Calculate retention data
      const retention = this.calculateRetention(viewerTimelines, video.duration || 0);

      // Calculate aggregate metrics
      const totalViews = viewerTimelines.length;
      const totalWatchTime = viewerTimelines.reduce((sum, view) => sum + view.duration, 0);
      const averageWatchTime = totalViews > 0 ? totalWatchTime / totalViews : 0;

      // Format views over time data with granularity
      const viewsOverTime = this.formatViewsOverTime(viewerTimelines, dto.granularity);

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

  private formatViewsOverTime(viewerTimelines: ViewerTimelineDto[], granularity?: number): any[] {
    // Group views by date with granularity
    const viewsByDate = new Map<string, number>();
    
    viewerTimelines.forEach(view => {
      const date = new Date(view.timestamp);
      let key: string;
      
      if (granularity) {
        if (granularity < 60) {
          // Handle second-by-second granularity
          const seconds = date.getSeconds();
          const roundedSeconds = Math.floor(seconds / granularity) * granularity;
          date.setSeconds(roundedSeconds, 0);
        } else {
          // Handle minute-by-minute granularity
          const minutes = date.getMinutes();
          const roundedMinutes = Math.floor(minutes / (granularity / 60)) * (granularity / 60);
          date.setMinutes(roundedMinutes, 0, 0);
        }
        key = date.toISOString();
      } else {
        key = date.toISOString().split('T')[0];
      }
      
      viewsByDate.set(key, (viewsByDate.get(key) || 0) + 1);
    });

    // Convert to array format and sort by date
    return Array.from(viewsByDate.entries())
      .map(([date, views]) => ({
        date,
        views,
      }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
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

  async getViewerAnalytics(
    videoId: string,
    tenantId: string,
    dto: GetMuxAnalyticsDto,
  ): Promise<ViewerAnalytics> {
    this.logger.debug(`Getting viewer analytics for video ${videoId}, tenant ${tenantId}`);
    
    // Get video and verify it belongs to tenant
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        organizationId: tenantId,
      },
      select: {
        muxAssetId: true,
      },
    });

    if (!video || !video.muxAssetId) {
      this.logger.error(`Video not found or not associated with Mux: ${videoId}`);
      throw new Error('Video not found or not associated with Mux');
    }

    this.logger.debug(`Found video with Mux asset ID: ${video.muxAssetId}`);

    // Get tenant Mux credentials
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        muxTokenId: true,
        muxTokenSecret: true,
      },
    });

    // If no Mux credentials, return empty analytics
    if (!organization?.muxTokenId || !organization?.muxTokenSecret) {
      this.logger.warn(`Mux credentials not found for organization ${tenantId}, returning empty viewer analytics`);
      return this.getDefaultViewerAnalytics();
    }

    this.logger.debug(`Found Mux credentials for organization ${tenantId}`);

    // Initialize Mux client
    const muxClient = new Mux({
      tokenId: organization.muxTokenId,
      tokenSecret: organization.muxTokenSecret,
    });

    try {
      // Convert dates to time range if provided
      let timeframe: [string, string] | undefined;
      if (dto.startDate && dto.endDate) {
        const start = new Date(dto.startDate);
        const end = new Date(dto.endDate);
        start.setHours(0, 0, 0, 0);
        end.setHours(23, 59, 59, 999);
        timeframe = [
          Math.floor(start.getTime() / 1000).toString(),
          Math.floor(end.getTime() / 1000).toString()
        ];
        this.logger.debug(`Using timeframe: ${timeframe[0]} to ${timeframe[1]}`);
      } else {
        this.logger.debug('No timeframe specified, using all-time data');
      }

      const filters = [`asset_id:${video.muxAssetId}`];
      this.logger.debug(`Using filters: ${JSON.stringify(filters)}`);

      // First check if we have any views at all
      const totalViewsData = await this.getTotalViews(muxClient, filters, timeframe);
      this.logger.debug(`Total views found: ${totalViewsData}`);

      if (totalViewsData === 0) {
        this.logger.debug('No views found, returning empty analytics');
        return this.getDefaultViewerAnalytics();
      }

      // Fetch all breakdowns in parallel
      this.logger.debug('Fetching viewer analytics breakdowns...');
      const [
        deviceBreakdown,
        browserBreakdown,
        locationBreakdown,
        osBreakdown,
        connectionBreakdown,
      ] = await Promise.all([
        this.getDeviceBreakdown(muxClient, filters, timeframe),
        this.getBrowserBreakdown(muxClient, filters, timeframe),
        this.getLocationBreakdown(muxClient, filters, timeframe),
        this.getOSBreakdown(muxClient, filters, timeframe),
        this.getConnectionBreakdown(muxClient, filters, timeframe),
      ]);

      this.logger.debug(`Fetched breakdown data:
        - Devices: ${deviceBreakdown.length} entries
        - Browsers: ${browserBreakdown.length} entries
        - Locations: ${locationBreakdown.length} entries
        - OS: ${osBreakdown.length} entries
        - Connections: ${connectionBreakdown.length} entries`);

      // Return real data only - no fake sample data
      return {
        devices: deviceBreakdown,
        browsers: browserBreakdown,
        locations: locationBreakdown,
        operatingSystems: osBreakdown,
        connections: connectionBreakdown,
        totalViews: totalViewsData,
      };
    } catch (error) {
      this.logger.error(`Error fetching viewer analytics: ${error.message}`, error.stack);
      // Return empty analytics on error, not sample data
      return this.getDefaultViewerAnalytics();
    }
  }

  private async getDeviceBreakdown(
    muxClient: any,
    filters: string[],
    timeframe?: [string, string]
  ): Promise<DeviceBreakdown[]> {
    try {
      // Get device name breakdown using videoViews endpoint
      const deviceResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'viewer_device_name',
          filters,
          timeframe,
        }
      });

      this.logger.debug('Device name response structure:', JSON.stringify(deviceResponse, null, 2));

      // Get device category breakdown
      const categoryResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'viewer_device_category',
          filters,
          timeframe,
        }
      });

      this.logger.debug('Device category response structure:', JSON.stringify(categoryResponse, null, 2));

      // Get device manufacturer breakdown
      const manufacturerResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'viewer_device_manufacturer',
          filters,
          timeframe,
        }
      });

      this.logger.debug('Device manufacturer response structure:', JSON.stringify(manufacturerResponse, null, 2));

      // Check if we have data and what the structure looks like
      if (deviceResponse.data && deviceResponse.data.length > 0) {
        this.logger.debug('First device data item:', JSON.stringify(deviceResponse.data[0], null, 2));
      }

      // Process the data - videoViews returns individual view records
      const deviceCounts = new Map<string, number>();
      
      deviceResponse.data.forEach((view: any) => {
        const deviceName = view.viewer_device_name || 'Unknown Device';
        deviceCounts.set(deviceName, (deviceCounts.get(deviceName) || 0) + 1);
      });

      const totalViews = Array.from(deviceCounts.values()).reduce((sum, count) => sum + count, 0);
      
      return Array.from(deviceCounts.entries()).map(([deviceName, count]) => {
        const category = this.findCorrelatedValue(categoryResponse.data, deviceName) || 'Unknown';
        const manufacturer = this.findCorrelatedValue(manufacturerResponse.data, deviceName) || 'Unknown';
        
        return {
          device: deviceName,
          category,
          manufacturer,
          views: count,
          percentage: totalViews > 0 ? (count / totalViews) * 100 : 0,
        };
      });
    } catch (error) {
      this.logger.error('Error fetching device breakdown:', error);
      return [];
    }
  }

  private async getBrowserBreakdown(
    muxClient: any,
    filters: string[],
    timeframe?: [string, string]
  ): Promise<BrowserBreakdown[]> {
    try {
      // Get browser breakdown using videoViews endpoint
      const browserResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'viewer_application_name',
          filters,
          timeframe,
        }
      });

      this.logger.debug('Browser response structure:', JSON.stringify(browserResponse, null, 2));

      // Get browser version breakdown
      const versionResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'viewer_application_version',
          filters,
          timeframe,
        }
      });

      this.logger.debug('Browser version response structure:', JSON.stringify(versionResponse, null, 2));

      // Check if we have data and what the structure looks like
      if (browserResponse.data && browserResponse.data.length > 0) {
        this.logger.debug('First browser data item:', JSON.stringify(browserResponse.data[0], null, 2));
      }

      // Process the data - videoViews returns individual view records
      const browserCounts = new Map<string, number>();
      
      browserResponse.data.forEach((view: any) => {
        const browserName = view.viewer_application_name || 'Unknown Browser';
        browserCounts.set(browserName, (browserCounts.get(browserName) || 0) + 1);
      });

      const totalViews = Array.from(browserCounts.values()).reduce((sum, count) => sum + count, 0);
      
      return Array.from(browserCounts.entries()).map(([browserName, count]) => {
        const version = this.findCorrelatedVersion(versionResponse.data, browserName) || 'Unknown';
        
        return {
          browser: browserName,
          version,
          views: count,
          percentage: totalViews > 0 ? (count / totalViews) * 100 : 0,
        };
      });
    } catch (error) {
      this.logger.error('Error fetching browser breakdown:', error);
      return [];
    }
  }

  private async getLocationBreakdown(
    muxClient: any,
    filters: string[],
    timeframe?: [string, string]
  ): Promise<LocationBreakdown[]> {
    try {
      // Get country breakdown using videoViews endpoint
      const countryResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'country',
          filters,
          timeframe,
        }
      });

      // Get region breakdown (if available)
      const regionResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'region',
          filters,
          timeframe,
        }
      }).catch(() => ({ data: [] })); // Region might not be available

      // Process the data - videoViews returns individual view records
      const countryCounts = new Map<string, number>();
      
      countryResponse.data.forEach((view: any) => {
        const country = view.country || 'Unknown Country';
        countryCounts.set(country, (countryCounts.get(country) || 0) + 1);
      });

      const totalViews = Array.from(countryCounts.values()).reduce((sum, count) => sum + count, 0);
      
      return Array.from(countryCounts.entries()).map(([country, count]) => ({
        country,
        countryCode: this.getCountryCode(country) || 'XX',
        region: this.findCorrelatedValue(regionResponse.data, country),
        views: count,
        percentage: totalViews > 0 ? (count / totalViews) * 100 : 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching location breakdown:', error);
      return [];
    }
  }

  private async getOSBreakdown(
    muxClient: any,
    filters: string[],
    timeframe?: [string, string]
  ): Promise<OSBreakdown[]> {
    try {
      // Get OS breakdown using videoViews endpoint
      const osResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'viewer_os_family',
          filters,
          timeframe,
        }
      });

      // Get OS version breakdown
      const versionResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'viewer_os_version',
          filters,
          timeframe,
        }
      });

      // Process the data - videoViews returns individual view records
      const osCounts = new Map<string, number>();
      
      osResponse.data.forEach((view: any) => {
        const os = view.viewer_os_family || 'Unknown OS';
        osCounts.set(os, (osCounts.get(os) || 0) + 1);
      });

      const totalViews = Array.from(osCounts.values()).reduce((sum, count) => sum + count, 0);
      
      return Array.from(osCounts.entries()).map(([os, count]) => ({
        os,
        version: this.findCorrelatedVersion(versionResponse.data, os) || 'Unknown',
        views: count,
        percentage: totalViews > 0 ? (count / totalViews) * 100 : 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching OS breakdown:', error);
      return [];
    }
  }

  private async getConnectionBreakdown(
    muxClient: any,
    filters: string[],
    timeframe?: [string, string]
  ): Promise<ConnectionBreakdown[]> {
    try {
      const connectionResponse = await muxClient.data.videoViews.list({
        query: {
          dimension: 'viewer_connection_type',
          filters,
          timeframe,
        }
      });

      // Process the data - videoViews returns individual view records
      const connectionCounts = new Map<string, number>();
      
      connectionResponse.data.forEach((view: any) => {
        const connectionType = view.viewer_connection_type || 'Unknown Connection';
        connectionCounts.set(connectionType, (connectionCounts.get(connectionType) || 0) + 1);
      });

      const totalViews = Array.from(connectionCounts.values()).reduce((sum, count) => sum + count, 0);
      
      return Array.from(connectionCounts.entries()).map(([connectionType, count]) => ({
        connectionType,
        views: count,
        percentage: totalViews > 0 ? (count / totalViews) * 100 : 0,
      }));
    } catch (error) {
      this.logger.error('Error fetching connection breakdown:', error);
      return [];
    }
  }

  private findCorrelatedVersion(versionData: any[], browserName: string): string | undefined {
    if (!browserName || !versionData || !Array.isArray(versionData)) return undefined;
    
    // Try exact match first
    const exactMatch = versionData.find(d => d.field === browserName);
    if (exactMatch) return exactMatch.field;

    // Try partial match for browser name in version field
    const partialMatch = versionData.find(d => {
      const field = d.field?.toLowerCase() || '';
      const searchKey = browserName.toLowerCase();
      return field.includes(searchKey) || searchKey.includes(field);
    });

    return partialMatch?.field;
  }

  private findCorrelatedValue(data: any[], key: string): string | undefined {
    if (!key || !data || !Array.isArray(data)) return undefined;
    
    // Try exact match first
    const exactMatch = data.find(d => d.field === key);
    if (exactMatch) return exactMatch.field;

    // Try partial match
    const partialMatch = data.find(d => {
      const field = d.field?.toLowerCase() || '';
      const searchKey = key.toLowerCase();
      return field.includes(searchKey) || searchKey.includes(field);
    });

    return partialMatch?.field;
  }

  private getCountryCode(countryName: string): string {
    // Simple mapping - in production you'd want a comprehensive country code lookup
    const countryMap: { [key: string]: string } = {
      'United States': 'US',
      'Canada': 'CA',
      'United Kingdom': 'GB',
      'Germany': 'DE',
      'France': 'FR',
      'Japan': 'JP',
      'Australia': 'AU',
      'Brazil': 'BR',
      'India': 'IN',
      'China': 'CN',
    };
    return countryMap[countryName] || 'XX';
  }

  private getDefaultViewerAnalytics(): ViewerAnalytics {
    return {
      devices: [],
      browsers: [],
      locations: [],
      operatingSystems: [],
      connections: [],
      totalViews: 0,
    };
  }

  private async getTotalViews(
    muxClient: any,
    filters: string[],
    timeframe?: [string, string]
  ): Promise<number> {
    try {
      const params = {
        query: {
          filters,
          dimension: 'video_id',
          timeframe,
          metric: 'video_views'
        }
      };

      this.logger.debug(`Fetching total views with params: ${JSON.stringify(params)}`);
      this.logger.debug(`Mux client structure: ${JSON.stringify(Object.keys(muxClient))}`);
      this.logger.debug(`Mux client.data structure: ${JSON.stringify(Object.keys(muxClient.data || {}))}`);
      this.logger.debug(`Mux client.data.metrics structure: ${JSON.stringify(Object.keys(muxClient.data.metrics || {}))}`);
      
      // Try the correct Mux API structure - use data.metrics (lowercase)
      const response = await muxClient.data.metrics.list(params);

      this.logger.debug(`Raw total views response: ${JSON.stringify(response)}`);

      const totalViews = response?.data?.reduce((total: number, item: any) => {
        return total + (item.value || 0);
      }, 0) || 0;

      this.logger.debug(`Total views calculated: ${totalViews}`);
      return totalViews;
    } catch (error) {
      this.logger.error(`Error fetching total views: ${error.message}`);
      return 0;
    }
  }

  async getBrowserAndDeviceAnalytics(
    assetId: string,
    timeframe: [string, string],
    tokenId: string,
    tokenSecret: string
  ): Promise<{
    browsers: Array<{ browser: string; version: string; views: number; percentage: number }>;
    devices: Array<{ device: string; category: string; manufacturer: string; views: number; percentage: number }>;
  }> {
    try {
      // Initialize Mux client
      const muxClient = new Mux({
        tokenId,
        tokenSecret,
      });

      this.logger.debug(`Fetching analytics for asset: ${assetId}, timeframe: ${timeframe[0]} to ${timeframe[1]}`);
      this.logger.debug(`Mux client structure: ${JSON.stringify(Object.keys(muxClient))}`);
      this.logger.debug(`Mux client.data structure: ${JSON.stringify(Object.keys(muxClient.data || {}))}`);

      // Fetch all breakdowns in parallel
      const [
        browserResponse,
        browserVersionResponse,
        deviceNameResponse,
        deviceCategoryResponse,
        deviceManufacturerResponse,
      ] = await Promise.all([
        // Browser breakdown
        muxClient.data.metrics.list({
          query: {
            dimension: 'viewer_application_name',
            filters: [`asset_id:${assetId}`],
            timeframe,
            metric: 'video_views'
          }
        }),
        // Browser version breakdown
        muxClient.data.metrics.list({
          query: {
            dimension: 'viewer_application_version',
            filters: [`asset_id:${assetId}`],
            timeframe,
            metric: 'video_views'
          }
        }),
        // Device name breakdown
        muxClient.data.metrics.list({
          query: {
            dimension: 'viewer_device_name',
            filters: [`asset_id:${assetId}`],
            timeframe,
            metric: 'video_views'
          }
        }),
        // Device category breakdown
        muxClient.data.metrics.list({
          query: {
            dimension: 'viewer_device_category',
            filters: [`asset_id:${assetId}`],
            timeframe,
            metric: 'video_views'
          }
        }),
        // Device manufacturer breakdown
        muxClient.data.metrics.list({
          query: {
            dimension: 'viewer_device_manufacturer',
            filters: [`asset_id:${assetId}`],
            timeframe,
            metric: 'video_views'
          }
        }),
      ]);

      // Log raw responses for debugging
      this.logger.debug('************************Browser response:', JSON.stringify(browserResponse));
      this.logger.debug('************************Browser version response:', JSON.stringify(browserVersionResponse));
      this.logger.debug('************************Device name response:', JSON.stringify(deviceNameResponse));
      this.logger.debug('************************Device category response:', JSON.stringify(deviceCategoryResponse));
      this.logger.debug('************************Device manufacturer response:', JSON.stringify(deviceManufacturerResponse));

      // Process browser data
      const totalBrowserViews = browserResponse.data.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      const browsers = browserResponse.data.map((item: any) => {
        const browserName = item.field || 'Unknown';
        const version = this.findCorrelatedVersion(browserVersionResponse.data, browserName);
        
        return {
          browser: browserName,
          version: version || 'Unknown',
          views: item.value || 0,
          percentage: totalBrowserViews > 0 ? ((item.value || 0) / totalBrowserViews) * 100 : 0,
        };
      });

      // Process device data
      const totalDeviceViews = deviceNameResponse.data.reduce((sum: number, item: any) => sum + (item.value || 0), 0);
      const devices = deviceNameResponse.data.map((item: any) => {
        const deviceName = item.field || 'Unknown';
        const category = this.findCorrelatedValue(deviceCategoryResponse.data, deviceName) || 'Unknown';
        const manufacturer = this.findCorrelatedValue(deviceManufacturerResponse.data, deviceName) || 'Unknown';
        
        return {
          device: deviceName,
          category,
          manufacturer,
          views: item.value || 0,
          percentage: totalDeviceViews > 0 ? ((item.value || 0) / totalDeviceViews) * 100 : 0,
        };
      });

      this.logger.debug(`Processed ${browsers.length} browsers and ${devices.length} devices`);

      return {
        browsers,
        devices,
      };
    } catch (error) {
      this.logger.error(`Error fetching browser and device analytics: ${error.message}`, error.stack);
      return {
        browsers: [],
        devices: [],
      };
    }
  }
} 