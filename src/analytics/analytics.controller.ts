import { Controller, Get, Query, UseGuards, Req, Param, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { 
  QueryLimitDto, 
  PlatformStatsDto,
  RecentUploadDto,
  PopularVideoDto,
  DashboardResponseDto
} from './dto/analytics.dto';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
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
@UseGuards(AuthGuard('clerk'))
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
    @Query() query: QueryLimitDto,
    @Req() req: AuthenticatedRequest
  ) {
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
    @Query() query: QueryLimitDto,
    @Req() req: AuthenticatedRequest
  ) {
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
      retention: analytics.retention,
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
      totalViews: analytics.totalViews,
      totalWatchTime: analytics.totalWatchTime,
      averageWatchTime: analytics.averageWatchTime,
      viewerTimelines: analytics.viewerTimelines,
    };
  }
} 