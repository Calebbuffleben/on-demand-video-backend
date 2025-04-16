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
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

interface AuthenticatedRequest extends Request {
  organization: any;
  user: any;
}

@ApiTags('videos')
@ApiBearerAuth()
@Controller('api/videos')
export class VideosController {
  constructor(private readonly videosService: VideosService) {}

  @Get()
  @ApiOperation({ summary: 'Get all videos for an organization' })
  @ApiResponse({ status: 200, description: 'Return all videos for the authenticated organization.' })
  async findAll(@Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.videosService.findAll(organizationId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a video by ID' })
  @ApiResponse({ status: 200, description: 'Return the video with the specified ID.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async findOne(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.videosService.findOne(id, organizationId);
  }

  @Post('upload-url')
  @ApiOperation({ summary: 'Get a direct upload URL for Cloudflare Stream' })
  @ApiResponse({ status: 201, description: 'Returns an upload URL and video ID.' })
  async getUploadUrl(@Body() createVideoDto: CreateVideoDto, @Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.videosService.createDirectUploadUrl(createVideoDto, organizationId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a video' })
  @ApiResponse({ status: 200, description: 'The video has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async update(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req['organization'].id;
    return this.videosService.update(id, updateVideoDto, organizationId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a video' })
  @ApiResponse({ status: 204, description: 'The video has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @HttpCode(204)
  async remove(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    await this.videosService.remove(id, organizationId);
  }

  @Post(':id/sync')
  @ApiOperation({ summary: 'Sync video status with Cloudflare' })
  @ApiResponse({ status: 200, description: 'Video status has been synced.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async syncStatus(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
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
} 