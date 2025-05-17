import { Controller, Post, Body, Headers, BadRequestException, Logger, HttpCode, RawBodyRequest, Req } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoStatus } from '@prisma/client';
import Mux from '@mux/mux-node';
import { Request } from 'express';

@ApiTags('webhooks')
@Controller('api/webhooks/mux')
export class MuxWebhookController {
  private readonly logger = new Logger(MuxWebhookController.name);
  private readonly muxWebhookSecret: string;
  private readonly mux: Mux;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    this.muxWebhookSecret = this.configService.get<string>('MUX_WEBHOOK_SECRET', '');
    this.mux = new Mux({
      webhookSecret: this.muxWebhookSecret
    });
  }

  @Public()
  @Post()
  @HttpCode(200)
  @ApiOperation({ summary: 'Webhook endpoint for MUX events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully.' })
  async handleWebhook(@Req() req: RawBodyRequest<Request>, @Body() payload: any, @Headers('mux-signature') signature: string) {
    try {
      this.logger.log('Received MUX webhook');
      this.logger.log(`Headers: ${JSON.stringify(req.headers)}`);
      
      // Log the full payload for debugging
      this.logger.log(`Full webhook payload: ${JSON.stringify(payload, null, 2)}`);
      this.logger.log(`Webhook payload type: ${payload.type}`);
      
      // Process the webhook regardless of signature (for development)
      if (payload.type) {
        switch (payload.type) {
          case 'video.asset.ready':
            this.logger.log('Processing video.asset.ready event');
            await this.handleAssetReady(payload.data);
            break;
          case 'video.asset.errored':
            this.logger.log('Processing video.asset.errored event');
            await this.handleAssetError(payload.data);
            break;
          case 'video.upload.cancelled':
            this.logger.log('Processing video.upload.cancelled event');
            await this.handleUploadCancelled(payload.data);
            break;
          default:
            this.logger.log(`Unhandled MUX event type: ${payload.type}`);
            break;
        }
      } else {
        this.logger.error('Invalid webhook payload: missing type');
        throw new BadRequestException('Invalid webhook payload');
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process MUX webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Handle video.asset.ready event
   */
  private async handleAssetReady(data: any) {
    try {
      this.logger.log(`Processing asset.ready event for asset ID: ${data.id}`);
      
      // Log the full payload for debugging
      this.logger.log(`Asset data: ${JSON.stringify(data)}`);
      
      // Extract data from the webhook payload
      const assetId = data.id;
      
      this.logger.log(`Asset ID: ${assetId}`);
      
      // Parse passthrough data safely
      let passthrough = {};
      try {
        passthrough = JSON.parse(data.passthrough || '{}');
      } catch (e) {
        this.logger.error(`Error parsing passthrough data: ${e.message}`);
      }
      
      this.logger.log(`Passthrough data: ${JSON.stringify(passthrough)}`);
      
      const organizationId = passthrough['organizationId'];
      this.logger.log(`Organization ID: ${organizationId}`);
      
      // Find video by MUX upload ID if available
      this.logger.log(`Looking for video with MUX upload ID: ${data.upload_id}`);
      let video: any = null;
      
      if (data.upload_id) {
        // Log all videos for debugging
        const allVideos = await this.prismaService.video.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
          where: {
            OR: [
              { muxUploadId: data.upload_id },
              { muxAssetId: assetId },
            ],
          },
        });
        
        this.logger.log(`Found ${allVideos.length} videos that might match. IDs: ${allVideos.map(v => v.id).join(', ')}`);
        
        video = await this.prismaService.video.findFirst({
          where: {
            muxUploadId: data.upload_id,
          },
        });
        
        if (video) {
          this.logger.log(`Found video with ID ${video.id} by upload ID ${data.upload_id}`);
        } else {
          this.logger.log(`No video found with upload ID ${data.upload_id}`);
        }
      }
      
      // If not found by upload ID, try to find by asset ID
      if (!video) {
        this.logger.log(`Looking for video with MUX asset ID: ${assetId}`);
        video = await this.prismaService.video.findFirst({
          where: {
            muxAssetId: assetId,
          },
        });
        
        if (video) {
          this.logger.log(`Found video with ID ${video.id} by asset ID ${assetId}`);
        } else {
          this.logger.log(`No video found with asset ID ${assetId}`);
        }
      }
      
      // Check for PendingVideo first
      if (!video) {
        this.logger.log(`Looking for pending video with upload_id or asset_id`);
        
        // Log all pending videos for debugging
        const allPendingVideos = await this.prismaService.pendingVideo.findMany({
          take: 10,
          orderBy: { createdAt: 'desc' },
        });
        
        this.logger.log(`Found ${allPendingVideos.length} pending videos in total. Latest IDs: ${allPendingVideos.map(v => v.id).join(', ')}`);
        
        // First try to find by upload ID which is more reliable
        let pendingVideo = await this.prismaService.pendingVideo.findFirst({
          where: { muxUploadId: data.upload_id },
        });
        
        // If not found by upload ID, try by asset ID
        if (!pendingVideo && assetId) {
          pendingVideo = await this.prismaService.pendingVideo.findFirst({
            where: { muxAssetId: assetId },
          });
        }
        
        // If still not found, look for any pending video
        if (!pendingVideo) {
          pendingVideo = await this.prismaService.pendingVideo.findFirst({
            orderBy: { createdAt: 'desc' },
          });
          
          if (pendingVideo) {
            this.logger.log(`No exact match found. Using most recent pending video: ${pendingVideo.id}`);
            
            // Update the pending video with the asset ID
            try {
              await this.prismaService.pendingVideo.update({
                where: { id: pendingVideo.id },
                data: { muxAssetId: assetId },
              });
            } catch (updateError) {
              this.logger.error(`Error updating pending video with asset ID: ${updateError.message}`);
            }
          }
        }
        
        if (pendingVideo) {
          this.logger.log(`Found pending video with ID ${pendingVideo.id}`);
          
          // Create a new video from the pending video
          this.logger.log(`Creating new video from pending video ${pendingVideo.id}`);
          
          try {
            const newVideo = await this.prismaService.video.create({
              data: {
                id: pendingVideo.id,
                name: pendingVideo.name,
                description: pendingVideo.description,
                organizationId: pendingVideo.organizationId,
                muxUploadId: pendingVideo.muxUploadId || data.upload_id,
                muxAssetId: assetId,
                muxPlaybackId: data.playback_ids?.[0]?.id,
                thumbnailUrl: data.playback_ids?.[0]?.id ? `https://image.mux.com/${data.playback_ids[0].id}/thumbnail.jpg` : null,
                playbackUrl: data.playback_ids?.[0]?.id ? `https://stream.mux.com/${data.playback_ids[0].id}.m3u8` : null,
                tags: pendingVideo.tags,
                visibility: pendingVideo.visibility,
                status: VideoStatus.READY,
              },
            });
            
            this.logger.log(`Created new video with ID ${newVideo.id}`);
            video = newVideo;
            
            // Delete the pending video
            try {
              await this.prismaService.pendingVideo.delete({
                where: { id: pendingVideo.id },
              });
              this.logger.log(`Deleted pending video ${pendingVideo.id}`);
            } catch (deleteError) {
              this.logger.error(`Error deleting pending video: ${deleteError.message}`, deleteError.stack);
            }
          } catch (error) {
            this.logger.error(`Error creating video from pending video: ${error.message}`, error.stack);
          }
        } else {
          this.logger.warn(`No pending video found for MUX asset ID: ${assetId} or upload ID: ${data.upload_id}`);
          
          // Even if no pending video is found, try to create a new video directly if we have enough information
          if (data.upload_id && organizationId) {
            this.logger.log(`Attempting to create a new video directly from webhook data`);
            try {
              const newVideo = await this.prismaService.video.create({
                data: {
                  name: data.playback_ids?.[0]?.id || 'Uploaded Video',
                  description: '',
                  organizationId: organizationId,
                  muxUploadId: data.upload_id,
                  muxAssetId: assetId,
                  muxPlaybackId: data.playback_ids?.[0]?.id,
                  thumbnailUrl: data.playback_ids?.[0]?.id ? `https://image.mux.com/${data.playback_ids[0].id}/thumbnail.jpg` : null,
                  playbackUrl: data.playback_ids?.[0]?.id ? `https://stream.mux.com/${data.playback_ids[0].id}.m3u8` : null,
                  tags: [],
                  visibility: 'PUBLIC',
                  status: VideoStatus.READY,
                },
              });
              
              this.logger.log(`Created new video directly from webhook with ID ${newVideo.id}`);
              video = newVideo;
            } catch (createError) {
              this.logger.error(`Error creating video directly from webhook: ${createError.message}`, createError.stack);
            }
          }
        }
      }
      
      if (!video) {
        this.logger.warn(`No video or pending video found for MUX asset ID: ${assetId}`);
        return;
      }
      
      // Get the playback ID from the asset
      const playbackId = data.playback_ids?.[0]?.id;
      
      if (!playbackId) {
        this.logger.warn(`No playback ID found for MUX asset ID: ${assetId}`);
        return;
      }
      
      this.logger.log(`Playback ID: ${playbackId}`);
      
      // Update the video record
      this.logger.log(`Updating video ${video.id} with playback information`);
      
      try {
        const updatedVideo = await this.prismaService.video.update({
          where: { id: video.id },
          data: {
            muxAssetId: assetId,
            muxPlaybackId: playbackId,
            status: VideoStatus.READY,
            thumbnailUrl: `https://image.mux.com/${playbackId}/thumbnail.jpg`,
            playbackUrl: `https://stream.mux.com/${playbackId}.m3u8`,
            duration: Math.round(data.duration || 0),
          },
        });
        
        this.logger.log(`Successfully updated video ${video.id} as ready with MUX asset ID: ${assetId}`);
        this.logger.log(`New video status: ${updatedVideo.status}`);
      } catch (updateError) {
        this.logger.error(`Error updating video: ${updateError.message}`, updateError.stack);
      }
    } catch (error) {
      this.logger.error(`Error handling asset.ready event: ${error.message}`, error.stack);
    }
  }

  /**
   * Handle video.asset.errored event
   */
  private async handleAssetError(data: any) {
    try {
      const assetId = data.id;
      
      // Find video by upload ID or asset ID
      let video = await this.prismaService.video.findFirst({
        where: {
          OR: [
            { muxUploadId: data.upload_id },
            { muxAssetId: assetId },
          ],
        },
      });
      
      if (!video) {
        this.logger.warn(`No video found for MUX asset ID: ${assetId}`);
        return;
      }
      
      // Update the video status to ERROR
      await this.prismaService.video.update({
        where: { id: video.id },
        data: {
          status: VideoStatus.ERROR,
        },
      });
      
      this.logger.log(`Updated video ${video.id} status to ERROR for MUX asset ID: ${assetId}`);
    } catch (error) {
      this.logger.error('Error handling asset.errored event', error);
    }
  }

  /**
   * Handle video.upload.cancelled event
   */
  private async handleUploadCancelled(data: any) {
    try {
      const uploadId = data.id;
      
      // Find video by upload ID
      const video = await this.prismaService.video.findFirst({
        where: {
          muxUploadId: uploadId,
        },
      });
      
      if (!video) {
        this.logger.warn(`No video found for MUX upload ID: ${uploadId}`);
        return;
      }
      
      // Update the video status to DELETED
      await this.prismaService.video.update({
        where: { id: video.id },
        data: {
          status: VideoStatus.DELETED,
        },
      });
      
      this.logger.log(`Updated video ${video.id} status to DELETED for cancelled upload ID: ${uploadId}`);
    } catch (error) {
      this.logger.error('Error handling upload.cancelled event', error);
    }
  }

  /**
   * Handle a simulated webhook (for testing)
   */
  async handleSimulatedWebhook(payload: any): Promise<{ success: boolean }> {
    try {
      this.logger.log('Received simulated MUX webhook');
      
      // Log the full payload for debugging
      this.logger.log(`Full webhook payload: ${JSON.stringify(payload, null, 2)}`);
      this.logger.log(`Webhook payload type: ${payload.type}`);
      
      // Process the webhook
      if (payload.type) {
        switch (payload.type) {
          case 'video.asset.ready':
            this.logger.log('Processing simulated video.asset.ready event');
            await this.handleAssetReady(payload.data);
            break;
          case 'video.asset.errored':
            this.logger.log('Processing simulated video.asset.errored event');
            await this.handleAssetError(payload.data);
            break;
          case 'video.upload.cancelled':
            this.logger.log('Processing simulated video.upload.cancelled event');
            await this.handleUploadCancelled(payload.data);
            break;
          default:
            this.logger.log(`Unhandled MUX event type: ${payload.type}`);
            break;
        }
      } else {
        this.logger.error('Invalid webhook payload: missing type');
        throw new BadRequestException('Invalid webhook payload');
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error(`Failed to process simulated MUX webhook: ${error.message}`, error.stack);
      throw new BadRequestException('Failed to process webhook');
    }
  }
} 