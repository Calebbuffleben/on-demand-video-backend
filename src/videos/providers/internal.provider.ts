import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { R2Service } from '../../storage/r2.service';
import { TranscodeQueue } from '../../queue/transcode.queue';
import { JwtPlaybackService } from '../jwt-playback.service';
import { randomUUID } from 'crypto';
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
export class InternalProvider extends VideoProvider {
  readonly name = 'INTERNAL';
  readonly supportsDirectUpload = true;
  readonly supportsSignedPlayback = true;

  private readonly logger = new Logger(InternalProvider.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private r2: R2Service,
    private transcodeQueue: TranscodeQueue,
    private jwtPlayback: JwtPlaybackService,
  ) {
    super();
  }

  async createUploadUrl(request: CreateUploadUrlRequest): Promise<CreateUploadUrlResponse> {
    try {
      // Verify organization exists
      const organization = await this.prisma.organization.findUnique({
        where: { id: request.organizationId },
      });

      if (!organization) {
        throw new BadRequestException(`Organization with ID ${request.organizationId} not found`);
      }

      // Generate unique video ID and asset key
      const videoId = randomUUID();
      const assetKey = `org/${request.organizationId}/video/${videoId}`;
      const sourceFile = `${assetKey}/uploads/input.mp4`;

      // Create PendingVideo record
      await this.prisma.pendingVideo.create({
        data: {
          id: videoId,
          name: request.name || 'Untitled',
          description: request.description || '',
          organizationId: request.organizationId,
          status: VideoStatus.PROCESSING,
          tags: request.tags || [],
          visibility: request.visibility || (request.requireSignedURLs ? Visibility.PRIVATE : Visibility.PUBLIC),
          muxUploadId: null,
          muxAssetId: null,
        },
      });

      // Generate pre-signed PUT URL for R2
      const contentType = 'video/mp4';
      const uploadURL = await this.r2.getPresignedPutUrl(sourceFile, contentType);

      this.logger.log(`Created upload URL for internal video: ${videoId}`);

      return {
        success: true,
        uploadURL,
        uid: videoId,
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
      };
    } catch (error) {
      this.logger.error(`Error creating upload URL: ${error.message}`, error.stack);
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
          ],
          organizationId: request.organizationId,
          provider: 'INTERNAL',
        },
      });

      if (video) {
        // Video exists, return its status
        const baseUrl = `${this.configService.get('APP_URL') || 'http://localhost:4000'}/api/videos`;
        let hlsUrl = '';
        let thumbnailUrl = '';

        if (video.status === VideoStatus.READY && video.playbackHlsPath) {
          hlsUrl = `${baseUrl}/stream/${video.id}/master.m3u8`; // Client will add token
          if (video.thumbnailPath) {
            thumbnailUrl = `${baseUrl}/thumb/${video.id}/0001.jpg`; // Client will add token
          } else if (video.thumbnailUrl && video.thumbnailUrl.startsWith('/')) {
            // Custom uploaded cover
            const backend = this.configService.get('APP_URL') || 'http://localhost:4000';
            thumbnailUrl = `${backend}${video.thumbnailUrl}`;
          }
        }

        return {
          success: true,
          video: {
            uid: video.id,
            readyToStream: video.status === VideoStatus.READY && !!hlsUrl,
            status: {
              state: this.mapVideoStatus(video.status),
            },
            thumbnail: thumbnailUrl,
            preview: thumbnailUrl,
            playback: {
              hls: hlsUrl,
              dash: '', // Not supported yet
            },
            meta: {
              name: video.name,
            },
            duration: video.duration || 0,
          },
        };
      }

      // If no video found, check for pending video
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

      if (pendingVideo) {
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
      this.logger.error(`Error getting video status: ${error.message}`, error.stack);
      throw error;
    }
  }

  async startTranscode(request: StartTranscodeRequest): Promise<StartTranscodeResponse> {
    try {
      // Enqueue transcode job
      const job = await this.transcodeQueue.enqueue({
        videoId: request.videoId,
        organizationId: request.organizationId,
        assetKey: request.assetKey,
        sourcePath: request.sourcePath,
      });

      this.logger.log(`Enqueued transcode job ${job.id} for video ${request.videoId}`);

      return {
        success: true,
        jobId: job.id?.toString(),
        message: 'Transcode job enqueued successfully',
      };
    } catch (error) {
      this.logger.error(`Error starting transcode: ${error.message}`, error.stack);
      throw error;
    }
  }

  async generatePlaybackToken(request: GeneratePlaybackTokenRequest): Promise<GeneratePlaybackTokenResponse> {
    try {
      // Verify video exists and belongs to organization
      const video = await this.prisma.video.findFirst({
        where: {
          id: request.videoId,
          organizationId: request.organizationId,
          provider: 'INTERNAL',
        },
      });

      if (!video) {
        throw new NotFoundException('Video not found');
      }

      if (video.status !== VideoStatus.READY) {
        throw new BadRequestException('Video is not ready for playback');
      }

      const token = this.jwtPlayback.generatePlaybackToken(
        request.videoId,
        request.organizationId,
        request.expiryMinutes
      );

      return {
        success: true,
        token,
        expiresIn: (request.expiryMinutes || 5) * 60, // in seconds
        videoId: request.videoId,
      };
    } catch (error) {
      this.logger.error(`Error generating playback token: ${error.message}`, error.stack);
      throw error;
    }
  }

  async testConnection(organizationId: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Test R2 connection by listing objects (with prefix to limit results)
      const testPrefix = `org/${organizationId}/test-connection-${Date.now()}`;
      await this.r2.list(testPrefix, 1);

      // Test Redis connection via transcode queue
      const queueHealth = await this.transcodeQueue.getQueueHealth();

      return {
        success: true,
        message: `Internal provider ready - R2: ✓, Queue: ${queueHealth.waiting} waiting, ${queueHealth.active} active`,
      };
    } catch (error) {
      this.logger.error(`Internal provider connection test failed: ${error.message}`);
      return {
        success: false,
        message: `Internal provider connection failed: ${error.message}`,
      };
    }
  }

  async deleteVideo(videoId: string, organizationId: string): Promise<{ success: boolean }> {
    try {
      const video = await this.prisma.video.findFirst({
        where: {
          id: videoId,
          organizationId: organizationId,
          provider: 'INTERNAL',
        },
      });

      if (!video || !video.assetKey) {
        return { success: true }; // Already deleted or no assets to clean
      }

      // Delete all files under the asset key
      // This includes: uploads/, hls/, thumbs/
      await this.r2.deletePrefix(video.assetKey);

      this.logger.log(`Deleted R2 assets for video ${videoId} under ${video.assetKey}`);

      return { success: true };
    } catch (error) {
      this.logger.error(`Error deleting video assets: ${error.message}`, error.stack);
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
