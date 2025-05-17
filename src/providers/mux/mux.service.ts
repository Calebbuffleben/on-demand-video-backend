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
      this.logger.log(`Creating direct upload URL for organization ${organizationId} with name "${name}"`);
      
      // Verify organization exists
      this.logger.log(`Checking if organization ${organizationId} exists...`);
      const organization = await this.prismaService.organization.findUnique({
        where: { id: organizationId },
      });

      if (!organization) {
        this.logger.error(`Organization with ID ${organizationId} not found`);
        throw new BadRequestException(`Organization with ID ${organizationId} not found`);
      }
      this.logger.log(`Organization found: ${organization.name}`);

      // Get MUX credentials
      this.logger.log(`Getting MUX credentials for organization ${organizationId}...`);
      const { tokenId, tokenSecret } = await this.getMuxCredentials(organizationId);
      
      this.logger.log(`Using MUX credentials for organization ${organizationId} - Token ID: ${tokenId.substring(0, 5)}...`);
      
      // Initialize MUX client with credentials
      this.logger.log(`Initializing MUX client...`);
      const muxClient = new Mux({
        tokenId,
        tokenSecret,
      });
      
      // Create a direct upload with MUX
      this.logger.log('Creating direct upload with MUX...');
      let upload;
      try {
        upload = await muxClient.video.uploads.create({
          cors_origin: '*', // Allow any origin for testing
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
        
        this.logger.log(`MUX upload created with ID: ${upload.id}`);
      } catch (muxError) {
        this.logger.error(`Error creating MUX upload: ${muxError.message}`, muxError.stack);
        throw new BadRequestException(`Failed to create MUX upload: ${muxError.message}`);
      }

      // Use a transaction to ensure data consistency - either both operations succeed or both fail
      this.logger.log(`Creating pending video record in database using transaction...`);
      let pendingVideo;
      try {
        pendingVideo = await this.prismaService.$transaction(async (prisma) => {
          // First check if a pending video already exists with this upload ID
          const existing = await prisma.pendingVideo.findFirst({
            where: { muxUploadId: upload.id }
          });
          
          if (existing) {
            this.logger.log(`Found existing pending video with upload ID ${upload.id}: ${existing.id}`);
            return existing;
          }
          
          // Create the pending video
          const newPendingVideo = await prisma.pendingVideo.create({
            data: {
              name,
              description,
              muxUploadId: upload.id,
              tags: tags || [],
              visibility: visibility || Visibility.PUBLIC,
              status: VideoStatus.PROCESSING,
              organizationId,
            },
          });
          
          this.logger.log(`Created new pending video with ID: ${newPendingVideo.id}`);
          return newPendingVideo;
        });
      } catch (dbError) {
        this.logger.error(`Transaction failed when creating pending video: ${dbError.message}`, dbError.stack);
        throw new BadRequestException(`Failed to create pending video record: ${dbError.message}`);
      }
      
      // Verify the pending video was created
      if (!pendingVideo || !pendingVideo.id) {
        this.logger.error(`PendingVideo creation failed for upload ID: ${upload.id}`);
        throw new BadRequestException('Failed to create pending video record');
      }
      
      this.logger.log(`Pending video created with ID: ${pendingVideo.id} for MUX upload ID: ${upload.id}`);
      
      // Double-check that it exists in the database
      const checkPendingVideo = await this.prismaService.pendingVideo.findUnique({
        where: { id: pendingVideo.id }
      });
      
      if (!checkPendingVideo) {
        this.logger.error(`PendingVideo with ID ${pendingVideo.id} not found in database verification check!`);
      } else {
        this.logger.log(`PendingVideo verified in database: ${checkPendingVideo.id}`);
      }

      return {
        uploadUrl: upload.url,
        videoId: pendingVideo.id, // Return the pending video ID
      };
    } catch (error) {
      this.logger.error(`Error creating direct upload URL: ${error.message}`, error.stack);
      if (error.message.includes('organization')) {
        throw new BadRequestException(`Failed to create upload URL: Organization issue - ${error.message}`);
      } else if (error.message.includes('credentials')) {
        throw new BadRequestException(`Failed to create upload URL: Credential issue - ${error.message}`);
      } else if (error instanceof Error) {
        throw new BadRequestException(`Failed to create upload URL: ${error.message}`);
      } else {
        throw new BadRequestException('Failed to create upload URL: Unknown error');
      }
    }
  }

  /**
   * Check the status of a MUX upload and update the video record
   */
  async checkUploadStatus(pendingVideoId: string, organizationId: string): Promise<any> {
    try {
      // Find the pending video
      const pendingVideo = await this.prismaService.pendingVideo.findUnique({
        where: { id: pendingVideoId },
      });

      if (!pendingVideo) {
        throw new BadRequestException(`Pending video with ID ${pendingVideoId} not found`);
      }

      if (pendingVideo.organizationId !== organizationId) {
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
      if (pendingVideo.muxUploadId) {
        const upload = await muxClient.video.uploads.retrieve(pendingVideo.muxUploadId);
        
        // If the upload has an asset ID, update the pending video record
        if (upload.asset_id) {
          const asset = await muxClient.video.assets.retrieve(upload.asset_id);
          
          // Update the pending video with asset ID
          await this.prismaService.pendingVideo.update({
            where: { id: pendingVideo.id },
            data: {
              muxAssetId: asset.id,
            },
          });
          
          // We only return status information, the webhook will handle creating the actual video
          return {
            status: asset.status,
            assetId: asset.id,
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