import { Controller, Get, Query, UseGuards, Req, Param, NotFoundException, BadRequestException } from '@nestjs/common';
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
import { AuthGuard as AppAuthGuard } from '../auth/guards/auth.guard';
import { OrganizationScoped } from '../common/decorators/organization-scoped.decorator';
import { MuxAnalyticsService } from './services/mux-analytics.service';
import { GetMuxAnalyticsDto, MuxAnalyticsResponseDto } from './dto/mux-analytics.dto';
import { PrismaService } from '../prisma/prisma.service';


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
    private readonly muxAnalyticsService: MuxAnalyticsService,
    private readonly prisma: PrismaService
  ) {}

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
  @ApiOperation({ summary: 'Get analytics for a specific video' })
  @ApiResponse({ status: 200, description: 'Returns video analytics data', type: MuxAnalyticsResponseDto })
  @ApiResponse({ status: 404, description: 'Video not found or not owned by tenant' })
  async getVideoAnalytics(
    @Param('videoId') videoId: string,
    @Query() query: GetMuxAnalyticsDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MuxAnalyticsResponseDto> {
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

    return this.muxAnalyticsService.getVideoAnalytics(
      videoId,
      organizationId,
      query,
    );
  }

  @Get('retention/:videoId')
  @ApiOperation({ summary: 'Get retention data for a specific video' })
  @ApiResponse({ status: 200, description: 'Returns video retention data' })
  @ApiResponse({ status: 404, description: 'Video not found or not owned by tenant' })
  async getVideoRetention(
    @Param('videoId') videoId: string,
    @Query() query: GetMuxAnalyticsDto,
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

    const analytics = await this.muxAnalyticsService.getVideoAnalytics(
      videoId,
      organizationId,
      query,
    );
    return {
      retention: analytics.data.retentionData,
    };
  }

  @Get('views/:videoId')
  @ApiOperation({ summary: 'Get views data for a specific video' })
  @ApiResponse({ status: 200, description: 'Returns video views data' })
  @ApiResponse({ status: 404, description: 'Video not found or not owned by tenant' })
  async getVideoViews(
    @Param('videoId') videoId: string,
    @Query() query: GetMuxAnalyticsDto,
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

    const analytics = await this.muxAnalyticsService.getVideoAnalytics(
      videoId,
      organizationId,
      query,
    );
    return {
      totalViews: analytics.data.totalViews,
      totalWatchTime: analytics.data.averageWatchTime * analytics.data.totalViews,
      averageWatchTime: analytics.data.averageWatchTime,
      viewerTimelines: analytics.data.viewerTimeline,
    };
  }

  /**
   * Get viewer analytics (device, browser, location breakdowns)
   */
  @Get('videos/:videoId/viewer-analytics')
  @ApiOperation({ summary: 'Get viewer analytics breakdown' })
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
    @Query() query: GetMuxAnalyticsDto,
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

    return this.muxAnalyticsService.getViewerAnalytics(videoId, organizationId, query);
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
    @Query() query: GetMuxAnalyticsDto,
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
          // If video has Mux asset ID, get real analytics
          if (video.muxAssetId) {
            const analytics = await this.muxAnalyticsService.getVideoAnalytics(
              video.id,
              organizationId,
              query,
            );

            return {
              videoId: video.id,
              title: video.name || 'Untitled Video',
              retention: analytics.data.retentionData,
              totalViews: analytics.data.totalViews,
              averageWatchTime: analytics.data.averageWatchTime,
            };
          } else {
            // If no Mux asset, return cached analytics or default data
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