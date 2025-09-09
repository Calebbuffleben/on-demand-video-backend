import { Controller, Get, Post, Body, Query, UseGuards, Req, Param, NotFoundException, BadRequestException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { 
  GetVideosLimitDto, 
  PlatformStatsDto,
  RecentUploadDto,
  PopularVideoDto,
  DashboardResponseDto,
  ViewerAnalyticsDto,
} from './dto/analytics.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { AuthGuard as AppAuthGuard } from '../auth/guards/auth.guard';
import { OrganizationScoped } from '../common/decorators/organization-scoped.decorator';
// Removed Mux analytics dependencies
import { PrismaService } from '../prisma/prisma.service';
import { EventsTimeRangeDto } from './dto/events-time-range.dto';


// Interface for authenticated request with organization
interface AuthenticatedRequest extends Request {
  user: {
    organizationId: string;
  };
  organization: any;
}

@ApiTags('analytics')
@Controller('api/analytics')
@OrganizationScoped()
@UseGuards(AppAuthGuard)
@ApiBearerAuth()
export class AnalyticsController {
  constructor(
    private readonly analyticsService: AnalyticsService,
    private readonly prisma: PrismaService
  ) {}

  /**
   * Collect raw video playback events from clients
   */
  @Post('events')
  @Public()
  @ApiOperation({ summary: 'Ingest video player events (play, pause, ended, timeupdate)' })
  @ApiResponse({ status: 200, description: 'Event stored' })
  async ingestEvent(@Body() body: any, @Req() req: any) {
    const {
      videoId,
      eventType,
      currentTime = 0,
      duration = 0,
      userId,
      sessionId,
      clientId,
      organizationId
    } = body || {};

    if (!videoId || !eventType) {
      throw new BadRequestException('videoId and eventType are required');
    }

    // Basic normalization
    const normalizedEventType = String(eventType).toLowerCase();
    const clampedCurrent = Math.max(0, Math.floor(Number(currentTime) || 0));
    const clampedDuration = Math.max(0, Math.floor(Number(duration) || 0));

    // Persist using Prisma directly to avoid auth guard
    const xff = (req.headers['x-forwarded-for'] as string | undefined) || '';
    const ip = xff.split(',')[0]?.trim().replace(/:\d+$/, '') || (req.ip as string | undefined);
    const userAgent = req.headers['user-agent'] || undefined;

    await (this.prisma as any).videoPlaybackEvent.create({
      data: {
        videoId,
        organizationId: organizationId || req['organization']?.id || null,
        userId: userId || req['user']?.id || null,
        sessionId: sessionId || null,
        clientId: clientId || null,
        eventType: normalizedEventType,
        currentTime: clampedCurrent,
        duration: clampedDuration,
        ip: ip || null,
        userAgent: userAgent as string | undefined,
      },
    });

    return { success: true };
  }

  /**
   * Aggregated: views, watch time, and retention buckets
   */
  @Get('events/summary/:videoId')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get aggregated analytics from collected events' })
  async getEventsSummary(
    @Param('videoId') videoId: string,
    @Query('bucketSize') bucketSizeParam: string,
    @Query('perSecond') perSecondParam: string,
    @Query() range: EventsTimeRangeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Verify video exists and belongs to org when available
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');

    const views = await this.analyticsService.getUniqueViews(videoId, range);
    const watchTime = await this.analyticsService.getWatchTimeSeconds(videoId, range);
    const duration = video.duration || 0;
    const bucketSize = Math.max(1, Math.min(60, parseInt(bucketSizeParam || '10', 10) || 10));
    const retention = await this.analyticsService.getRetentionBuckets(videoId, duration, bucketSize, range);
    const perSecond = perSecondParam === 'true';
    const retentionPerSecond = perSecond ? await this.analyticsService.getSecondBySecondRetention(videoId, duration, range) : undefined;

    return { success: true, data: { views, watchTime, duration, retention, retentionPerSecond, bucketSize } };
  }

  /**
   * Insights: quartiles, completion, replays, heatmap, drop-offs
   */
  @Get('events/insights/:videoId')
  @UseGuards(AppAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get analytics insights from collected events' })
  async getEventsInsights(
    @Param('videoId') videoId: string,
    @Query() range: EventsTimeRangeDto,
    @Query('bucketSize') bucketSizeParam: string,
    @Query('topDropOffs') topDropParam: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) throw new NotFoundException('Video not found');
    const duration = video.duration || 0;
    const bucketSize = Math.max(1, Math.min(60, parseInt(bucketSizeParam || '5', 10) || 5));
    const topDropOffs = Math.max(1, Math.min(20, parseInt(topDropParam || '5', 10) || 5));
    const insights = await this.analyticsService.getEventsInsights(videoId, duration, range, bucketSize, topDropOffs);
    return { success: true, data: insights };
  }

  /**
   * Get combined dashboard data
   */
  @Get('dashboard')
  @ApiOperation({ summary: 'Get all dashboard analytics data' })
  @ApiResponse({
    status: 200,
    description: 'Returns all dashboard statistics including platform stats, recent uploads, and popular videos',
    type: DashboardResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getDashboard(@Req() req: AuthenticatedRequest) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;
    
    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.analyticsService.getDashboardData(organizationId);
  }

  /**
   * Get platform statistics
   */
  @Get('platform-stats')
  @ApiOperation({ summary: 'Get platform statistics' })
  @ApiResponse({
    status: 200,
    description: 'Returns platform statistics including total videos, views, storage and bandwidth',
    type: PlatformStatsDto,
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getPlatformStats(@Req() req: AuthenticatedRequest) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.analyticsService.getPlatformStats(organizationId);
  }

  /**
   * Get recent uploads
   */
  @Get('recent-uploads')
  @ApiOperation({ summary: 'Get most recently uploaded videos' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of recently uploaded videos',
    type: [RecentUploadDto],
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getRecentUploads(
    @Query() query: GetVideosLimitDto,
    @Req() req: AuthenticatedRequest
  ) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.analyticsService.getRecentUploads(query.limit, organizationId);
  }

  /**
   * Get popular videos
   */
  @Get('popular-videos')
  @ApiOperation({ summary: 'Get most viewed videos' })
  @ApiResponse({
    status: 200,
    description: 'Returns a list of videos sorted by view count',
    type: [PopularVideoDto],
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getPopularVideos(
    @Query() query: GetVideosLimitDto,
    @Req() req: AuthenticatedRequest
  ) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    return this.analyticsService.getPopularVideos(query.limit, organizationId);
  }

  @Get('videos/:videoId')
  @ApiOperation({ summary: 'Get analytics for a specific video (internal only)' })
  @ApiResponse({ status: 200, description: 'Returns video analytics data' })
  @ApiResponse({ status: 404, description: 'Video not found or not owned by tenant' })
  async getVideoAnalytics(
    @Param('videoId') videoId: string,
    @Query() range: EventsTimeRangeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;

    // Verify video ownership
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        organizationId,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found or not owned by tenant');
    }

    // Fallback: build analytics from internal playback events
    const views = await this.analyticsService.getUniqueViews(videoId, range);
    const watchTime = await this.analyticsService.getWatchTimeSeconds(videoId, range);
    const duration = video.duration || 0;
    const retentionPerSecond = await this.analyticsService.getSecondBySecondRetention(videoId, duration, range);
    const retentionData = retentionPerSecond.map(p => ({ time: p.time, retention: p.pct }));

    return {
      success: true,
      data: {
        totalViews: views,
        averageWatchTime: views ? Math.round(watchTime / views) : 0,
        engagementRate: 0,
        uniqueViewers: views,
        viewsOverTime: [],
        retentionData,
        viewerTimeline: [],
      }
    };
  }

  @Get('retention/:videoId')
  @ApiOperation({ summary: 'Get retention data for a specific video' })
  @ApiResponse({ status: 200, description: 'Returns video retention data' })
  @ApiResponse({ status: 404, description: 'Video not found or not owned by tenant' })
  async getVideoRetention(
    @Param('videoId') videoId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;
    
    // Verify video ownership
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        organizationId,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found or not owned by tenant');
    }

    const duration = video.duration || 0;
    const sbs = await this.analyticsService.getSecondBySecondRetention(videoId, duration);
    return { retention: sbs.map(p => ({ time: p.time, retention: p.pct })) };
  }

  @Get('views/:videoId')
  @ApiOperation({ summary: 'Get views data for a specific video' })
  @ApiResponse({ status: 200, description: 'Returns video views data' })
  @ApiResponse({ status: 404, description: 'Video not found or not owned by tenant' })
  async getVideoViews(
    @Param('videoId') videoId: string,
    @Query() range: EventsTimeRangeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;

    // Verify video ownership
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        organizationId,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found or not owned by tenant');
    }

    const totalViews = await this.analyticsService.getUniqueViews(videoId, range);
    const totalWatchTime = await this.analyticsService.getWatchTimeSeconds(videoId, range);
    const averageWatchTime = totalViews ? Math.round(totalWatchTime / totalViews) : 0;
    return { totalViews, totalWatchTime, averageWatchTime, viewerTimelines: [] };
  }

  /**
   * Get viewer analytics (device, browser, location breakdowns)
   */
  @Get('videos/:videoId/viewer-analytics')
  @ApiOperation({ summary: 'Get viewer analytics breakdown (internal only)' })
  @ApiParam({
    name: 'videoId',
    description: 'Video ID to get viewer analytics for',
    example: 'abc123',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns viewer analytics breakdown including device, browser, and location data',
    type: ViewerAnalyticsDto,
  })
  async getViewerAnalytics(
    @Param('videoId') videoId: string,
    @Query() range: EventsTimeRangeDto,
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;

    // Verify video ownership
    const video = await this.prisma.video.findFirst({
      where: {
        id: videoId,
        organizationId,
      },
    });

    if (!video) {
      throw new NotFoundException('Video not found or not owned by tenant');
    }

    const viewerAnalytics = await this.analyticsService.getViewerAnalyticsFromEvents(videoId, range);
    return { success: true, data: viewerAnalytics };
  }

  /**
   * Get retention data for all videos in organization
   */
  @Get('organization/retention')
  @ApiOperation({ summary: 'Get retention data for all videos in organization' })
  @ApiResponse({
    status: 200,
    description: 'Returns retention data for all videos in the organization',
  })
  @ApiResponse({ status: 404, description: 'Organization not found' })
  async getOrganizationRetention(
    @Req() req: AuthenticatedRequest,
  ) {
    // Check if organization exists in request
    if (!req['organization']) {
      throw new BadRequestException('Organization context not found. Please ensure you are accessing this endpoint with proper organization context.');
    }
    
    const organizationId = req['organization'].id;

    // Verify organization exists
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });

    if (!organization) {
      throw new NotFoundException('Organization not found');
    }

    // Get all videos for organization
    const videos = await this.prisma.video.findMany({
      where: { organizationId },
      select: {
        id: true,
        name: true,
        duration: true,
        muxAssetId: true,
        analytics: {
          select: {
            views: true,
            watchTime: true,
            retention: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Get retention data for each video
    const retentionData = await Promise.all(
      videos.map(async (video) => {
        try {
          // Internal analytics only
          {
            const cachedAnalytics = video.analytics;
            if (cachedAnalytics && cachedAnalytics.retention) {
              const retention = typeof cachedAnalytics.retention === 'string' 
                ? JSON.parse(cachedAnalytics.retention) 
                : cachedAnalytics.retention;

              return {
                videoId: video.id,
                title: video.name || 'Untitled Video',
                retention: retention,
                totalViews: cachedAnalytics.views || 0,
                averageWatchTime: cachedAnalytics.watchTime || 0,
              };
            } else {
              // Return default data for videos without analytics
              const defaultRetention = this.generateDefaultRetention(video.duration || 300);
              return {
                videoId: video.id,
                title: video.name || 'Untitled Video',
                retention: defaultRetention,
                totalViews: 0,
                averageWatchTime: 0,
              };
            }
          }
        } catch (error) {
          console.error(`Error getting analytics for video ${video.id}:`, error);
          // Return default data on error
          const defaultRetention = this.generateDefaultRetention(video.duration || 300);
          return {
            videoId: video.id,
            title: video.name || 'Untitled Video',
            retention: defaultRetention,
            totalViews: 0,
            averageWatchTime: 0,
          };
        }
      })
    );

    return {
      success: true,
      data: retentionData,
    };
  }

  /**
   * Generate default retention data for videos without analytics
   */
  private generateDefaultRetention(duration: number): Array<{ time: number; retention: number }> {
    const retentionPoints: Array<{ time: number; retention: number }> = [];
    const maxRetention = 85; // Default max retention percentage
    
    for (let second = 0; second <= duration; second++) {
      const progress = second / duration;
      const retention = Math.max(0, maxRetention * Math.exp(-progress * 1.2));
      
      retentionPoints.push({
        time: second,
        retention: Math.min(100, Math.max(0, retention)),
      });
    }
    
    return retentionPoints;
  }
} 