import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
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

// Interface for authenticated request with organization
interface AuthenticatedRequest extends Request {
  user: {
    organizationId: string;
  };
}

@ApiTags('analytics')
@Controller('api/analytics')
@UseGuards(AuthGuard('clerk'))
@ApiBearerAuth()
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

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
  async getDashboard(@Req() req: AuthenticatedRequest) {
    const organizationId = req.user?.organizationId;
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
  async getPlatformStats(@Req() req: AuthenticatedRequest) {
    const organizationId = req.user?.organizationId;
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
  async getRecentUploads(
    @Query() query: QueryLimitDto,
    @Req() req: AuthenticatedRequest
  ) {
    const organizationId = req.user?.organizationId;
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
  async getPopularVideos(
    @Query() query: QueryLimitDto,
    @Req() req: AuthenticatedRequest
  ) {
    const organizationId = req.user?.organizationId;
    return this.analyticsService.getPopularVideos(query.limit, organizationId);
  }
} 