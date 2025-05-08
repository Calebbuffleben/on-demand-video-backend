import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import Mux from '@mux/mux-node';
import { VideoStatus, Visibility } from '@prisma/client';
import * as crypto from 'crypto';

@Injectable()
export class MuxService {
  private readonly logger = new Logger(MuxService.name);
  private readonly defaultMuxTokenId: string;
  private readonly defaultMuxTokenSecret: string;
  private readonly muxClient: Mux;
  private readonly webhookSecret: string;

  constructor(
    private configService: ConfigService,
    private prismaService: PrismaService,
  ) {
    // Get MUX credentials from environment variables
    this.defaultMuxTokenId = this.configService.get<string>('MUX_TOKEN_ID', '');
    this.defaultMuxTokenSecret = this.configService.get<string>('MUX_TOKEN_SECRET', '');
    this.webhookSecret = this.configService.get<string>('MUX_WEBHOOK_SECRET', '');
    
    // Initialize MUX client
    this.muxClient = new Mux({
      tokenId: this.defaultMuxTokenId,
      tokenSecret: this.defaultMuxTokenSecret,
      webhookSecret: this.webhookSecret,
    });
  }

  /**
   * Verify a webhook signature from MUX
   */
  async verifyWebhookSignature(payload: any, signature: string): Promise<boolean> {
    if (!this.webhookSecret) {
      this.logger.warn('MUX webhook secret is not configured, skipping signature verification');
      return true; // In development, we might not have a webhook secret
    }
    
    if (!signature) {
      this.logger.error('No MUX signature provided');
      return false;
    }
    
    try {
      // Parse the signature header
      const [version, timestamp, signatureHash] = signature.split(',');
      
      if (!version || !timestamp || !signatureHash) {
        this.logger.error('Invalid MUX signature format');
        return false;
      }
      
      // Check if the timestamp is recent (within 5 minutes)
      const timestampValue = parseInt(timestamp.split('=')[1], 10);
      const currentTimestamp = Math.floor(Date.now() / 1000);
      
      if (currentTimestamp - timestampValue > 300) {
        this.logger.error('MUX webhook timestamp is too old');
        return false;
      }
      
      // Create the signature data
      const signatureData = `${timestamp},${JSON.stringify(payload)}`;
      
      // Create the expected signature
      const expectedSignature = crypto
        .createHmac('sha256', this.webhookSecret)
        .update(signatureData)
        .digest('hex');
      
      // Compare the expected signature with the provided one
      const providedSignature = signatureHash.split('=')[1];
      
      return crypto.timingSafeEqual(
        Buffer.from(expectedSignature),
        Buffer.from(providedSignature)
      );
    } catch (error) {
      this.logger.error('Error verifying MUX webhook signature:', error);
      return false;
    }
  }

  /**
   * Get MUX credentials for an organization with fallback to default
   */
  public async getMuxCredentials(organizationId: string): Promise<{
    tokenId: string;
    tokenSecret: string;
  }> {
    // Get organization with MUX credentials
    const organization = await this.prismaService.organization.findUnique({
      where: { id: organizationId },
    });

    // Use organization credentials if available, otherwise fall back to default
    const tokenId = organization?.muxTokenId || this.defaultMuxTokenId;
    const tokenSecret = organization?.muxTokenSecret || this.defaultMuxTokenSecret;
    
    if (!tokenId || !tokenSecret) {
      throw new BadRequestException('MUX credentials are not configured');
    }
    
    return { tokenId, tokenSecret };
  }

  /**
   * Test the connection to the MUX API
   */
  async testMuxConnection(organizationId?: string): Promise<any> {
    try {
      // Initialize MUX client with appropriate credentials
      let muxClient: Mux;
      
      if (organizationId) {
        const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
        muxClient = new Mux({
          tokenId,
          tokenSecret,
        });
      } else {
        if (!this.defaultMuxTokenId || !this.defaultMuxTokenSecret) {
          throw new BadRequestException('Default MUX credentials are not configured');
        }
        muxClient = this.muxClient;
      }

      // Test connection by listing assets (limited to 1)
      const response = await muxClient.video.assets.list({ limit: 1 });
      
      return {
        success: true,
        status: 200,
        message: 'Successfully connected to MUX API',
        data: {
          result: response.data,
        },
      };
    } catch (error) {
      this.logger.error('Error connecting to MUX:', error);
      throw new BadRequestException(`Failed to connect to MUX: ${error.message}`);
    }
  }

