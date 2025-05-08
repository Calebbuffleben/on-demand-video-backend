import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video, VideoStatus, Visibility } from '@prisma/client';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoDto, VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';
import { UpdateOrgCloudflareDto, CloudflareSettingsResponseDto } from './dto/update-org-cloudflare.dto';
import { EmbedVideoDto, EmbedVideoResponseDto } from './dto/embed-video-response.dto';
import { MuxService } from '../providers/mux/mux.service';
import Mux from '@mux/mux-node';
import { GetUploadUrlResponseDto } from './dto/get-upload-url-response.dto';

// Keeping these interfaces for backward compatibility in responses
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
  private readonly logger = new Logger(VideosService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private muxService: MuxService,
  ) {}

  /**
   * Test the connection to the video provider (now MUX)
   */
  async testCloudflareConnection(organizationId?: string): Promise<any> {
    try {
      // Using MUX service instead
      const response = await this.muxService.testMuxConnection(organizationId);
      
      // Format the response to match the old Cloudflare response format
      return {
        success: response.success,
        status: response.status,
        message: 'Successfully connected to Video API',
        data: {
          result: response.data.result,
          resultInfo: {
            count: response.data.result.length,
            page: 1,
            per_page: response.data.result.length,
            total_count: response.data.result.length,
          },
        },
      };
    } catch (error) {
      console.error('Error connecting to Video API:', error);
      throw new BadRequestException(`Failed to connect to Video API: ${error.message}`);
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
   * Create a direct upload URL
   */
  async createDirectUploadUrl(createVideoDto: CreateVideoDto, organizationId: string): Promise<{ uploadUrl: string; videoId: string }> {
    try {
      // Use MUX service to create upload URL
      return await this.muxService.createDirectUploadUrl(
        createVideoDto.name,
        createVideoDto.description || '',
        createVideoDto.visibility || Visibility.PUBLIC,
        createVideoDto.tags || [],
        organizationId
      );
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
    const video = await this.findOne(id, organizationId);
    
    // Update video in database
    return this.prisma.video.update({
      where: { id },
      data: {
        name: updateVideoDto.name,
        description: updateVideoDto.description,
        tags: updateVideoDto.tags,
        visibility: updateVideoDto.visibility,
      },
    });
  }

  /**
   * Delete a video
   */
  async remove(id: string, organizationId: string): Promise<void> {
    // Check if video exists and belongs to organization
    const video = await this.findOne(id, organizationId);
    
    try {
      // If we have a MUX asset ID, delete it from MUX
      if (video.muxAssetId) {
        // Use organization MUX credentials if available
        const { tokenId, tokenSecret } = await this.muxService.getMuxCredentials(organizationId);
        
        // Initialize MUX client
        const muxClient = new Mux({
          tokenId,
          tokenSecret,
        });
        
        // Delete the asset
        await muxClient.video.assets.delete(video.muxAssetId);
      }
      
      // Delete video from database
      await this.prisma.video.delete({
        where: { id },
      });
    } catch (error) {
      console.error('Error removing video:', error);
      throw new BadRequestException(`Failed to remove video: ${error.message}`);
    }
  }

  /**
   * Sync video status with provider
   */
  async syncVideoStatus(id: string, organizationId: string): Promise<Video> {
    // Check if video exists and belongs to organization
    const video = await this.findOne(id, organizationId);
    
    try {
      // If using MUX, check upload status
      if (video.muxUploadId) {
        await this.muxService.checkUploadStatus(id, organizationId);
        
        // Get the updated video
        const updatedVideo = await this.prisma.video.findUnique({
          where: { id },
        });

        if (!updatedVideo) {
          throw new NotFoundException(`Video with ID ${id} not found`);
        }

        return updatedVideo;
      }
      
      // If no MUX upload ID, throw an error
      throw new BadRequestException('Video cannot be synced - no provider ID found');
    } catch (error) {
      console.error('Error syncing video status:', error);
      throw new BadRequestException(`Failed to sync video status: ${error.message}`);
    }
  }

  /**
   * Handle webhook events from Cloudflare Stream
   */
  async handleCloudflareWebhook(payload: CloudflareWebhookPayload): Promise<void> {
    // TODO: Implement this method
  }

  /**
   * Handle webhook events from MUX
   */
  async handleMuxWebhook(payload: any, signature: string): Promise<void> {
    try {
      // Verify the webhook signature
      const isValid = await this.muxService.verifyWebhookSignature(payload, signature);
      
      if (!isValid) {
        this.logger.error('Invalid MUX webhook signature');
        throw new BadRequestException('Invalid webhook signature');
      }
      
      // Handle different event types
      switch (payload.type) {
        case 'video.asset.ready':
          await this.handleMuxAssetReady(payload);
          break;
        case 'video.asset.deleted':
          await this.handleMuxAssetDeleted(payload);
          break;
        case 'video.asset.errored':
          await this.handleMuxAssetError(payload);
          break;
        default:
          this.logger.warn(`Unhandled MUX webhook event type: ${payload.type}`);
      }
    } catch (error) {
      this.logger.error('Error handling MUX webhook:', error);
      throw error;
    }
  }

  /**
   * Map internal video status to a user-friendly string
   */
  private mapVideoStatus(status: VideoStatus): string {
    switch (status) {
      case VideoStatus.PROCESSING:
        return 'processing';
      case VideoStatus.READY:
        return 'ready';
      case VideoStatus.ERROR:
        return 'error';
      case VideoStatus.DELETED:
        return 'deleted';
      default:
        return 'unknown';
    }
  }

  /**
   * Type guard to check if a value is a Video
   */
  private isVideo(value: any): value is Video {
    return value !== null && typeof value === 'object' && 'id' in value;
  }

  /**
   * Get video details for embedding
   */
  async getVideoForEmbed(videoId: string, organizationId?: string): Promise<EmbedVideoResponseDto> {
    // Find the video by UID, MUX Asset ID, or MUX Playback ID
    const video = await this.prisma.video.findFirst({
      where: {
        OR: [
          { id: videoId },
          { muxAssetId: videoId },
          { muxPlaybackId: videoId },
        ],
      },
    });

    if (!this.isVideo(video)) {
      throw new NotFoundException('Video not found');
    }

    // Check if the video is accessible based on visibility settings
    if (video.visibility === Visibility.PRIVATE) {
      throw new ForbiddenException('This video is private');
    }

    // Check organization access
    if (video.visibility === Visibility.ORGANIZATION && (!organizationId || video.organizationId !== organizationId)) {
      throw new ForbiddenException('This video is only accessible to organization members');
    }

    // Format the response
    const embedVideo: EmbedVideoDto = {
      uid: video.id,
      thumbnail: video.thumbnailUrl,
      preview: video.thumbnailUrl,
      readyToStream: video.status === VideoStatus.READY,
      status: {
        state: this.mapVideoStatus(video.status),
      },
      meta: {
        name: video.name,
      },
      duration: video.duration,
      playback: {
        hls: video.playbackUrl,
        dash: video.playbackUrl ? video.playbackUrl.replace('.m3u8', '.mpd') : null,
      },
    };

    return {
      success: true,
      result: embedVideo,
    };
  }

  /**
   * Handle MUX asset ready event
   */
  private async handleMuxAssetReady(payload: any): Promise<void> {
    const { data } = payload;
    
    // Find the video by MUX Asset ID
    const video = await this.prisma.video.findFirst({
      where: { muxAssetId: data.id },
    });
    
    if (!this.isVideo(video)) {
      this.logger.warn(`Video not found for MUX Asset ID: ${data.id}`);
      return;
    }
    
    // Update the video status
    const updatedVideo = await this.prisma.video.update({
      where: { id: video.id },
      data: {
        status: VideoStatus.READY,
        thumbnailUrl: data.thumbnail_url || null,
        playbackUrl: data.playback_url || null,
        duration: Math.round(data.duration || 0),
      },
    });
    
    if (!this.isVideo(updatedVideo)) {
      this.logger.error('Failed to update video');
      return;
    }
    
    this.logger.log(`Video ${updatedVideo.id} is now ready for playback`);
  }

  /**
   * Handle MUX asset deleted event
   */
  private async handleMuxAssetDeleted(payload: any): Promise<void> {
    const { data } = payload;
    
    // Find the video by MUX Asset ID
    const video = await this.prisma.video.findFirst({
      where: { muxAssetId: data.id },
    });
    
    if (!this.isVideo(video)) {
      this.logger.warn(`Video not found for MUX Asset ID: ${data.id}`);
      return;
    }
    
    // Update the video status
    const updatedVideo = await this.prisma.video.update({
      where: { id: video.id },
      data: {
        status: VideoStatus.DELETED,
      },
    });
    
    if (!this.isVideo(updatedVideo)) {
      this.logger.error('Failed to update video');
      return;
    }
    
    this.logger.log(`Video ${updatedVideo.id} has been deleted`);
  }

  /**
   * Handle MUX asset error event
   */
  private async handleMuxAssetError(payload: any): Promise<void> {
    const { data } = payload;
    
    // Find the video by MUX Asset ID
    const video = await this.prisma.video.findFirst({
      where: { muxAssetId: data.id },
    });
    
    if (!this.isVideo(video)) {
      this.logger.warn(`Video not found for MUX Asset ID: ${data.id}`);
      return;
    }
    
    // Update the video status
    const updatedVideo = await this.prisma.video.update({
      where: { id: video.id },
      data: {
        status: VideoStatus.ERROR,
      },
    });
    
    if (!this.isVideo(updatedVideo)) {
      this.logger.error('Failed to update video');
      return;
    }
    
    this.logger.error(`Video ${updatedVideo.id} encountered an error: ${data.errors?.messages?.join(', ')}`);
  }

  /**
   * Get upload URL (public endpoint)
   */
  async getUploadUrl(dto: GetUploadUrlDto): Promise<GetUploadUrlResponseDto> {
    try {
      if (!dto.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      // Create an upload URL with MUX
      const result = await this.muxService.createDirectUploadUrl(
        dto.name || 'Untitled',
        dto.description || '',
        dto.requireSignedURLs ? Visibility.PRIVATE : Visibility.PUBLIC,
        [],
        dto.organizationId
      );
      
      // Format the response to match the expected format
      return {
        success: true,
        status: 200,
        message: 'Upload URL created successfully',
        data: {
          success: true,
          uploadURL: result.uploadUrl,
          uid: result.videoId, // Using the MUX upload ID as uid
        },
      };
    } catch (error) {
      console.error('Error getting upload URL:', error);
      throw new BadRequestException(`Failed to get upload URL: ${error.message}`);
    }
  }

  /**
   * Get video status (public endpoint)
   */
  async getVideoStatus(videoId: string): Promise<VideoStatusResponseDto> {
    try {
      // Find the video by its various potential IDs
      const video = await this.prisma.video.findFirst({
        where: {
          OR: [
            { id: videoId },
            { muxAssetId: videoId },
            { muxPlaybackId: videoId },
            { muxUploadId: videoId },
          ],
        },
      });
      
      if (!video) {
        throw new NotFoundException(`Video with ID ${videoId} not found`);
      }

      // If we have a MUX upload ID, check its status
      if (video.muxUploadId) {
        const uploadStatus = await this.muxService.checkUploadStatus(video.id, video.organizationId);
        
        // Update the video status if needed
        if (uploadStatus.status === 'ready') {
          await this.prisma.video.update({
            where: { id: video.id },
            data: {
              status: VideoStatus.READY,
              thumbnailUrl: uploadStatus.thumbnailUrl,
              playbackUrl: uploadStatus.playbackUrl,
              duration: uploadStatus.duration,
            },
          });
          
          // Get the updated video
          video.status = VideoStatus.READY;
          video.thumbnailUrl = uploadStatus.thumbnailUrl;
          video.playbackUrl = uploadStatus.playbackUrl;
          video.duration = uploadStatus.duration;
        }
      }
      
      // Format the response to match the expected format
      return {
        success: true,
        readyToStream: video.status === VideoStatus.READY,
        status: this.mapVideoStatus(video.status),
        thumbnail: video.thumbnailUrl || '',
        preview: video.thumbnailUrl || '', // MUX doesn't have a separate preview URL
        playback: {
          hls: video.playbackUrl || '',
          dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
        },
        meta: {
          name: video.name,
        },
        uid: video.muxAssetId || video.id,
        duration: video.duration || 0,
      };
    } catch (error) {
      console.error('Error getting video status:', error);
      throw new BadRequestException(`Failed to get video status: ${error.message}`);
    }
  }

  /**
   * Get all videos (public endpoint)
   */
  async getAllVideos(): Promise<VideoListResponseDto> {
    try {
      // Get all ready videos
      const videos = await this.prisma.video.findMany({
        where: {
          status: VideoStatus.READY,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
      
      // Format the response to match the expected format
      const result: VideoDto[] = videos.map(video => ({
        uid: video.muxAssetId || video.id,
        thumbnail: video.thumbnailUrl || '',
        readyToStream: video.status === VideoStatus.READY,
        status: {
          state: this.mapVideoStatus(video.status),
        },
        meta: {
          name: video.name,
        },
        created: video.createdAt.toISOString(),
        modified: video.updatedAt.toISOString(),
        duration: video.duration || 0,
        size: 0, // MUX doesn't provide this directly
        preview: video.thumbnailUrl || '',
        playback: {
          hls: video.playbackUrl || '',
          dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
        },
      }));
      
      return {
        success: true,
        status: 200,
        message: 'Videos retrieved successfully',
        data: {
          result,
          result_info: {
            count: result.length,
            page: 1,
            per_page: result.length,
            total_count: result.length,
          },
        },
      };
    } catch (error) {
      console.error('Error getting all videos:', error);
      throw new BadRequestException(`Failed to get videos: ${error.message}`);
    }
  }

  /**
   * Get a video by UID (public endpoint)
   */
  async getVideoByUid(uid: string): Promise<SingleVideoResponseDto> {
    try {
      // Find the video by its various potential IDs
      const video = await this.prisma.video.findFirst({
        where: {
          OR: [
            { id: uid },
            { muxAssetId: uid },
            { muxPlaybackId: uid },
          ],
        },
      });
      
      if (!video) {
        throw new NotFoundException(`Video with UID ${uid} not found`);
      }
      
      // Format the response to match the expected format
      const result: VideoDto = {
        uid: video.muxAssetId || video.id,
        thumbnail: video.thumbnailUrl || '',
        readyToStream: video.status === VideoStatus.READY,
        status: {
          state: this.mapVideoStatus(video.status),
        },
        meta: {
          name: video.name,
        },
        created: video.createdAt.toISOString(),
        modified: video.updatedAt.toISOString(),
        duration: video.duration || 0,
        size: 0, // MUX doesn't provide this directly
        preview: video.thumbnailUrl || '',
        playback: {
          hls: video.playbackUrl || '',
          dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
        },
      };
      
      return {
        success: true,
        status: 200,
        message: 'Video retrieved successfully',
        data: {
          result,
        },
      };
    } catch (error) {
      console.error('Error getting video by UID:', error);
      throw new BadRequestException(`Failed to get video: ${error.message}`);
    }
  }

  /**
   * Update organization settings (now uses MUX instead of Cloudflare)
   */
  async updateOrgCloudflareSettings(
    updateOrgCloudflareDto: UpdateOrgCloudflareDto,
    organizationId: string
  ): Promise<CloudflareSettingsResponseDto> {
    try {
      // Update the organization with the new settings
      await this.prisma.organization.update({
        where: { id: organizationId },
        data: {
          // Store in MUX fields instead
          muxTokenId: updateOrgCloudflareDto.cloudflareAccountId,
          muxTokenSecret: updateOrgCloudflareDto.cloudflareApiToken,
        },
      });
      
      // Format the response to match the expected format
      return {
        success: true,
        cloudflareAccountId: this.maskString(updateOrgCloudflareDto.cloudflareAccountId),
        cloudflareApiToken: this.maskString(updateOrgCloudflareDto.cloudflareApiToken),
      };
    } catch (error) {
      console.error('Error updating organization settings:', error);
      throw new BadRequestException(`Failed to update settings: ${error.message}`);
    }
  }

  /**
   * Get organization settings (now returns MUX settings)
   */
  async getOrgCloudflareSettings(organizationId: string): Promise<CloudflareSettingsResponseDto> {
    try {
      // Get the organization
      const organization = await this.prisma.organization.findUnique({
        where: { id: organizationId },
        select: {
          muxTokenId: true,
          muxTokenSecret: true,
        },
      });
      
      if (!organization) {
        throw new NotFoundException(`Organization not found`);
      }
      
      // Format the response to match the expected format
      return {
        success: true,
        cloudflareAccountId: this.maskString(organization.muxTokenId || ''),
        cloudflareApiToken: this.maskString(organization.muxTokenSecret || ''),
      };
    } catch (error) {
      console.error('Error getting organization settings:', error);
      throw new BadRequestException(`Failed to get settings: ${error.message}`);
    }
  }

  /**
   * Utility method to mask sensitive strings
   */
  private maskString(input: string): string {
    if (!input || input.length < 4) {
      return input;
    }
    
    const visiblePrefixLength = Math.min(3, Math.floor(input.length / 4));
    const visibleSuffixLength = Math.min(3, Math.floor(input.length / 4));
    
    return (
      input.substring(0, visiblePrefixLength) +
      '*'.repeat(input.length - visiblePrefixLength - visibleSuffixLength) +
      input.substring(input.length - visibleSuffixLength)
    );
  }
} 