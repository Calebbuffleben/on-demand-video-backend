import { Controller, Get, Post, Body, Req, BadRequestException, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MuxService } from './mux.service';
import { UpdateOrgMuxDto, MuxSettingsResponseDto } from './dto/update-org-mux.dto';
import { PrismaService } from '../../prisma/prisma.service';
import { Public } from '../../auth/decorators/public.decorator';
import { VideoStatus } from '@prisma/client';
import { Mux } from '@mux/mux-node';

interface AuthenticatedRequest extends Request {
  organization: any;
  user: any;
}

@ApiTags('mux')
@ApiBearerAuth()
@Controller('api/mux')
export class MuxController {
  private readonly logger = new Logger(MuxController.name);
  
  constructor(
    private readonly muxService: MuxService,
    private readonly prismaService: PrismaService,
  ) {}

  @Get('test-connection')
  @ApiOperation({ summary: 'Test the connection to MUX API' })
  @ApiResponse({ status: 200, description: 'Returns the MUX API response.' })
  async testConnection() {
    try {
      return await this.muxService.testMuxConnection();
    } catch (error) {
      throw new BadRequestException(`Failed to connect to MUX API: ${error.message}`);
    }
  }

  @Post('organization/settings')
  @ApiOperation({ summary: 'Update MUX settings for the organization' })
  @ApiResponse({ status: 200, description: 'Settings updated.' })
  async updateOrgMuxSettings(
    @Body() updateOrgMuxDto: UpdateOrgMuxDto,
    @Req() req: AuthenticatedRequest,
  ): Promise<MuxSettingsResponseDto> {
    const organizationId = req['organization'].id;
    
    try {
      // Update organization with new MUX credentials
      await this.prismaService.organization.update({
        where: { id: organizationId },
        data: {
          muxTokenId: updateOrgMuxDto.muxTokenId,
          muxTokenSecret: updateOrgMuxDto.muxTokenSecret,
        },
      });
      
      // Test connection with new credentials
      await this.muxService.testMuxConnection(organizationId);
      
      // Mask credentials for response
      return {
        success: true,
        muxTokenId: this.maskString(updateOrgMuxDto.muxTokenId),
        muxTokenSecret: this.maskString(updateOrgMuxDto.muxTokenSecret),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to update MUX settings: ${error.message}`);
    }
  }

  @Get('organization/settings')
  @ApiOperation({ summary: 'Get MUX settings for the organization' })
  @ApiResponse({ status: 200, description: 'Settings retrieved.' })
  async getOrgMuxSettings(@Req() req: AuthenticatedRequest): Promise<MuxSettingsResponseDto> {
    const organizationId = req['organization'].id;
    
    try {
      // Get organization with MUX credentials
      const organization = await this.prismaService.organization.findUnique({
        where: { id: organizationId },
        select: {
          muxTokenId: true,
          muxTokenSecret: true,
        },
      });
      
      if (!organization || !organization.muxTokenId || !organization.muxTokenSecret) {
        return {
          success: false,
          muxTokenId: '',
          muxTokenSecret: '',
        };
      }
      
      // Mask credentials for response
      return {
        success: true,
        muxTokenId: this.maskString(organization.muxTokenId),
        muxTokenSecret: this.maskString(organization.muxTokenSecret),
      };
    } catch (error) {
      throw new BadRequestException(`Failed to get MUX settings: ${error.message}`);
    }
  }

  @Post('organization/test-connection')
  @ApiOperation({ summary: 'Test MUX API connection for the organization' })
  @ApiResponse({ status: 200, description: 'Connection successful.' })
  @ApiResponse({ status: 400, description: 'Connection failed.' })
  async testOrgConnection(@Req() req: AuthenticatedRequest) {
    const organizationId = req['organization'].id;
    return this.muxService.testMuxConnection(organizationId);
  }

  @Public()
  @Post('simulate-webhook')
  @ApiOperation({ summary: 'Simulate a MUX webhook for testing' })
  @ApiResponse({ status: 200, description: 'Webhook simulated successfully.' })
  async simulateWebhook(@Body() payload: any) {
    try {
      this.logger.log(`Simulating MUX webhook with payload: ${JSON.stringify(payload)}`);
      
      // Process the webhook directly here
      if (!payload.type) {
        throw new BadRequestException('Missing webhook type');
      }
      
      switch (payload.type) {
        case 'video.asset.ready':
          await this.handleAssetReady(payload.data);
          break;
        default:
          this.logger.log(`Unhandled webhook type: ${payload.type}`);
      }
      
      return { success: true, message: 'Webhook simulated successfully' };
    } catch (error) {
      this.logger.error(`Error simulating webhook: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to simulate webhook: ${error.message}`);
    }
  }
  
  @Public()
  @Post('test-asset-ready')
  @ApiOperation({ summary: 'Test processing a video.asset.ready event' })
  @ApiResponse({ status: 200, description: 'Asset ready event processed successfully.' })
  async testAssetReady(@Body() data: any) {
    try {
      this.logger.log(`Testing asset.ready event with data: ${JSON.stringify(data)}`);
      
      // Construct a mock webhook payload
      const payload = {
        id: data.assetId || 'test-asset-id',
        upload_id: data.uploadId,
        playback_ids: [{ id: data.playbackId || 'test-playback-id' }],
        passthrough: JSON.stringify({
          organizationId: data.organizationId,
          name: data.name || 'Test Video',
        }),
      };
      
      // Process the asset ready event
      await this.handleAssetReady(payload);
      
      // Verify if a Video record was created or updated
      let result;
      
      if (data.assetId) {
        result = await this.prismaService.video.findFirst({
          where: { muxAssetId: data.assetId },
        });
      } else if (data.uploadId) {
        result = await this.prismaService.video.findFirst({
          where: { muxUploadId: data.uploadId },
        });
      }
      
      return { 
        success: true, 
        message: 'Asset ready event processed successfully',
        videoCreated: !!result,
        videoDetails: result,
      };
    } catch (error) {
      this.logger.error(`Error testing asset ready: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to test asset ready: ${error.message}`);
    }
  }
  
  /**
   * Process a video.asset.ready event
   */
  private async handleAssetReady(data: any) {
    try {
      this.logger.log(`Processing asset ready event for asset ID: ${data.id}`);
      
      // Extract data
      const assetId = data.id;
      const uploadId = data.upload_id;
      const playbackId = data.playback_ids?.[0]?.id;
      
      // Parse passthrough data
      let passthrough: Record<string, any> = {};
      try {
        passthrough = JSON.parse(data.passthrough || '{}');
      } catch (e) {
        this.logger.error(`Error parsing passthrough data: ${e.message}`);
      }
      
      const organizationId = passthrough['organizationId'];
      const name = passthrough['name'] || 'Uploaded Video';
      
      // Logic to find or create video
      let video: any = null;
      
      // Try to find existing video
      if (uploadId) {
        video = await this.prismaService.video.findFirst({
          where: { muxUploadId: uploadId },
        });
      }
      
      if (!video && assetId) {
        video = await this.prismaService.video.findFirst({
          where: { muxAssetId: assetId },
        });
      }
      
      // Check for pending video
      if (!video) {
        let pendingVideo: any = null;
        
        if (uploadId) {
          pendingVideo = await this.prismaService.pendingVideo.findFirst({
            where: { muxUploadId: uploadId },
          });
        }
        
        if (!pendingVideo && assetId) {
          pendingVideo = await this.prismaService.pendingVideo.findFirst({
            where: { muxAssetId: assetId },
          });
        }
        
        // Create video from pending video
        if (pendingVideo) {
          this.logger.log(`Creating video from pending video: ${pendingVideo.id}`);
          video = await this.prismaService.video.create({
            data: {
              id: pendingVideo.id,
              name: pendingVideo.name,
              description: pendingVideo.description || '',
              organizationId: pendingVideo.organizationId,
              muxUploadId: pendingVideo.muxUploadId,
              muxAssetId: assetId,
              muxPlaybackId: playbackId,
              status: VideoStatus.READY,
              thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
              playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
              tags: pendingVideo.tags || [],
              visibility: pendingVideo.visibility,
            },
          });
          
          // Delete pending video
          try {
            await this.prismaService.pendingVideo.delete({
              where: { id: pendingVideo.id },
            });
          } catch (e) {
            this.logger.error(`Failed to delete pending video: ${e.message}`);
          }
        } else if (organizationId && uploadId) {
          // Create video directly if we have enough information
          this.logger.log(`Creating video directly from webhook data`);
          video = await this.prismaService.video.create({
            data: {
              name,
              description: '',
              organizationId,
              muxUploadId: uploadId,
              muxAssetId: assetId,
              muxPlaybackId: playbackId,
              status: VideoStatus.READY,
              thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
              playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
              tags: [],
              visibility: 'PUBLIC',
            },
          });
        }
      } else {
        // Update existing video
        this.logger.log(`Updating existing video: ${video.id}`);
        video = await this.prismaService.video.update({
          where: { id: video.id },
          data: {
            muxAssetId: assetId,
            muxPlaybackId: playbackId,
            status: VideoStatus.READY,
            thumbnailUrl: playbackId ? `https://image.mux.com/${playbackId}/thumbnail.jpg` : null,
            playbackUrl: playbackId ? `https://stream.mux.com/${playbackId}.m3u8` : null,
          },
        });
      }
      
      if (!video) {
        this.logger.warn(`Failed to create or update video for asset ID: ${assetId}`);
      } else {
        this.logger.log(`Successfully processed asset.ready event for video: ${video.id}`);
      }
      
      return video;
    } catch (error) {
      this.logger.error(`Error handling asset ready: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Utility method to mask sensitive strings
   */
  private maskString(input: string): string {
    if (!input || input.length < 4) {
      return input;
    }
    
    const visiblePrefixLength = 2;
    const visibleSuffixLength = 2;
    
    return (
      input.substring(0, visiblePrefixLength) +
      '***' +
      input.substring(input.length - visibleSuffixLength)
    );
  }

  @Public()
  @Post('check-pending-video')
  @ApiOperation({ summary: 'Manually check a pending video and attempt to process it' })
  @ApiResponse({ status: 200, description: 'Pending video checked successfully.' })
  async checkPendingVideo(@Body() body: { pendingVideoId: string }) {
    try {
      this.logger.log(`Manual check for pending video with ID: ${body.pendingVideoId}`);
      
      if (!body.pendingVideoId) {
        throw new BadRequestException('Pending video ID is required');
      }
      
      // Find the pending video
      const pendingVideo = await this.prismaService.pendingVideo.findUnique({
        where: { id: body.pendingVideoId },
      });
      
      if (!pendingVideo) {
        throw new BadRequestException(`Pending video with ID ${body.pendingVideoId} not found`);
      }
      
      this.logger.log(`Found pending video: ${JSON.stringify(pendingVideo)}`);
      
      // Get the organization's MUX credentials
      const { tokenId, tokenSecret } = await this.muxService.getMuxCredentials(pendingVideo.organizationId);
      
      // Initialize MUX client
      const muxClient = new Mux({
        tokenId,
        tokenSecret,
      });
      
      let assetId = pendingVideo.muxAssetId;
      
      // If we have a muxUploadId but no assetId, try to retrieve the upload details
      if (pendingVideo.muxUploadId && !assetId) {
        try {
          const upload = await muxClient.video.uploads.retrieve(pendingVideo.muxUploadId);
          if (upload.asset_id) {
            assetId = upload.asset_id;
            this.logger.log(`Found asset ID ${assetId} from upload ${pendingVideo.muxUploadId}`);
            
            // Update the pending video with the asset ID
            await this.prismaService.pendingVideo.update({
              where: { id: pendingVideo.id },
              data: { muxAssetId: assetId },
            });
          }
        } catch (error) {
          this.logger.error(`Error retrieving upload info: ${error.message}`);
        }
      }
      
      if (!assetId) {
        return {
          success: false,
          message: 'No asset ID found for this pending video. The upload may still be in progress.',
        };
      }
      
      // Get asset details
      const asset = await muxClient.video.assets.retrieve(assetId);
      
      if (asset.status === 'ready') {
        // Create simulated webhook payload
        const webhookPayload = {
          type: 'video.asset.ready',
          data: {
            id: assetId,
            upload_id: pendingVideo.muxUploadId,
            playback_ids: asset.playback_ids,
            duration: asset.duration,
            passthrough: JSON.stringify({
              name: pendingVideo.name,
              description: pendingVideo.description,
              organizationId: pendingVideo.organizationId,
            }),
          },
        };
        
        // Process the simulated webhook
        await this.simulateWebhook(webhookPayload);
        
        return {
          success: true,
          message: 'Video processed successfully',
        };
      } else {
        return {
          success: false,
          message: `Asset not ready yet. Current status: ${asset.status}`,
          data: asset,
        };
      }
    } catch (error) {
      this.logger.error(`Error checking pending video: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to check pending video: ${error.message}`);
    }
  }

  @Public()
  @Get('list-pending-videos')
  @ApiOperation({ summary: 'List all pending videos in the system for debugging' })
  @ApiResponse({ status: 200, description: 'Pending videos retrieved successfully.' })
  async listPendingVideos() {
    try {
      this.logger.log('Listing all pending videos');
      
      // Get all pending videos
      const pendingVideos = await this.prismaService.pendingVideo.findMany({
        orderBy: { createdAt: 'desc' },
      });
      
      this.logger.log(`Found ${pendingVideos.length} pending videos`);
      
      return {
        success: true,
        count: pendingVideos.length,
        pendingVideos: pendingVideos.map(pv => ({
          id: pv.id,
          name: pv.name,
          muxUploadId: pv.muxUploadId,
          muxAssetId: pv.muxAssetId,
          status: pv.status,
          createdAt: pv.createdAt,
        })),
      };
    } catch (error) {
      this.logger.error(`Error listing pending videos: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to list pending videos: ${error.message}`);
    }
  }

  @Public()
  @Post('test-create-pending-video')
  @ApiOperation({ summary: 'Test creating a PendingVideo record directly' })
  @ApiResponse({ status: 200, description: 'PendingVideo created successfully.' })
  async testCreatePendingVideo(@Body() body: { 
    name?: string, 
    organizationId: string,
    muxUploadId?: string
  }) {
    try {
      this.logger.log(`Testing direct PendingVideo creation with: ${JSON.stringify(body)}`);
      
      if (!body.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }
      
      // Verify organization exists
      const organization = await this.prismaService.organization.findUnique({
        where: { id: body.organizationId },
      });
      
      if (!organization) {
        throw new BadRequestException(`Organization with ID ${body.organizationId} not found`);
      }
      
      // Create a PendingVideo record directly
      const pendingVideo = await this.prismaService.pendingVideo.create({
        data: {
          name: body.name || 'Test Pending Video',
          description: 'Created for testing purposes',
          muxUploadId: body.muxUploadId || `test-upload-${Date.now()}`,
          tags: [],
          visibility: 'PUBLIC',
          status: 'PROCESSING',
          organizationId: body.organizationId,
        },
      });
      
      this.logger.log(`Successfully created PendingVideo with ID: ${pendingVideo.id}`);
      
      return {
        success: true,
        message: 'PendingVideo created successfully',
        pendingVideo,
      };
    } catch (error) {
      this.logger.error(`Error creating test pending video: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to create pending video: ${error.message}`);
    }
  }
} 