  /**
   * Create a direct upload URL for MUX
   */
  async createDirectUploadUrl(name: string, description: string, visibility: Visibility, tags: string[], organizationId: string): Promise<{ uploadUrl: string; videoId: string }> {
    try {
      // Verify organization exists
      const organization = await this.prismaService.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        throw new BadRequestException(`Organization with ID ${organizationId} not found`);
      }

      // Get MUX credentials
      const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
      
      // Initialize MUX client with credentials
      const muxClient = new Mux({
        tokenId,
        tokenSecret,
      });
      
      // Create a direct upload with MUX
      const upload = await muxClient.video.uploads.create({
        cors_origin: 'https://*',
        new_asset_settings: {
          playback_policy: visibility === Visibility.PRIVATE ? ['signed'] : ['public'],
          passthrough: JSON.stringify({
            name,
            description,
            tags,
            organizationId,
          })
        }
      });

      // Create a record in our database
      const video = await this.prismaService.video.create({
        data: {
          name,
          description,
          muxUploadId: upload.id,
          tags: tags || [],
          visibility: visibility || Visibility.PUBLIC,
          status: VideoStatus.PROCESSING,
          organizationId,
          thumbnailUrl: null,
          playbackUrl: null,
        },
      });

      return {
        uploadUrl: upload.url,
        videoId: upload.id,
      };
    } catch (error) {
      this.logger.error('Error creating direct upload URL:', error);
      throw new BadRequestException('Failed to create upload URL');
    }
  }

  /**
   * Check the status of a MUX upload and update the video record
   */
  async checkUploadStatus(videoId: string, organizationId: string): Promise<any> {
    try {
      // Find the video
      const video = await this.prismaService.video.findUnique({
        where: { id: videoId },
      });

      if (!video) {
        throw new BadRequestException(`Video with ID ${videoId} not found`);
      }

      if (video.organizationId !== organizationId) {
        throw new BadRequestException('You do not have access to this video');
      }

      // Get organization-specific MUX credentials
      const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
      
      // Initialize MUX client with organization credentials
      const muxClient = new Mux({
        tokenId,
        tokenSecret,
      });

      // Check upload status
      if (video.muxUploadId) {
        const upload = await muxClient.video.uploads.retrieve(video.muxUploadId);
        
        // If the upload has an asset ID, update the video record
        if (upload.asset_id) {
          const asset = await muxClient.video.assets.retrieve(upload.asset_id);
          
          // Create a playback ID if the asset doesn't have one
          let playbackId = asset.playback_ids?.[0]?.id;
          
          if (!playbackId) {
            const playbackResponse = await muxClient.video.assets.createPlaybackId(asset.id, {
              policy: video.visibility === Visibility.PRIVATE ? 'signed' : 'public',
            });
            playbackId = playbackResponse.id;
          }
          
          // Update the video record
          await this.prismaService.video.update({
            where: { id: video.id },
            data: {
              muxAssetId: asset.id,
              muxPlaybackId: playbackId,
              status: asset.status === 'ready' ? VideoStatus.READY : VideoStatus.PROCESSING,
              thumbnailUrl: asset.status === 'ready' ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
              playbackUrl: asset.status === 'ready' ? `https://stream.mux.com/${playbackId}.m3u8` : null,
              duration: Math.round(asset.duration || 0),
            },
          });
          
          return {
            status: asset.status,
            assetId: asset.id,
            playbackId: playbackId,
            ready: asset.status === 'ready',
          };
        }
        
        return {
          status: 'uploading',
          uploadId: upload.id,
          ready: false,
        };
      }
      
      return {
        status: 'unknown',
        ready: false,
      };
    } catch (error) {
      this.logger.error('Error checking upload status:', error);
      throw new BadRequestException(`Failed to check upload status: ${error.message}`);
    }
  }
} 