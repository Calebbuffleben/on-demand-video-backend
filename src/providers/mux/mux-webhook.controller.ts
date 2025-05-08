import { Controller, Post, Body, Headers, BadRequestException, Logger, HttpCode } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Public } from '../../auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoStatus } from '@prisma/client';
import Mux from '@mux/mux-node';

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
  async handleWebhook(@Body() rawBody: string, @Headers() headers: Record<string, string>) {
    try {
      // Verify webhook signature and parse payload
      const event = this.mux.webhooks.unwrap(rawBody, headers);
      
      this.logger.log(`Received MUX webhook event: ${event.type}`);
      
      // Handle different event types
      switch (event.type) {
        case 'video.asset.ready':
          await this.handleAssetReady(event.data);
          break;
        case 'video.asset.errored':
          await this.handleAssetError(event.data);
          break;
        case 'video.upload.cancelled':
          await this.handleUploadCancelled(event.data);
          break;
        default:
          this.logger.log(`Unhandled MUX event type: ${event.type}`);
          break;
      }
      
      return { success: true };
    } catch (error) {
      this.logger.error('Failed to process MUX webhook', error);
      throw new BadRequestException('Failed to process webhook');
    }
  }

  /**
   * Handle video.asset.ready event
   */
  private async handleAssetReady(data: any) {
    try {
      // Extract data from the webhook payload
      const assetId = data.id;
      const passthrough = JSON.parse(data.passthrough || '{}');
      const organizationId = passthrough.organizationId;
      
      // Find video by MUX upload ID if available
      let video = await this.prismaService.video.findFirst({
        where: {
          muxUploadId: data.upload_id,
        },
      });
      
      // If not found by upload ID, try to find by asset ID
      if (!video) {
        video = await this.prismaService.video.findFirst({
          where: {
            muxAssetId: assetId,
          },
        });
      }
      
      if (!video) {
        this.logger.warn(`No video found for MUX asset ID: ${assetId}`);
        return;
      }
      
      // Get the playback ID from the asset
      const playbackId = data.playback_ids?.[0]?.id;
      
      if (!playbackId) {
        this.logger.warn(`No playback ID found for MUX asset ID: ${assetId}`);
        return;
      }
      
      // Update the video record
      await this.prismaService.video.update({
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
      
      this.logger.log(`Updated video ${video.id} as ready with MUX asset ID: ${assetId}`);
    } catch (error) {
      this.logger.error('Error handling asset.ready event', error);
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
} 