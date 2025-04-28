import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video, VideoStatus, Visibility } from '@prisma/client';
import fetch from 'node-fetch';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoDto, VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';

interface CloudflareResponse {
  success: boolean;
  errors: { message: string }[];
  result: any[];
  result_info?: {
    page: number;
    per_page: number;
    total_count: number;
    count: number;
  };
}

interface CloudflareDirectUploadResponse {
  success: boolean;
  errors?: { message: string }[];
  result: {
    uid: string;
    uploadURL: string;
    [key: string]: any;
  };
}

interface CloudflareVideoStatusResponse {
  success: boolean;
  errors?: { message: string }[];
  result: {
    uid: string;
    readyToStream: boolean;
    duration?: number;
    thumbnail?: string;
    preview?: string;
    [key: string]: any;
  };
}

interface CloudflareWebhookPayload {
  uid: string;
  status?: string;
  duration?: number;
  thumbnail?: string;
  preview?: string;
  [key: string]: any;
}

@Injectable()
export class VideosService {
  private readonly cloudflareAccountId: string;
  private readonly cloudflareApiToken: string;
  private readonly cloudflareBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.cloudflareAccountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID', '');
    this.cloudflareApiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN', '');
    this.cloudflareBaseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/stream`;
  }

  /**
   * Test the connection to the Cloudflare Stream API
   */
  async testCloudflareConnection(): Promise<any> {
    if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
      throw new BadRequestException('Cloudflare credentials are not configured');
    }

    console.log(`Using Cloudflare Account ID: ${this.cloudflareAccountId.slice(0, 3)}...${this.cloudflareAccountId.slice(-3)}`);
    console.log(`API Token configured: ${this.cloudflareApiToken ? 'Yes' : 'No'}`);
    console.log(`Base URL: ${this.cloudflareBaseUrl}`);

    try {
      const response = await fetch(this.cloudflareBaseUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as CloudflareResponse;
      
      console.log('Cloudflare API response status:', response.status);
      console.log('Cloudflare API response success:', data.success);
      
      if (!response.ok) {
        console.error('Error response from Cloudflare:', data.errors);
        throw new BadRequestException(`Failed to connect to Cloudflare: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      return {
        success: data.success,
        status: response.status,
        message: 'Successfully connected to Cloudflare Stream API',
        data: {
          result: data.result,
          resultInfo: data.result_info,
        },
      };
    } catch (error) {
      console.error('Error connecting to Cloudflare:', error);
      throw new BadRequestException(`Failed to connect to Cloudflare: ${error.message}`);
    }
  }

  /**
   * Find all videos belonging to an organization
   */
  async findAll(organizationId: string): Promise<Video[]> {
    return this.prisma.video.findMany({
      where: { organizationId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /**
   * Find a specific video by ID
   */
  async findOne(id: string, organizationId: string): Promise<Video> {
    const video = await this.prisma.video.findUnique({
      where: { id },
    });

    if (!video) {
      throw new NotFoundException(`Video with ID ${id} not found`);
    }

    if (video.organizationId !== organizationId) {
      throw new ForbiddenException('You do not have access to this video');
    }

    return video;
  }

  /**
   * Create a direct upload URL for Cloudflare Stream
   */
  async createDirectUploadUrl(createVideoDto: CreateVideoDto, organizationId: string): Promise<{ uploadUrl: string; videoId: string }> {
    try {
      // Create a direct upload URL with Cloudflare Stream
      const response = await fetch(`${this.cloudflareBaseUrl}/direct_upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600, // 1 hour max duration
          expiry: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
          requireSignedURLs: createVideoDto.visibility === Visibility.PRIVATE,
          creator: organizationId,
          meta: {
            name: createVideoDto.name,
            organizationId,
          },
        }),
      });

      const data = await response.json() as CloudflareDirectUploadResponse;
      
      if (!response.ok) {
        throw new BadRequestException(`Failed to create upload URL: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Create a record in our database
      const video = await this.prisma.video.create({
        data: {
          name: createVideoDto.name,
          description: createVideoDto.description,
          cloudflareId: data.result.uid,
          tags: createVideoDto.tags || [],
          visibility: createVideoDto.visibility || Visibility.PUBLIC,
          status: VideoStatus.PROCESSING,
          organizationId,
          thumbnailUrl: null,
          playbackUrl: null,
        },
      });

      return {
        uploadUrl: data.result.uploadURL,
        videoId: video.id,
      };
    } catch (error) {
      console.error('Error creating direct upload URL:', error);
      throw new BadRequestException('Failed to create upload URL');
    }
  }

  /**
   * Update a video's metadata
   */
  async update(id: string, updateVideoDto: UpdateVideoDto, organizationId: string): Promise<Video> {
    // Check if video exists and belongs to organization
    await this.findOne(id, organizationId);

    // Update in Prisma
    return this.prisma.video.update({
      where: { id },
      data: updateVideoDto,
    });
  }

  /**
   * Delete a video
   */
  async remove(id: string, organizationId: string): Promise<void> {
    // Check if video exists and belongs to organization
    const video = await this.findOne(id, organizationId);

    // Delete from Cloudflare Stream
    try {
      const response = await fetch(`${this.cloudflareBaseUrl}/${video.cloudflareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Error deleting video from Cloudflare:', data);
      }
    } catch (error) {
      console.error('Error deleting video from Cloudflare:', error);
    }

    // Delete from our database
    await this.prisma.video.delete({
      where: { id },
    });
  }

  /**
   * Check the status of a video and update our database
   */
  async syncVideoStatus(id: string, organizationId: string): Promise<Video> {
    const video = await this.findOne(id, organizationId);

    try {
      const response = await fetch(`${this.cloudflareBaseUrl}/${video.cloudflareId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
        },
      });

      const data = await response.json() as CloudflareVideoStatusResponse;
      
      if (!response.ok) {
        throw new BadRequestException(`Failed to get video status: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Update our database with latest information
      return this.prisma.video.update({
        where: { id: video.id },
        data: {
          status: data.result.readyToStream ? VideoStatus.READY : VideoStatus.PROCESSING,
          duration: data.result.duration,
          thumbnailUrl: data.result.thumbnail,
          playbackUrl: data.result.preview,
        },
      });
    } catch (error) {
      console.error('Error syncing video status:', error);
      throw new BadRequestException('Failed to sync video status');
    }
  }

  /**
   * Create a webhook handler for Cloudflare Stream events
   */
  async handleCloudflareWebhook(payload: CloudflareWebhookPayload): Promise<void> {
    if (!payload || !payload.uid) {
      throw new BadRequestException('Invalid webhook payload');
    }

    // Find video by Cloudflare ID
    const video = await this.prisma.video.findUnique({
      where: { cloudflareId: payload.uid },
    });

    if (!video) {
      console.log(`No video found with Cloudflare ID: ${payload.uid}`);
      return;
    }

    // Update video status based on webhook event
    switch (payload.status) {
      case 'ready':
        await this.prisma.video.update({
          where: { id: video.id },
          data: {
            status: VideoStatus.READY,
            duration: payload.duration || video.duration,
            thumbnailUrl: payload.thumbnail || video.thumbnailUrl,
            playbackUrl: payload.preview || video.playbackUrl,
          },
        });
        break;
      case 'error':
        await this.prisma.video.update({
          where: { id: video.id },
          data: {
            status: VideoStatus.ERROR,
          },
        });
        break;
    }
  }

  /**
   * Get a direct upload URL from Cloudflare Stream
   */
  async getUploadUrl(dto: GetUploadUrlDto): Promise<UploadUrlResponseDto> {
    if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
      throw new BadRequestException('Cloudflare credentials are not configured');
    }

    try {
      const response = await fetch(`${this.cloudflareBaseUrl}/direct_upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: dto.maxDurationSeconds,
          expiry: new Date(Date.now() + 1000 * 60 * 30).toISOString(), // 30 minutes from now
        }),
      });

      const data = await response.json() as CloudflareDirectUploadResponse;
      
      if (!response.ok) {
        throw new BadRequestException(`Failed to create upload URL: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      return {
        uploadURL: data.result.uploadURL,
        uid: data.result.uid,
      };
    } catch (error) {
      console.error('Error creating direct upload URL:', error);
      throw new BadRequestException(`Failed to create upload URL: ${error.message}`);
    }
  }

  /**
   * Get the status of a video from Cloudflare Stream
   */
  async getVideoStatus(videoId: string): Promise<VideoStatusResponseDto> {
    if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
      throw new BadRequestException('Cloudflare credentials are not configured');
    }

    try {
      const response = await fetch(`${this.cloudflareBaseUrl}/${videoId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as CloudflareVideoStatusResponse;
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException(`Video with ID ${videoId} not found`);
        }
        throw new BadRequestException(`Failed to get video status: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Create VideoDto from Cloudflare response
      const videoDto: VideoDto = {
        uid: data.result.uid,
        thumbnail: data.result.thumbnail,
        preview: data.result.preview,
        readyToStream: data.result.readyToStream,
        readyToStreamAt: data.result.readyToStreamAt,
        status: {
          state: data.result.status?.state || 'unknown',
          pctComplete: data.result.status?.pctComplete,
          errorReasonCode: data.result.status?.errorReasonCode,
          errorReasonText: data.result.status?.errorReasonText,
        },
        meta: data.result.meta,
        duration: data.result.duration,
        created: data.result.created,
        modified: data.result.modified,
        size: data.result.size,
        input: data.result.input,
        playback: data.result.playback,
      };

      return {
        success: true,
        readyToStream: data.result.readyToStream,
        status: data.result.status?.state || 'unknown',
        video: videoDto,
      };
    } catch (error) {
      console.error('Error getting video status:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get video status: ${error.message}`);
    }
  }

  /**
   * Get all videos from Cloudflare Stream
   */
  async getAllVideos(): Promise<VideoListResponseDto> {
    if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
      throw new BadRequestException('Cloudflare credentials are not configured');
    }

    try {
      const response = await fetch(this.cloudflareBaseUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as CloudflareResponse;
      
      if (!response.ok) {
        throw new BadRequestException(`Failed to get videos: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Convert Cloudflare response to VideoDto array
      const videos: VideoDto[] = data.result.map(item => ({
        uid: item.uid,
        thumbnail: item.thumbnail,
        preview: item.preview,
        readyToStream: item.readyToStream,
        readyToStreamAt: item.readyToStreamAt,
        status: {
          state: item.status?.state || 'unknown',
          pctComplete: item.status?.pctComplete,
          errorReasonCode: item.status?.errorReasonCode,
          errorReasonText: item.status?.errorReasonText,
        },
        meta: item.meta,
        duration: item.duration,
        created: item.created,
        modified: item.modified,
        size: item.size,
        input: item.input,
        playback: item.playback,
      }));

      return {
        success: true,
        status: 200,
        message: 'Videos retrieved successfully',
        data: {
          result: videos,
        },
      };
    } catch (error) {
      console.error('Error getting videos:', error);
      throw new BadRequestException(`Failed to get videos: ${error.message}`);
    }
  }

  /**
   * Get a video by UID from Cloudflare Stream
   */
  async getVideoByUid(uid: string): Promise<SingleVideoResponseDto> {
    if (!this.cloudflareAccountId || !this.cloudflareApiToken) {
      throw new BadRequestException('Cloudflare credentials are not configured');
    }

    try {
      const response = await fetch(`${this.cloudflareBaseUrl}/${uid}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json() as CloudflareVideoStatusResponse;
      
      if (!response.ok) {
        if (response.status === 404) {
          throw new NotFoundException(`Video with UID ${uid} not found`);
        }
        throw new BadRequestException(`Failed to get video: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Create VideoDto from Cloudflare response
      const videoDto: VideoDto = {
        uid: data.result.uid,
        thumbnail: data.result.thumbnail,
        preview: data.result.preview,
        readyToStream: data.result.readyToStream,
        readyToStreamAt: data.result.readyToStreamAt,
        status: {
          state: data.result.status?.state || 'unknown',
          pctComplete: data.result.status?.pctComplete,
          errorReasonCode: data.result.status?.errorReasonCode,
          errorReasonText: data.result.status?.errorReasonText,
        },
        meta: data.result.meta,
        duration: data.result.duration,
        created: data.result.created,
        modified: data.result.modified,
        size: data.result.size,
        input: data.result.input,
        playback: data.result.playback,
      };

      return {
        success: true,
        status: 200,
        message: 'Video retrieved successfully',
        data: {
          result: videoDto,
        },
      };
    } catch (error) {
      console.error('Error getting video:', error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get video: ${error.message}`);
    }
  }
} 