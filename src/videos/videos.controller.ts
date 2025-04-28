import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Req,
  HttpCode,
  BadRequestException,
} from '@nestjs/common';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoDto, VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';

interface AuthenticatedRequest extends Request {
  organization: any;
  user: any;
}

@ApiTags('videos')
@ApiBearerAuth()
@Controller('api/videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get('organization')
  @ApiOperation({ summary: 'Get all videos for an organization' })
  @ApiResponse({ status: 200, description: 'Return all videos for the authenticated organization.' })
  async findAllOrganizationVideos(@Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.videosService.findAll(organizationId);
  }

  @Get('test-cloudflare-connection')
  @Public()
  @ApiOperation({ summary: 'Test the connection to Cloudflare Stream API' })
  @ApiResponse({ status: 200, description: 'Returns the Cloudflare Stream API response.' })
  async testCloudflareConnection() {
    try {
      console.log('Testing Cloudflare Stream API connection...');
      const response = await this.videosService.testCloudflareConnection();
      console.log('Cloudflare Stream API connection test successful!');
      return response;
    } catch (error) {
      console.error('Cloudflare Stream API connection test failed:', error);
      throw new BadRequestException(`Failed to connect to Cloudflare Stream API: ${error.message}`);
    }
  }

  @Get('organization/:id')
  @ApiOperation({ summary: 'Get a video by ID from the organization' })
  @ApiResponse({ status: 200, description: 'Return the video with the specified ID.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async findOrgVideo(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.videosService.findOne(id, organizationId);
  }

  @Post('organization/upload-url')
  @ApiOperation({ summary: 'Get a direct upload URL for Cloudflare Stream and save to organization' })
  @ApiResponse({ status: 201, description: 'Returns an upload URL and video ID.' })
  async createOrgUploadUrl(@Body() createVideoDto: CreateVideoDto, @Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.videosService.createDirectUploadUrl(createVideoDto, organizationId);
  }

  @Put('organization/:id')
  @ApiOperation({ summary: 'Update a video in the organization' })
  @ApiResponse({ status: 200, description: 'The video has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async updateOrgVideo(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req['organization'].id;
    return this.videosService.update(id, updateVideoDto, organizationId);
  }

  @Delete('organization/:id')
  @ApiOperation({ summary: 'Delete a video from the organization' })
  @ApiResponse({ status: 204, description: 'The video has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @HttpCode(204)
  async removeOrgVideo(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    await this.videosService.remove(id, organizationId);
  }

  @Post('organization/:id/sync')
  @ApiOperation({ summary: 'Sync video status with Cloudflare for organization video' })
  @ApiResponse({ status: 200, description: 'Video status has been synced.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async syncOrgVideoStatus(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.videosService.syncVideoStatus(id, organizationId);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook endpoint for Cloudflare Stream events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully.' })
  async webhook(@Body() payload: any) {
    // Here you would typically verify the webhook signature
    // For production, implement signature verification using Cloudflare's webhook signing
    
    try {
      await this.videosService.handleCloudflareWebhook(payload);
      return { success: true };
    } catch (error) {
      throw new BadRequestException('Failed to process webhook');
    }
  }

  // New public endpoints for direct Cloudflare integration

  @Post('get-upload-url')
  @ApiOperation({ summary: 'Get a direct upload URL for Cloudflare Stream' })
  @ApiResponse({ status: 201, description: 'Returns an upload URL and video ID.' })
  @Public()
  async getCloudflareUploadUrl(@Body() dto: GetUploadUrlDto): Promise<UploadUrlResponseDto> {
    return this.videosService.getUploadUrl(dto);
  }

  @Get('status/:videoId')
  @ApiOperation({ summary: 'Check the status of an uploaded video' })
  @ApiResponse({ status: 200, description: 'Returns the video status.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @ApiParam({ name: 'videoId', description: 'The Cloudflare Stream video ID' })
  @Public()
  async getVideoStatus(@Param('videoId') videoId: string): Promise<VideoStatusResponseDto> {
    return this.videosService.getVideoStatus(videoId);
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos from Cloudflare Stream' })
  @ApiResponse({ status: 200, description: 'Returns all videos.' })
  @Public()
  async getAllCloudflareVideos(): Promise<VideoListResponseDto> {
    return this.videosService.getAllVideos();
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get a video by UID' })
  @ApiResponse({ status: 200, description: 'Returns the video with the specified UID.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @ApiParam({ name: 'uid', description: 'The Cloudflare Stream video UID' })
  @Public()
  async getVideoByUid(@Param('uid') uid: string): Promise<SingleVideoResponseDto> {
    return this.videosService.getVideoByUid(uid);
  }
} 