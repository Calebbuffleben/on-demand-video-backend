import { Injectable, NotFoundException, ForbiddenException, BadRequestException, Logger, InternalServerErrorException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateVideoDto } from './dto/create-video.dto';
import { R2Service } from '../storage/r2.service';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video, VideoStatus, Visibility } from '@prisma/client';
import { randomUUID } from 'crypto';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { UploadUrlResponseDto } from './dto/upload-url-response.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoDto, VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';
import { UpdateOrgCloudflareDto, CloudflareSettingsResponseDto } from './dto/update-org-cloudflare.dto';
import { EmbedVideoDto, EmbedVideoResponseDto } from './dto/embed-video-response.dto';
import { MuxService } from '../providers/mux/mux.service';
import Mux from '@mux/mux-node';
import { GetUploadUrlResponseDto } from './dto/get-upload-url-response.dto';
import { VideoDisplayOptionsDto } from './dto/video-display-options.dto';
import { VideoEmbedOptionsDto } from './dto/video-embed-options.dto';
import { MultipartInitDto, MultipartPartUrlDto, MultipartCompleteDto, MultipartAbortDto } from './dto/multipart.dto';
import { TranscodeQueue } from '../queue/transcode.queue';
import { JwtPlaybackService } from './jwt-playback.service';
import { VideoProviderFactory } from './providers/video-provider.factory';
import { LimitsService } from '../common/limits.service';

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
    private r2: R2Service,
    private transcodeQueue: TranscodeQueue,
    private jwtPlayback: JwtPlaybackService,
    private providerFactory: VideoProviderFactory,
    private limits: LimitsService,
  ) {}

  /**
   * Test the connection to the video provider (now uses provider factory)
   */
  async testCloudflareConnection(organizationId?: string): Promise<any> {
    try {
      if (organizationId) {
        // Test specific organization's providers
        const results = await this.testAllProviders(organizationId);
        return {
          success: Object.values(results).some(r => r.success),
          status: 200,
          message: 'Provider connection test completed',
          data: { result: results },
        };
      } else {
        // Fallback to MUX service for backward compatibility
        const response = await this.muxService.testMuxConnection(organizationId);
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
      }
    } catch (error) {
      console.error('Error connecting to Video API:', error);
      throw new BadRequestException(`Failed to connect to Video API: ${error.message}`);
    }
  }

  /**
   * Get available providers for an organization
   */
  async getAvailableProviders(organizationId: string) {
    return this.providerFactory.getAvailableProviders(organizationId);
  }

  /**
   * Test all providers for an organization
   */
  async testAllProviders(organizationId: string) {
    return this.providerFactory.testAllProviders(organizationId);
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
    
    // Extract display and embed options
    const { displayOptions, embedOptions, ...basicData } = updateVideoDto;
    
    this.logger.log('Updating video with ID: ' + id);
    this.logger.log('----------- Current video display options: -----------', displayOptions);
    this.logger.log('----------- Current video embed options: -----------', embedOptions);
    
    // Create update data with basic fields
    const updateData: any = {
      ...basicData,
    };
    
    // Add display options fields if provided
    if (displayOptions) {
      this.logger.log('Received new display options:', displayOptions);
      
      updateData.showProgressBar = displayOptions.showProgressBar;
      updateData.showTitle = displayOptions.showTitle;
      updateData.showPlaybackControls = displayOptions.showPlaybackControls;
      updateData.autoPlay = displayOptions.autoPlay;
      updateData.muted = displayOptions.muted;
      updateData.loop = displayOptions.loop;
      updateData.useOriginalProgressBar = displayOptions.useOriginalProgressBar;
      updateData.progressBarColor = displayOptions.progressBarColor;
      updateData.progressEasing = displayOptions.progressEasing;
      updateData.playButtonColor = displayOptions.playButtonColor;
      updateData.playButtonSize = displayOptions.playButtonSize;
      updateData.playButtonBgColor = displayOptions.playButtonBgColor;
      updateData.showSoundControl = displayOptions.showSoundControl;
      
      // Add sound control fields with detailed logging
      if (displayOptions.soundControlText !== undefined) {
        this.logger.log('Updating soundControlText:', {
          current: video.soundControlText,
          new: displayOptions.soundControlText
        });
        updateData.soundControlText = displayOptions.soundControlText;
      }
      
      if (displayOptions.soundControlColor !== undefined) {
        this.logger.log('Updating soundControlColor:', {
          current: video.soundControlColor,
          new: displayOptions.soundControlColor
        });
        updateData.soundControlColor = displayOptions.soundControlColor;
      }
      
      if (displayOptions.soundControlOpacity !== undefined) {
        this.logger.log('Updating soundControlOpacity:', {
          current: video.soundControlOpacity,
          new: displayOptions.soundControlOpacity
        });
        updateData.soundControlOpacity = displayOptions.soundControlOpacity;
      }
      
      if (displayOptions.soundControlSize !== undefined) {
        this.logger.log('Updating soundControlSize:', {
          current: video.soundControlSize,
          new: displayOptions.soundControlSize
        });
        updateData.soundControlSize = displayOptions.soundControlSize;
      }
    }
    
    // Add embed options fields if provided
    if (embedOptions) {
      this.logger.log('Received new embed options:', embedOptions);
      updateData.showVideoTitle = embedOptions.showVideoTitle;
      updateData.showUploadDate = embedOptions.showUploadDate;
      updateData.showMetadata = embedOptions.showMetadata;
      updateData.allowFullscreen = embedOptions.allowFullscreen;
      updateData.responsive = embedOptions.responsive;
      updateData.showBranding = embedOptions.showBranding;
      updateData.showTechnicalInfo = embedOptions.showTechnicalInfo;
    }
    
    // Add CTA fields if provided
    if (typeof updateVideoDto.ctaText !== 'undefined') updateData.ctaText = updateVideoDto.ctaText;
    if (typeof updateVideoDto.ctaButtonText !== 'undefined') updateData.ctaButtonText = updateVideoDto.ctaButtonText;
    if (typeof updateVideoDto.ctaLink !== 'undefined') updateData.ctaLink = updateVideoDto.ctaLink;
    if (typeof updateVideoDto.ctaStartTime !== 'undefined') updateData.ctaStartTime = updateVideoDto.ctaStartTime;
    if (typeof updateVideoDto.ctaEndTime !== 'undefined') updateData.ctaEndTime = updateVideoDto.ctaEndTime;
    
    // Log the final update data
    this.logger.log('Final update data:', {
      displayOptions: {
        soundControlText: updateData.soundControlText,
        soundControlColor: updateData.soundControlColor,
        soundControlOpacity: updateData.soundControlOpacity,
        soundControlSize: updateData.soundControlSize
      }
    });
    //The sound control text is undefined here

    
    // Update video in database
    const updatedVideo = await this.prisma.video.update({
      where: { id },
      data: updateData,
    });

    this.logger.log('Video updated successfully. New sound control values:', {
      soundControlText: updatedVideo.soundControlText,
      soundControlColor: updatedVideo.soundControlColor,
      soundControlOpacity: updatedVideo.soundControlOpacity,
      soundControlSize: updatedVideo.soundControlSize
    });

    return updatedVideo;
  }

  /**
   * Delete a video (full cleanup for INTERNAL provider)
   */
  async remove(id: string, organizationId: string): Promise<void> {
    // Validate ownership
    const video = await this.findOne(id, organizationId);

    this.logger.log(`Starting full deletion for video ${id}`);
    try {
      // Best-effort: cancel transcode job if we track it (optional placeholder)
      try {
        // If your TranscodeQueue supports cancellation by videoId, call it here
        if (this.transcodeQueue && (this.transcodeQueue as any).cancelByVideoId) {
          await (this.transcodeQueue as any).cancelByVideoId(id).catch(() => undefined);
          this.logger.log(`Best-effort cancel for transcode job of video ${id}`);
        }
      } catch {
        // Ignore queue cancellation failures
      }

      // Delete provider artifacts (INTERNAL only)
      if (video.provider === 'INTERNAL' && video.assetKey) {
        const prefixesToDelete: string[] = [];
        // HLS outputs
        prefixesToDelete.push(`${video.assetKey}/hls/`);
        // Thumbnails and VTTs
        prefixesToDelete.push(`${video.assetKey}/thumbs/`);
        // Source uploads (if we stored original)
        prefixesToDelete.push(`${video.assetKey}/uploads/`);
        // Any other leftover under assetKey
        prefixesToDelete.push(`${video.assetKey}/`);

        for (const prefix of prefixesToDelete) {
          try {
            await this.r2.deletePrefix(prefix);
            this.logger.log(`Deleted R2 prefix: ${prefix}`);
          } catch (e) {
            this.logger.warn(`Failed deleting R2 prefix ${prefix}: ${e.message}`);
          }
        }
      }

      // DB cleanup in a transaction
      await this.prisma.$transaction(async (tx) => {
        // Delete analytics events tied to this video
        try {
          await (tx as any).videoPlaybackEvent.deleteMany({ where: { videoId: id } });
          this.logger.log(`Deleted analytics events for video ${id}`);
        } catch (e) {
          this.logger.warn(`Failed deleting analytics events for video ${id}: ${e.message}`);
        }

        // Delete pending video (if any)
        try {
          await tx.pendingVideo.delete({ where: { id } });
          this.logger.log(`Deleted pendingVideo ${id}`);
        } catch {
          // Ignore when not present
        }

        // Finally delete the video row
        await tx.video.delete({ where: { id } });
        this.logger.log(`Deleted video row ${id}`);
      });

      this.logger.log(`Full deletion completed for video ${id}`);
    } catch (error) {
      this.logger.error('Error removing video:', error);
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
   * Generate playback URLs for a video
   */
  private generatePlaybackUrls(video: any): { hls: string | null; dash: string | null } {
    if (video.provider === 'INTERNAL') {
      const appUrl = this.configService.get('APP_URL') || 'http://localhost:4000';
      const hlsUrl = `${appUrl}/api/videos/stream/${video.id}/master.m3u8`;
      const dashUrl = hlsUrl.replace('.m3u8', '.mpd');
      
      return {
        hls: hlsUrl,
        dash: dashUrl,
      };
    }
    
    return {
      hls: video.playbackUrl || null,
      dash: video.playbackUrl ? video.playbackUrl.replace('.m3u8', '.mpd') : null,
    };
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

    // Embed is public for all videos; do not block by visibility

    // Create display options object from explicit fields
    const displayOptions: VideoDisplayOptionsDto = {
      showProgressBar: video.showProgressBar === false ? false : true,
      showTitle: video.showTitle === false ? false : true,
      showPlaybackControls: video.showPlaybackControls === false ? false : true,
      autoPlay: video.autoPlay === true ? true : false,
      muted: video.muted === true ? true : false,
      loop: video.loop === true ? true : false,
      useOriginalProgressBar: video.useOriginalProgressBar === true ? true : false,
      progressBarColor: video.progressBarColor || '#3B82F6',
      progressEasing: video.progressEasing || 0.25,
      playButtonColor: video.playButtonColor || '#FFFFFF',
      playButtonSize: video.playButtonSize || 60,
      playButtonBgColor: video.playButtonBgColor || 'rgba(0,0,0,0.6)',
      soundControlText: video.soundControlText || '',
      soundControlColor: video.soundControlColor || '#FFFFFF',
      soundControlOpacity: video.soundControlOpacity ?? 0.8,
      soundControlSize: video.soundControlSize ?? 64,
      showSoundControl: video.showSoundControl === true,
    };
    
    // Create embed options object from explicit fields
    const embedOptions: VideoEmbedOptionsDto = {
      showVideoTitle: video.showVideoTitle === false ? false : true,
      showUploadDate: video.showUploadDate === false ? false : true,
      showMetadata: video.showMetadata === false ? false : true,
      allowFullscreen: video.allowFullscreen === false ? false : true,
      responsive: video.responsive === false ? false : true,
      showBranding: video.showBranding === false ? false : true,
      showTechnicalInfo: video.showTechnicalInfo === true ? true : false,
    };

    // Build thumbnail URL properly
    let thumbnailUrl = video.thumbnailUrl || '';
    
    // Always build full URL for relative paths
    if (thumbnailUrl && thumbnailUrl.startsWith('/')) {
      const backend = this.configService.get('APP_URL');
      thumbnailUrl = `${backend}${thumbnailUrl}`;
    }

    // Format the response
    const embedVideo: EmbedVideoDto = {
      uid: video.id,
      thumbnail: thumbnailUrl,
      preview: thumbnailUrl,
      readyToStream: video.status === VideoStatus.READY,
      status: {
        state: this.mapVideoStatus(video.status),
      },
      meta: {
        name: video.name,
        displayOptions,
        embedOptions,
      },
      duration: video.duration,
      playback: this.generatePlaybackUrls(video),
      ctaText: video.ctaText,
      ctaButtonText: video.ctaButtonText,
      ctaLink: video.ctaLink,
      ctaStartTime: video.ctaStartTime,
      ctaEndTime: video.ctaEndTime,
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
    
    this.logger.log(`Handling MUX asset ready event for asset ID: ${data.id}`);
    this.logger.log(`MUX asset data: ${JSON.stringify(data, null, 2)}`);
    
    // Find the video by MUX Asset ID
    const video = await this.prisma.video.findFirst({
      where: { muxAssetId: data.id },
    });
    
    if (!this.isVideo(video)) {
      this.logger.warn(`Video not found for MUX Asset ID: ${data.id}`);
      
      // Check if there's a pending video with this asset ID
      const pendingVideo = await this.prisma.pendingVideo.findFirst({
        where: { muxAssetId: data.id },
      });
      
      if (pendingVideo) {
        this.logger.log(`Found pending video with MUX Asset ID: ${data.id}`);
        
        // Get playback ID and create playback URL
        const playbackId = data.playback_ids && data.playback_ids.length > 0 
          ? data.playback_ids[0].id 
          : null;
        
        const playbackUrl = playbackId 
          ? `https://stream.mux.com/${playbackId}.m3u8` 
          : null;
        
        const thumbnailUrl = playbackId 
          ? `https://image.mux.com/${playbackId}/thumbnail.jpg` 
          : null;
        
        this.logger.log(`Creating a new video for MUX Asset ID: ${data.id}`);
        try {
          const newVideo = await this.prisma.video.create({
            data: {
              name: pendingVideo.name,
              description: pendingVideo.description,
              organizationId: pendingVideo.organizationId,
              muxUploadId: pendingVideo.muxUploadId,
              muxAssetId: data.id,
              muxPlaybackId: playbackId,
              playbackUrl: playbackUrl,
              thumbnailUrl: thumbnailUrl,
              tags: pendingVideo.tags,
              visibility: pendingVideo.visibility,
              status: VideoStatus.READY,
              duration: Math.round(data.duration || 0),
              // Set default display options
              showProgressBar: true,
              showTitle: true,
              showPlaybackControls: true,
              autoPlay: false,
              muted: false,
              loop: false,
              useOriginalProgressBar: false,
              progressBarColor: "#3B82F6",
              progressEasing: 0.25,
              playButtonColor: "#FFFFFF",
              playButtonSize: 60,
              playButtonBgColor: "rgba(0,0,0,0.6)",
              // Set default embed options
              showVideoTitle: true,
              showUploadDate: true,
              showMetadata: true,
              allowFullscreen: true,
              responsive: true,
              showBranding: true,
              showTechnicalInfo: false,
            },
          });
          
          this.logger.log(`Created new video with ID: ${newVideo.id}`);
          
          // Delete the pending video
          await this.prisma.pendingVideo.delete({
            where: { id: pendingVideo.id },
          });
          this.logger.log(`Deleted pending video ${pendingVideo.id}`);
        } catch (error) {
          this.logger.error(`Error creating video from pending video: ${error.message}`);
        }
      }
      
      return;
    }
    
    // Get playback ID and create playback URL
    const playbackId = data.playback_ids && data.playback_ids.length > 0 
      ? data.playback_ids[0].id 
      : null;
    
    const playbackUrl = playbackId 
      ? `https://stream.mux.com/${playbackId}.m3u8` 
      : null;
    
    const thumbnailUrl = playbackId 
      ? `https://image.mux.com/${playbackId}/thumbnail.jpg` 
      : null;
    
    // Update the video status
    const updatedVideo = await this.prisma.video.update({
      where: { id: video.id },
      data: {
        status: VideoStatus.READY,
        thumbnailUrl: thumbnailUrl || data.thumbnail_url || null,
        playbackUrl: playbackUrl || data.playback_url || null,
        muxPlaybackId: playbackId,
        duration: Math.round(data.duration || 0),
      },
    });
    
    if (!this.isVideo(updatedVideo)) {
      this.logger.error('Failed to update video');
      return;
    }
    
    this.logger.log(`Video ${updatedVideo.id} is now ready for playback with URL: ${updatedVideo.playbackUrl || 'N/A'}`);
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
   * Get upload URL (public endpoint) - now uses provider factory
   */
  async getUploadUrl(dto: GetUploadUrlDto): Promise<GetUploadUrlResponseDto> {
    try {
      if (!dto.organizationId) {
        this.logger.error('Organization ID is missing in getUploadUrl request');
        throw new BadRequestException('Organization ID is required');
      }

      this.logger.log(`getUploadUrl called with organizationId: ${dto.organizationId}`);

      // Get the appropriate provider for this organization
      const provider = await this.providerFactory.getProvider(dto.organizationId);
      
      this.logger.log(`Using ${provider.name} provider for organization: ${dto.organizationId}`);

      // Enforce plan limits before issuing upload URL
      const expectedMinutes = Math.floor((dto.maxDurationSeconds || 0) / 60);
      const expectedBytes = Number(dto['expectedSizeBytes'] || 0);
      await this.limits.ensureCanUpload(dto.organizationId, expectedMinutes, expectedBytes);

      // Use provider to create upload URL
      const result = await provider.createUploadUrl({
        organizationId: dto.organizationId,
        name: dto.name || 'Untitled',
        description: dto.description || '',
        visibility: dto.requireSignedURLs ? Visibility.PRIVATE : Visibility.PUBLIC,
        tags: [],
        requireSignedURLs: dto.requireSignedURLs,
        maxDurationSeconds: dto.maxDurationSeconds,
      });

      return {
        success: true,
        status: 200,
        message: 'Upload URL created successfully',
        data: {
          success: result.success,
          uploadURL: result.uploadURL,
          uid: result.uid,
        },
      };
    } catch (error) {
      this.logger.error(`Error getting upload URL: ${error.message}`, error.stack);
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) {
        throw error;
      }
      throw new BadRequestException(`Failed to get upload URL: ${error.message}`);
    }
  }

  // Multipart upload flow
  async multipartInit(dto: MultipartInitDto) {
    if (!dto.organizationId) throw new BadRequestException('Organization ID is required');
    const org = await this.prisma.organization.findUnique({ where: { id: dto.organizationId } });
    if (!org) throw new BadRequestException('Organization not found');

    // Enforce plan limits (storage and minutes) before creating pending video
    const expectedMinutes = Math.floor((dto.maxDurationSeconds || 0) / 60);
    const expectedBytes = Number(dto.expectedSizeBytes || 0);
    await this.limits.ensureCanUpload(dto.organizationId, expectedMinutes, expectedBytes);

    const id = randomUUID();
    const assetKey = `org/${dto.organizationId}/video/${id}`;
    const sourceKey = `${assetKey}/uploads/input.mp4`;

    await this.prisma.pendingVideo.create({
      data: {
        id,
        name: dto.name || 'Untitled',
        description: dto.description || '',
        organizationId: dto.organizationId,
        status: VideoStatus.PROCESSING,
        tags: [],
        visibility: Visibility.PUBLIC,
      },
    });

    const { uploadId } = await this.r2.createMultipartUpload(sourceKey, dto.contentType || 'video/mp4');
    return { success: true, data: { uid: id, key: sourceKey, uploadId } };
  }

  async multipartPartUrl(dto: MultipartPartUrlDto) {
    if (!dto.key || !dto.uploadId || !dto.partNumber) throw new BadRequestException('Missing fields');
    const url = await this.r2.getPresignedUploadPartUrl(dto.key, dto.uploadId, dto.partNumber);
    return { success: true, data: { url } };
  }

  async multipartComplete(dto: MultipartCompleteDto) {
    if (!dto.key || !dto.uploadId || !dto.parts?.length) throw new BadRequestException('Missing fields');
    // Best-effort recheck storage cap using actual uploaded size from S3 list
    try {
      const prefix = dto.key.split('/uploads/')[0];
      const listRes = await this.r2.list(prefix);
      const size = (listRes.Contents || [])
        .filter(o => o.Key?.endsWith('input.mp4'))
        .reduce((sum, o) => sum + (typeof o.Size === 'number' ? o.Size : 0), 0);
      await this.limits.ensureCanUpload(dto.organizationId, 0, size);
    } catch {}
    // Normalize parts to S3 format
    const parts = dto.parts.map(p => ({ PartNumber: p.partNumber, ETag: p.eTag }));
    await this.r2.completeMultipartUpload(dto.key, dto.uploadId, parts as any);

    // Get provider and start transcode
    const provider = await this.providerFactory.getProvider(dto.organizationId);
    const assetKey = dto.key.split('/uploads/')[0];
    
    await provider.startTranscode({
      videoId: dto.videoId,
      organizationId: dto.organizationId,
      assetKey,
      sourcePath: dto.key,
    });

    return { success: true };
  }

  async multipartAbort(dto: MultipartAbortDto) {
    if (!dto.key || !dto.uploadId) throw new BadRequestException('Missing fields');
    await this.r2.abortMultipartUpload(dto.key, dto.uploadId);
    return { success: true };
  }

  async handleTranscodeCallback(dto: any) {
    try {
      // Validate basic fields (videoId, assetKey, hlsMasterPath)
      if (!dto?.videoId || !dto?.assetKey || !dto?.hlsMasterPath) {
        throw new BadRequestException('Missing required fields');
      }
      // Normalize HLS master path to a relative path (e.g., "hls/master.m3u8")
      const normalizedHlsPath = typeof dto.hlsMasterPath === 'string' && dto.hlsMasterPath.includes('/hls/')
        ? dto.hlsMasterPath.substring(dto.hlsMasterPath.indexOf('hls/'))
        : dto.hlsMasterPath;
      // Normalize assetKey if the incoming hlsMasterPath was absolute
      const normalizedAssetKey = typeof dto.hlsMasterPath === 'string' && dto.hlsMasterPath.includes('/hls/')
        ? dto.hlsMasterPath.substring(0, dto.hlsMasterPath.indexOf('/hls/'))
        : dto.assetKey;
      let video = await this.prisma.video.findUnique({ where: { id: dto.videoId } });
      if (!video) {
        // Try convert PendingVideo -> Video
        const pending = await this.prisma.pendingVideo.findUnique({ where: { id: dto.videoId } });
        if (!pending) {
          throw new NotFoundException('Video not found');
        }
        video = await this.prisma.video.create({
          data: {
            id: pending.id,
            name: pending.name,
            description: pending.description || '',
            organizationId: pending.organizationId,
            tags: pending.tags,
            visibility: pending.visibility,
            status: VideoStatus.PROCESSING,
          },
        });
        // Best-effort delete pending
        await this.prisma.pendingVideo.delete({ where: { id: pending.id } }).catch(() => undefined);
      }

      const updated = await this.prisma.video.update({
        where: { id: video.id },
        data: {
          provider: 'INTERNAL',
          assetKey: normalizedAssetKey,
          playbackHlsPath: normalizedHlsPath,
          thumbnailPath: dto.thumbnailPath || video.thumbnailUrl || null,
          duration: dto.durationSeconds ?? video.duration,
          status: VideoStatus.READY,
        },
      });

      return { success: true, videoId: updated.id };
    } catch (e) {
      this.logger.error('handleTranscodeCallback error', e);
      throw e;
    }
  }

  async handleTranscodeFailure(dto: any) {
    try {
      // Validate basic fields
      if (!dto?.videoId || !dto?.assetKey || !dto?.error) {
        throw new BadRequestException('Missing required fields');
      }

      this.logger.warn(`Transcode failed for video ${dto.videoId}: ${dto.error}`);

      // Update video status to ERROR
      const updated = await this.prisma.video.update({
        where: { id: dto.videoId },
        data: {
          status: VideoStatus.ERROR,
        },
      });

      this.logger.log(`Video ${dto.videoId} marked as failed due to transcode error`);
      return { success: true, video: updated };
    } catch (error) {
      this.logger.error(`Failed to handle transcode failure: ${error.message}`, error.stack);
      throw error;
    }
  }

  async serveHlsFile(videoId: string, filename: string, res: any) {
    try {
      // Find video and validate access
      const video = await this.prisma.video.findUnique({ where: { id: videoId } });
      if (!video || video.provider !== 'INTERNAL' || !video.assetKey) {
        this.logger.error(`Video not found or not available: ${videoId}, provider: ${video?.provider}, assetKey: ${video?.assetKey}`);
        throw new NotFoundException('Video not found or not available for streaming');
      }

      // Construct R2 path
      const hlsPath = `${video.assetKey}/hls/${filename}`;
      this.logger.log(`Attempting to serve HLS file: ${hlsPath}`);
      
      // Get file from R2
      const { stream, eTag, lastModified } = await this.r2.getObjectStream(hlsPath);
      
      // Set appropriate content type and cache headers based on extension
      let contentType = 'application/octet-stream';
      if (filename.endsWith('.m3u8')) {
        contentType = 'application/vnd.apple.mpegurl';
      } else if (filename.endsWith('.ts')) {
        contentType = 'video/mp2t';
      }
      
      const headers: Record<string, string> = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      };

      if (filename.endsWith('.m3u8')) {
        headers['Cache-Control'] = 'public, max-age=300, stale-while-revalidate=86400';
      } else if (filename.endsWith('.ts')) {
        headers['Cache-Control'] = 'public, max-age=31536000, immutable';
        headers['Accept-Ranges'] = 'bytes';
      } else {
        headers['Cache-Control'] = 'public, max-age=3600';
      }

      if (eTag) headers['ETag'] = eTag;
      if (lastModified) headers['Last-Modified'] = lastModified.toUTCString();

      res.set(headers);
      
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Error serving HLS file: ${error.message}`);
      throw new NotFoundException('HLS file not found');
    }
  }

  async serveThumbnail(videoId: string, res: any) {
    try {
      // Find video and validate access
      const video = await this.prisma.video.findUnique({ where: { id: videoId } });
      if (!video || video.provider !== 'INTERNAL' || !video.assetKey || !video.thumbnailPath) {
        throw new NotFoundException('Thumbnail not found');
      }

      // Construct R2 path
      const thumbnailPath = `${video.assetKey}/${video.thumbnailPath}`;
      
      // Get file from R2
      const { stream } = await this.r2.getObjectStream(thumbnailPath);
      
      res.set({
        'Content-Type': 'image/jpeg',
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Error serving thumbnail: ${error.message}`);
      throw new NotFoundException('Thumbnail not found');
    }
  }

  async serveThumbFile(videoId: string, filename: string, res: any) {
    try {
      // Find video and validate access
      const video = await this.prisma.video.findUnique({ where: { id: videoId } });
      if (!video || video.provider !== 'INTERNAL' || !video.assetKey) {
        throw new NotFoundException('Video not found or not available for streaming');
      }

      // Construct R2 path for thumbnail files
      const thumbPath = `${video.assetKey}/thumbs/${filename}`;
      
      // Get file from R2
      const { stream } = await this.r2.getObjectStream(thumbPath);
      
      // Set appropriate content type
      let contentType = 'application/octet-stream';
      if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
        contentType = 'image/jpeg';
      } else if (filename.endsWith('.vtt')) {
        contentType = 'text/vtt';
      } else if (filename.endsWith('.png')) {
        contentType = 'image/png';
      }
      
      res.set({
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=86400',
        'Access-Control-Allow-Origin': '*'
      });
      
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Error serving thumb file: ${error.message}`);
      throw new NotFoundException('Thumbnail file not found');
    }
  }

  /**
   * Generate JWT token for video playback
   */
  async generatePlaybackToken(videoId: string, organizationId: string, expiryMinutes?: number) {
    // Verify video exists and belongs to organization
    const video = await this.prisma.video.findUnique({ where: { id: videoId } });
    if (!video) {
      throw new NotFoundException('Video not found');
    }
    
    if (video.organizationId !== organizationId) {
      throw new ForbiddenException('Access denied to this video');
    }

    if (video.provider !== 'INTERNAL') {
      throw new BadRequestException('Signed streaming is only available for internal videos');
    }

    const token = this.jwtPlayback.generatePlaybackToken(videoId, organizationId, expiryMinutes);
    
    return {
      success: true,
      token,
      expiresIn: (expiryMinutes || 5) * 60, // in seconds
      videoId,
    };
  }

  /**
   * Get video status (public endpoint) - now uses provider factory
   */
  async getVideoStatus(videoId: string): Promise<VideoStatusResponseDto> {
    try {
      this.logger.log(`Getting video status for ID: ${videoId} (TRACE: ${new Error().stack})`);
      
      // Check if this is a valid UUID - if not, we need to be more flexible with our search
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(videoId);
      this.logger.log(`ID ${videoId} is ${isUuid ? 'a valid UUID' : 'not a UUID'}`);
      
      // Log all videos to see what's available
      const allVideos = await this.prisma.video.findMany({
        take: 10, // Limit to 10 to avoid flooding logs
        orderBy: { createdAt: 'desc' },
      });
      this.logger.log(`Found ${allVideos.length} videos in database. Latest IDs: ${allVideos.map(v => v.id).join(', ')}`);
      
      // Search strategy depends on ID format
      let video;
      
      if (isUuid) {
        // First try to find a video with exact ID match (only if UUID)
        this.logger.log(`Looking for video with exact ID: ${videoId}`);
        video = await this.prisma.video.findUnique({
          where: { id: videoId },
        });
      } 
      
      if (!video) {
        // Try to find by related IDs (or if not UUID)
        this.logger.log(`Looking for video by related IDs: ${videoId}`);
        video = await this.prisma.video.findFirst({
          where: {
            OR: [
              { id: videoId },
              { muxAssetId: videoId },
              { muxPlaybackId: videoId },
              { muxUploadId: videoId },
            ],
          },
        });
        
        if (video) {
          this.logger.log(`Found video by related ID: ${video.id}, matched with field containing ${videoId}`);
        } else {
          this.logger.log(`No video found with any related ID match for ${videoId}`);
        }
      } else {
        this.logger.log(`Found video by exact ID: ${video.id}`);
      }
      
      // If we found a video, return its info
      if (video) {
        this.logger.log(`Returning status for video: ${video.id}, status: ${video.status}`);
        
        // Create display options object from explicit fields
        const displayOptions: VideoDisplayOptionsDto = {
          showProgressBar: video.showProgressBar === false ? false : true,
          showTitle: video.showTitle === false ? false : true,
          showPlaybackControls: video.showPlaybackControls === false ? false : true,
          autoPlay: video.autoPlay === true ? true : false,
          muted: video.muted === true ? true : false,
          loop: video.loop === true ? true : false,
          useOriginalProgressBar: video.useOriginalProgressBar === true ? true : false,
          progressBarColor: video.progressBarColor || '#3B82F6',
          progressEasing: video.progressEasing || 0.25,
          playButtonColor: video.playButtonColor || '#FFFFFF',
          playButtonSize: video.playButtonSize || 60,
          playButtonBgColor: video.playButtonBgColor || 'rgba(0,0,0,0.6)',
          soundControlText: video.soundControlText || '',
          soundControlColor: video.soundControlColor || '#FFFFFF',
          soundControlOpacity: video.soundControlOpacity ?? 0.8,
          soundControlSize: video.soundControlSize ?? 64,
          showSoundControl: video.showSoundControl === true,
        };
        
        // Create embed options object from explicit fields
        const embedOptions: VideoEmbedOptionsDto = {
          showVideoTitle: video.showVideoTitle === false ? false : true,
          showUploadDate: video.showUploadDate === false ? false : true,
          showMetadata: video.showMetadata === false ? false : true,
          allowFullscreen: video.allowFullscreen === false ? false : true,
          responsive: video.responsive === false ? false : true,
          showBranding: video.showBranding === false ? false : true,
          showTechnicalInfo: video.showTechnicalInfo === true ? true : false,
        };
        
        // Use different playback URLs based on provider
        let hlsUrl = '';
        let thumbnailUrl = '';
        
        if (video.provider === 'INTERNAL') {
          // Use backend streaming endpoints (requires JWT token)
          const baseUrl = `${this.configService.get('APP_URL') || 'http://localhost:4000'}/api/videos`;
          hlsUrl = `${baseUrl}/stream/${video.id}/master.m3u8`; // Client will need to add ?token=JWT
          
          if (video.thumbnailPath) {
            thumbnailUrl = `${baseUrl}/thumb/${video.id}/0001.jpg`; // Client will need to add ?token=JWT
          } else if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/')) {
            // Custom uploaded cover
            const backend = this.configService.get('APP_URL') || 'http://localhost:4000';
            thumbnailUrl = `${backend}${video.thumbnailUrl}`;
          }
        } else {
          hlsUrl = video.playbackUrl || '';
          thumbnailUrl = video.thumbnailUrl || '';
        }
          
        const dashUrl = ''; // DASH not supported for internal videos yet

        return {
          success: true,
          video: {
            uid: video.id,
            readyToStream: video.status === VideoStatus.READY && !!hlsUrl,
            status: {
              state: this.mapVideoStatus(video.status)
            },
            thumbnail: thumbnailUrl,
            preview: thumbnailUrl,
            playback: {
              hls: hlsUrl,
              dash: dashUrl,
            },
            meta: {
              name: video.name,
              displayOptions,
              embedOptions,
            },
            duration: video.duration || 100,
          }
        };
      }
      
      // Check for a pending video
      this.logger.log(`Checking for pending video with ID: ${videoId}`);
      
      // Log all pending videos for debugging
      const allPendingVideos = await this.prisma.pendingVideo.findMany({
        take: 10, // Limit to 10 to avoid flooding logs
        orderBy: { createdAt: 'desc' },
      });
      this.logger.log(`Found ${allPendingVideos.length} pending videos. Latest IDs: ${allPendingVideos.map(v => v.id).join(', ')}`);
      
      // Search strategy for pending videos
      let pendingVideo;
      
      if (isUuid) {
        // Try to find pending video by exact ID first (only if UUID)
        pendingVideo = await this.prisma.pendingVideo.findUnique({
          where: { id: videoId },
        });
        
        if (pendingVideo) {
          this.logger.log(`Found pending video by exact ID: ${pendingVideo.id}`);
        }
      }
      
      if (!pendingVideo) {
        // Try to find by related IDs
        pendingVideo = await this.prisma.pendingVideo.findFirst({
          where: {
            OR: [
              { id: videoId },
              { muxUploadId: videoId },
              { muxAssetId: videoId },
            ],
          },
        });
        
        if (pendingVideo) {
          this.logger.log(`Found pending video by related ID: ${pendingVideo.id}`);
        } else {
          this.logger.log(`No pending video found with any ID match`);
        }
      }
      
      if (pendingVideo) {
        this.logger.log(`Found pending video: ${pendingVideo.id}, status: ${pendingVideo.status}`);
        
        // Check upload status with MUX if we have a MUX upload ID
        if (pendingVideo.muxUploadId) {
          try {
            this.logger.log(`Checking upload status for MUX upload ID: ${pendingVideo.muxUploadId}`);
            const uploadStatus = await this.muxService.checkUploadStatus(pendingVideo.id, pendingVideo.organizationId);
            this.logger.log(`MUX upload status: ${JSON.stringify(uploadStatus)}`);
            
            // If the video is now ready, create a video from the pending video
            if (uploadStatus.status === 'ready' && uploadStatus.assetId) {
              this.logger.log(`Upload is ready with asset ID: ${uploadStatus.assetId}`);
              
              // Check if video already exists for this asset
              const existingVideo = await this.prisma.video.findFirst({
                where: { muxAssetId: uploadStatus.assetId }
              });
              
              if (existingVideo) {
                this.logger.log(`Video already exists for asset ID: ${uploadStatus.assetId}`);
                video = existingVideo;
              } else {
                // Create a new video from the pending video
                try {
                  this.logger.log(`Creating new video from pending video: ${pendingVideo.id}`);
                  
                  // Get MUX credentials
                  const { tokenId, tokenSecret } = await this.muxService.getMuxCredentials(pendingVideo.organizationId);
                  
                  // Initialize MUX client
                  const muxClient = new Mux({
                    tokenId,
                    tokenSecret,
                  });
                  
                  // Get asset details to get playback ID
                  const asset = await muxClient.video.assets.retrieve(uploadStatus.assetId);
                  
                  // Get playback ID and create playback URL
                  const playbackId = asset?.playback_ids && asset.playback_ids.length > 0 
                    ? asset.playback_ids[0].id 
                    : null;
                  
                  const playbackUrl = playbackId 
                    ? `https://stream.mux.com/${playbackId}.m3u8` 
                    : null;
                  
                  const thumbnailUrl = playbackId 
                    ? `https://image.mux.com/${playbackId}/thumbnail.jpg` 
                    : null;
                  
                  const newVideo = await this.prisma.video.create({
                    data: {
                      name: pendingVideo.name,
                      description: pendingVideo.description,
                      organizationId: pendingVideo.organizationId,
                      muxUploadId: pendingVideo.muxUploadId,
                      muxAssetId: uploadStatus.assetId,
                      muxPlaybackId: playbackId,
                      playbackUrl: playbackUrl,
                      thumbnailUrl: thumbnailUrl,
                      tags: pendingVideo.tags,
                      visibility: pendingVideo.visibility,
                      status: VideoStatus.READY,
                      duration: Math.round(asset?.duration || 0),
                      // Set default display options
                      showProgressBar: true,
                      showTitle: true,
                      showPlaybackControls: true,
                      autoPlay: false,
                      muted: false,
                      loop: false,
                      useOriginalProgressBar: false,
                      progressBarColor: "#3B82F6",
                      progressEasing: 0.25,
                      playButtonColor: "#FFFFFF",
                      playButtonSize: 60,
                      playButtonBgColor: "rgba(0,0,0,0.6)",
                      // Set default embed options
                      showVideoTitle: true,
                      showUploadDate: true,
                      showMetadata: true,
                      allowFullscreen: true,
                      responsive: true,
                      showBranding: true,
                      showTechnicalInfo: false,
                    },
                  });
                  
                  this.logger.log(`Created new video with ID: ${newVideo.id}`);
                  video = newVideo;
                  
                  // Delete the pending video
                  try {
                    await this.prisma.pendingVideo.delete({
                      where: { id: pendingVideo.id },
                    });
                    this.logger.log(`Deleted pending video ${pendingVideo.id}`);
                  } catch (deleteError) {
                    this.logger.error(`Error deleting pending video: ${deleteError.message}`);
                  }
                } catch (error) {
                  this.logger.error(`Error creating video from pending video: ${error.message}`);
                }
              }
              
              // If we now have a video, return its status
              if (video) {
                return {
                  success: true,
                  video: {
                    uid: video.id,
                    readyToStream: video.status === VideoStatus.READY,
                    status: {
                      state: this.mapVideoStatus(video.status)
                    },
                    thumbnail: video.thumbnailUrl || '',
                    preview: video.thumbnailUrl || '',
                    playback: {
                      hls: video.playbackUrl || '',
                      dash: video.playbackUrl?.replace('.m3u8', '.mpd') || '',
                    },
                    meta: {
                      name: video.name,
                    },
                    duration: video.duration || 100,
                  }
                };
              }
            }
          } catch (checkError) {
            this.logger.error(`Error checking upload status: ${checkError.message}`, checkError.stack);
            // Continue even if check fails, we'll return the pending status
          }
        }
        
        // Return status for a pending video
        return {
          success: true,
          video: {
            uid: pendingVideo.id,
            readyToStream: false,
            status: {
              state: this.mapVideoStatus(VideoStatus.PROCESSING)
            },
            thumbnail: '',
            preview: '',
            playback: {
              hls: '',
              dash: '',
            },
            meta: {
              name: pendingVideo.name,
            },
            duration: 100, // Use a default duration for in-progress videos
          }
        };
      }
      
      // If we get here, no video or pending video was found
      this.logger.warn(`No video or pending video found with ID: ${videoId}`);
      
      // Check MUX directly as a last resort
      if (!isUuid && videoId.length > 10) {
        try {
          this.logger.log(`Checking MUX directly for asset/upload ID: ${videoId}`);
          // This would be a good place to directly check with MUX API
          // but we'll skip for now and assume processing
        } catch (error) {
          this.logger.error(`Error checking MUX directly: ${error.message}`);
        }
      }
      
      // Return a "processing" status even if no pending video found
      // This is more user-friendly when videos are still being processed
      return {
        success: true,
        video: {
          uid: videoId,
          readyToStream: false,
          status: {
            state: "processing"
          },
          thumbnail: '',
          preview: '',
          playback: {
            hls: '',
            dash: '',
          },
          meta: {
            name: 'Video Processing',
          },
          duration: 0,
        }
      };
    } catch (error) {
      this.logger.error(`Error getting video status: ${error.message}`, error.stack);
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
      
      // Map all videos using our mapper function
      const result = videos.map(video => this.mapVideoToDto(video));
      
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
      
      // Format the response using our mapper function
      const result = this.mapVideoToDto(video);
      
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

  /**
   * Map database video to VideoDto with explicit display and embed options
   */
  public mapVideoToDto(video: Video): VideoDto {
    // Create display options object from explicit fields
    const displayOptions: VideoDisplayOptionsDto = {
      showProgressBar: video.showProgressBar === false ? false : true,
      showTitle: video.showTitle === false ? false : true,
      showPlaybackControls: video.showPlaybackControls === false ? false : true,
      autoPlay: video.autoPlay === true ? true : false,
      muted: video.muted === true ? true : false,
      loop: video.loop === true ? true : false,
      useOriginalProgressBar: video.useOriginalProgressBar === true ? true : false,
      progressBarColor: video.progressBarColor || '#3B82F6',
      progressEasing: video.progressEasing || 0.25,
      playButtonColor: video.playButtonColor || '#FFFFFF',
      playButtonSize: video.playButtonSize || 60,
      playButtonBgColor: video.playButtonBgColor || 'rgba(0,0,0,0.6)',
      soundControlText: video.soundControlText || '',
      soundControlColor: video.soundControlColor || '#FFFFFF',
      soundControlOpacity: video.soundControlOpacity ?? 0.8,
      soundControlSize: video.soundControlSize ?? 64,
      showSoundControl: video.showSoundControl === true,
    };
    
    // Create embed options object from explicit fields
    const embedOptions: VideoEmbedOptionsDto = {
      showVideoTitle: video.showVideoTitle === false ? false : true,
      showUploadDate: video.showUploadDate === false ? false : true,
      showMetadata: video.showMetadata === false ? false : true,
      allowFullscreen: video.allowFullscreen === false ? false : true,
      responsive: video.responsive === false ? false : true,
      showBranding: video.showBranding === false ? false : true,
      showTechnicalInfo: video.showTechnicalInfo === true ? true : false,
    };
    
    // Generate appropriate playback URLs based on provider
    let hlsUrl = '';
    let thumbnailUrl = video.thumbnailUrl || '';
    
    if (video.provider === 'INTERNAL') {
      // Use backend streaming endpoints for internal videos
      const baseUrl = `${this.configService.get('APP_URL') || 'http://localhost:4000'}/api/videos`;
      hlsUrl = `${baseUrl}/stream/${video.id}/master.m3u8`;
      
      if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/')) {
        // Custom uploaded cover - prioritize over auto-generated thumbnail
        const backend = this.configService.get('APP_URL');
        thumbnailUrl = `${backend}${video.thumbnailUrl}`;
      } else if (video.thumbnailPath) {
        // Auto-generated thumbnail as fallback
        thumbnailUrl = `${baseUrl}/thumb/${video.id}/0001.jpg`;
      }
    } else {
      // Use MUX or custom uploaded cover URLs for external videos
      hlsUrl = video.playbackUrl || '';
      if (thumbnailUrl && thumbnailUrl.startsWith('/')) {
        const backend = this.configService.get('APP_URL');
        thumbnailUrl = `${backend}${thumbnailUrl}`;
      }
    }

    return {
      uid: video.id,
      thumbnail: thumbnailUrl,
      readyToStream: video.status === VideoStatus.READY && !!hlsUrl,
      status: {
        state: this.mapVideoStatus(video.status),
      },
      meta: {
        name: video.name,
        displayOptions,
        embedOptions,
      },
      created: video.createdAt.toISOString(),
      modified: video.updatedAt.toISOString(),
      duration: video.duration || 0,
      size: 0, // MUX doesn't provide this directly
      preview: thumbnailUrl,
      playback: {
        hls: hlsUrl,
        dash: hlsUrl ? hlsUrl.replace('.m3u8', '.mpd') : '', // DASH not supported for internal videos yet
      },
      ctaText: video.ctaText,
      ctaButtonText: video.ctaButtonText,
      ctaLink: video.ctaLink,
      ctaStartTime: video.ctaStartTime,
      ctaEndTime: video.ctaEndTime,
    };
  }

  /**
   * Serve HLS master playlist with rewritten URLs (public)
   */
  async serveSignedMasterPlaylist(videoId: string, _token: string, res: any, req: any) {
    try {
      // Find video and validate availability
      const video = await this.prisma.video.findUnique({ where: { id: videoId } });
      if (!video || video.provider !== 'INTERNAL' || !video.assetKey || !video.playbackHlsPath) {
        throw new NotFoundException('Video not available for streaming');
      }

      const masterPath = `${video.assetKey}/${video.playbackHlsPath}`;
      const { stream } = await this.r2.getObjectStream(masterPath);

      const chunks: Buffer[] = [];
      stream.on('data', (chunk) => chunks.push(chunk));
      await new Promise((resolve, reject) => {
        stream.on('end', resolve);
        stream.on('error', reject);
      });

      let content = Buffer.concat(chunks).toString('utf-8');

      const baseUrl = `${req.protocol}://${req.get('host')}/api/videos/stream/${videoId}/seg`;
      // Public embed for all: rewrite without token
      content = content.replace(/^(variant_\d+p\.m3u8)$/gm, `${baseUrl}/$1`);

      res.set({
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*',
      });
      res.send(content);
    } catch (error) {
      this.logger.error(`Error serving master playlist: ${error.message}`);
      throw new NotFoundException('Master playlist not found');
    }
  }

  /**
   * Serve HLS variant playlists and segments (public)
   */
  async serveSignedSegment(videoId: string, filename: string, _token: string, res: any, req: any) {
    try {
      // Find video and validate availability
      const video = await this.prisma.video.findUnique({ where: { id: videoId } });
      if (!video || video.provider !== 'INTERNAL' || !video.assetKey) {
        throw new NotFoundException('Video not available for streaming');
      }

      let hlsPath: string;
      let contentType: string;

      if (filename.endsWith('.m3u8')) {
        // Variant playlist
        hlsPath = `${video.assetKey}/hls/${filename}`;
        contentType = 'application/vnd.apple.mpegurl';

        const { stream } = await this.r2.getObjectStream(hlsPath);
        const chunks: Buffer[] = [];
        stream.on('data', (chunk) => chunks.push(chunk));
        await new Promise((resolve, reject) => {
          stream.on('end', resolve);
          stream.on('error', reject);
        });
        let content = Buffer.concat(chunks).toString('utf-8');

        // Rewrite segment URLs without token (public)
        const baseUrl = `${req.protocol}://${req.get('host')}/api/videos/stream/${videoId}/seg`;
        content = content.replace(/^(segment_\d+p_\d+\.ts)$/gm, `${baseUrl}/$1`);

        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=86400',
          'Access-Control-Allow-Origin': '*',
        });
        res.send(content);
        return;
      } else if (filename.endsWith('.ts')) {
        // Segment file
        hlsPath = `${video.assetKey}/hls/${filename}`;
        contentType = 'video/mp2t';
      } else {
        throw new NotFoundException('Invalid file type');
      }

      const { stream, eTag, lastModified } = await this.r2.getObjectStream(hlsPath);
      const segHeaders: Record<string, string> = {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Accept-Ranges': 'bytes',
        'Cache-Control': filename.endsWith('.ts')
          ? 'public, max-age=31536000, immutable'
          : 'public, max-age=300, stale-while-revalidate=86400',
      };
      if (eTag) segHeaders['ETag'] = eTag;
      if (lastModified) segHeaders['Last-Modified'] = lastModified.toUTCString();
      res.set(segHeaders);
      stream.pipe(res);
    } catch (error) {
      this.logger.error(`Error serving segment: ${error.message}`);
      throw new NotFoundException('Segment not found');
    }
  }

  /**
   * Serve signed thumbnails
   */
  async serveSignedThumbnail(videoId: string, filename: string, token: string, res: any, req: any) {
    try {
      // Find video first
      const video = await this.prisma.video.findUnique({ where: { id: videoId } });
      if (!video || video.provider !== 'INTERNAL' || !video.assetKey) {
        throw new NotFoundException('Video not available for streaming');
      }

      // Try to validate token if provided, but don't fail if invalid
      if (token) {
        try {
          const payload = this.jwtPlayback.verifyPlaybackToken(token);
          if (payload.videoId !== videoId) {
            // Token is for different video, but continue anyway for thumbnails
            console.log(`Token mismatch for thumbnail: expected ${videoId}, got ${payload.videoId}`);
          }
        } catch (tokenError) {
          // Token is invalid, but continue for thumbnails
          console.log(`Invalid token for thumbnail: ${tokenError.message}`);
        }
      }

      // Construct R2 path for thumbnail files
      const thumbPath = `${video.assetKey}/thumbs/${filename}`;
      
      try {
        // Get file from R2
        const { stream } = await this.r2.getObjectStream(thumbPath);
        
        // Set appropriate content type
        let contentType = 'application/octet-stream';
        if (filename.endsWith('.jpg') || filename.endsWith('.jpeg')) {
          contentType = 'image/jpeg';
        } else if (filename.endsWith('.vtt')) {
          contentType = 'text/vtt';
        } else if (filename.endsWith('.png')) {
          contentType = 'image/png';
        }
        
        res.set({
          'Content-Type': contentType,
          'Cache-Control': 'public, max-age=86400',
          'Access-Control-Allow-Origin': '*',
          'Accept-Ranges': 'bytes',
          'ETag': `"${filename}-${video.id}"`,
        });
        
        stream.pipe(res);
      } catch (r2Error) {
        // If thumbnail doesn't exist in R2, serve a placeholder
        if (r2Error.message.includes('The specified key does not exist')) {
          console.log(`Thumbnail not found in R2: ${thumbPath}, serving placeholder`);
          
          // Serve a simple SVG placeholder
          const placeholderSvg = `<svg width="320" height="180" xmlns="http://www.w3.org/2000/svg">
            <rect width="100%" height="100%" fill="#1f2937"/>
            <text x="50%" y="50%" font-family="Arial, sans-serif" font-size="16" fill="#9ca3af" text-anchor="middle" dy=".3em">No Thumbnail</text>
          </svg>`;
          
          res.set({
            'Content-Type': 'image/svg+xml',
            'Cache-Control': 'public, max-age=3600',
            'Access-Control-Allow-Origin': '*',
          });
          
          res.send(placeholderSvg);
        } else {
          throw r2Error;
        }
      }
    } catch (error) {
      this.logger.error(`Error serving signed thumbnail: ${error.message}`);
      throw new NotFoundException('Thumbnail not found');
    }
  }
} 
