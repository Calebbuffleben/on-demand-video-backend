import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { MuxService } from '../../providers/mux/mux.service';
import { VideoStatus, Visibility } from '@prisma/client';
import {
  VideoProvider,
  CreateUploadUrlRequest,
  CreateUploadUrlResponse,
  VideoStatusRequest,
  VideoStatusResponse,
  StartTranscodeRequest,
  StartTranscodeResponse,
  GeneratePlaybackTokenRequest,
  GeneratePlaybackTokenResponse,
} from './video-provider.interface';

@Injectable()
export class MuxProvider extends VideoProvider {
  readonly name = 'MUX';
  readonly supportsDirectUpload = true;
  readonly supportsSignedPlayback = false;

  private readonly logger = new Logger(MuxProvider.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private muxService: MuxService,
  ) {
    super();
  }

  async createUploadUrl(request: CreateUploadUrlRequest): Promise<CreateUploadUrlResponse> {
    try {
      // Use existing MuxService to create upload URL
      const result = await this.muxService.createDirectUploadUrl(
        request.name,
        request.description || '',
        request.visibility || Visibility.PUBLIC,
        request.tags || [],
        request.organizationId
      );

      this.logger.log(`Created MUX upload URL for video: ${result.videoId}`);

      return {
        success: true,
        uploadURL: result.uploadUrl,
        uid: result.videoId,
        // MUX URLs typically expire in 24 hours
        expiresAt: new Date(Date.now() + 24 * 3600 * 1000),
      };
    } catch (error) {
      this.logger.error(`Error creating MUX upload URL: ${error.message}`, error.stack);
      throw error;
    }
  }

  async getVideoStatus(request: VideoStatusRequest): Promise<VideoStatusResponse> {
    try {
      // First, try to find the video
      let video = await this.prisma.video.findFirst({
        where: {
          OR: [
            { id: request.videoId },
            { muxAssetId: request.videoId },
            { muxPlaybackId: request.videoId },
            { muxUploadId: request.videoId },
          ],
          organizationId: request.organizationId,
          provider: 'MUX',
        },
      });

      if (video) {
        // Video exists, return its status
        return {
          success: true,
          video: {
            uid: video.id,
            readyToStream: video.status === VideoStatus.READY && !!video.playbackUrl,
            status: {
              state: this.mapVideoStatus(video.status),
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
            duration: video.duration || 0,
          },
        };
      }

      // If no video found, check for pending video and try to sync with MUX
      const pendingVideo = await this.prisma.pendingVideo.findFirst({
        where: {
          OR: [
            { id: request.videoId },
            { muxUploadId: request.videoId },
            { muxAssetId: request.videoId },
          ],
          organizationId: request.organizationId,
        },
      });

      if (pendingVideo && pendingVideo.muxUploadId) {
        // Try to check upload status with MUX
        try {
          await this.muxService.checkUploadStatus(pendingVideo.id, pendingVideo.organizationId);
          
          // Re-check if video was created
          video = await this.prisma.video.findUnique({
            where: { id: pendingVideo.id },
          });

          if (video) {
            return this.getVideoStatus(request); // Recursive call with updated data
          }
        } catch (muxError) {
          this.logger.warn(`MUX status check failed: ${muxError.message}`);
        }

        return {
          success: true,
          video: {
            uid: pendingVideo.id,
            readyToStream: false,
            status: {
              state: this.mapVideoStatus(VideoStatus.PROCESSING),
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
            duration: 0,
          },
        };
      }

      throw new NotFoundException(`Video with ID ${request.videoId} not found`);
    } catch (error) {
      this.logger.error(`Error getting MUX video status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async startTranscode(request: StartTranscodeRequest): Promise<StartTranscodeResponse> {
    // MUX handles transcoding automatically, no manual start needed
    return {
      success: true,
      message: 'MUX handles transcoding automatically',
    };
  }

  async generatePlaybackToken(request: GeneratePlaybackTokenRequest): Promise<GeneratePlaybackTokenResponse> {
    // MUX doesn't require signed tokens for playback (public URLs)
    // Return a dummy token to satisfy the interface
    throw new BadRequestException('MUX videos use public URLs and do not require signed playback tokens');
  }

  async testConnection(organizationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      const result = await this.muxService.testMuxConnection(organizationId);
      return {
        success: result.success,
        message: result.message || 'MUX connection successful',
      };
    } catch (error) {
      this.logger.error(`MUX provider connection test failed: ${error.message}`);
      return {
        success: false,
        message: `MUX provider connection failed: ${error.message}`,
      };
    }
  }

  async deleteVideo(videoId: string, organizationId: string): Promise<{ success: boolean }> {
    try {
      const video = await this.prisma.video.findFirst({
        where: {
          id: videoId,
          organizationId: organizationId,
          provider: 'MUX',
        },
      });

      if (!video || !video.muxAssetId) {
        return { success: true }; // Already deleted or no MUX asset
      }

      // Delete from MUX using existing service
      try {
        const { tokenId, tokenSecret } = await this.muxService.getMuxCredentials(organizationId);
        const Mux = await import('@mux/mux-node');
        const muxClient = new Mux.default({
          tokenId,
          tokenSecret,
        });

        await muxClient.video.assets.delete(video.muxAssetId);
        this.logger.log(`Deleted MUX asset: ${video.muxAssetId}`);
      } catch (muxError) {
        if (muxError.status === 404) {
          this.logger.warn(`MUX asset ${video.muxAssetId} not found - may have been deleted already`);
        } else {
          this.logger.error(`Error deleting MUX asset: ${muxError.message}`);
          return { success: false };
        }
      }

      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting MUX video: ${error.message}`, error.stack);
      return { success: false };
    }
  }

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
}
