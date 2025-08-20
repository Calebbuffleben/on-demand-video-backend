import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Req,
  Res,
  HttpCode,
  BadRequestException,
  Headers,
  InternalServerErrorException,
  UploadedFiles,
  UseInterceptors,
  Query,
  Request,
} from '@nestjs/common';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { VideosService } from './videos.service';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiParam } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { OrganizationScoped } from '../common/decorators/organization-scoped.decorator';
import { GetUploadUrlDto } from './dto/get-upload-url.dto';
import { VideoStatusResponseDto } from './dto/video-status-response.dto';
import { VideoListResponseDto, SingleVideoResponseDto } from './dto/video-response.dto';
import { UpdateOrgCloudflareDto } from './dto/update-org-cloudflare.dto';
import { EmbedVideoResponseDto } from './dto/embed-video-response.dto';
import { GetUploadUrlResponseDto } from './dto/get-upload-url-response.dto';
import { Visibility } from '@prisma/client';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import { MuxWebhookController } from '../providers/mux/mux-webhook.controller';
import { UploadService } from './upload.service';
import { TranscodeCallbackDto } from './dto/transcode-callback.dto';
import { MultipartInitDto, MultipartPartUrlDto, MultipartCompleteDto, MultipartAbortDto } from './dto/multipart.dto';
import { Response } from 'express';

declare global {
  namespace Express {
    namespace Multer {
      interface File {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
        buffer: Buffer;
      }
    }
  }
}

interface AuthenticatedRequest extends Request {
  organization: any;
  user: any;
}

@ApiTags('videos')
@ApiBearerAuth()
@Controller('api/videos')
export class VideosController {
  private readonly logger = new Logger(VideosController.name);

  constructor(
    private readonly videosService: VideosService,
    private readonly prismaService: PrismaService,
    private readonly muxWebhookController: MuxWebhookController,
    private readonly uploadService: UploadService,
  ) {}

  // Test endpoint for JWT token generation - MUST be before :uid routes
  @Public()
  @Post(':videoId/test-playback-token')
  @ApiOperation({ summary: 'Generate JWT token for video playback (TEST - PUBLIC)' })
  @ApiResponse({ status: 200, description: 'Playback token generated successfully.' })
  async generateTestPlaybackToken(
    @Param('videoId') videoId: string,
    @Body() body: { expiryMinutes?: number }
  ) {
    // Hardcode a test organization ID for testing
    const testOrganizationId = '00c38d90-c35d-4598-97e0-2a243505eba6';
    return this.videosService.generatePlaybackToken(videoId, testOrganizationId, body.expiryMinutes);
  }

  // HLS streaming routes - MUST be first to avoid conflicts with :uid routes
  @Public()
  @Get('stream/:videoId/hls/:filename')
  @ApiOperation({ summary: 'Serve HLS files for internal videos' })
  @ApiResponse({ status: 200, description: 'HLS file content.' })
  async serveHls(
    @Param('videoId') videoId: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    return this.videosService.serveHlsFile(videoId, filename, res);
  }

  @Public()
  @Get('stream/:videoId/master.m3u8')
  @ApiOperation({ summary: 'Serve signed HLS master playlist' })
  @ApiResponse({ status: 200, description: 'HLS master playlist with signed URLs.' })
  async serveSignedMasterPlaylist(
    @Param('videoId') videoId: string,
    @Query('token') token: string,
    @Res() res: Response,
    @Request() req: any
  ) {
    // For testing: if no token provided, generate one automatically
    if (!token) {
      try {
        const testOrganizationId = '00c38d90-c35d-4598-97e0-2a243505eba6';
        const tokenResult = await this.videosService.generatePlaybackToken(videoId, testOrganizationId, 60);
        token = tokenResult.token;
        console.log('Generated test token for video:', videoId);
      } catch (error) {
        console.error('Failed to generate test token:', error.message);
        throw error;
      }
    }
    return this.videosService.serveSignedMasterPlaylist(videoId, token, res, req);
  }

  @Public()
  @Get('stream/:videoId/seg/:filename')
  @ApiOperation({ summary: 'Serve HLS segments with token validation' })
  @ApiResponse({ status: 200, description: 'HLS segment content.' })
  async serveSignedSegment(
    @Param('videoId') videoId: string,
    @Param('filename') filename: string,
    @Query('token') token: string,
    @Res() res: Response,
    @Request() req: any
  ) {
    // For testing: if no token provided, generate one automatically
    if (!token) {
      try {
        const testOrganizationId = '00c38d90-c35d-4598-97e0-2a243505eba6';
        const tokenResult = await this.videosService.generatePlaybackToken(videoId, testOrganizationId, 60);
        token = tokenResult.token;
        console.log('Generated test token for segment:', filename);
      } catch (error) {
        console.error('Failed to generate test token for segment:', error.message);
        throw error;
      }
    }
    return this.videosService.serveSignedSegment(videoId, filename, token, res, req);
  }

  @Public()
  @Get('thumb/:videoId/:filename')
  @ApiOperation({ summary: 'Serve thumbnails with token validation' })
  @ApiResponse({ status: 200, description: 'Thumbnail content.' })
  async serveSignedThumbnail(
    @Param('videoId') videoId: string,
    @Param('filename') filename: string,
    @Query('token') token: string,
    @Res() res: Response,
    @Request() req: any
  ) {

    
    // For testing: if no token provided, generate one automatically
    if (!token) {
      try {
        const testOrganizationId = '00c38d90-c35d-4598-97e0-2a243505eba6';
        const tokenResult = await this.videosService.generatePlaybackToken(videoId, testOrganizationId, 60);
        token = tokenResult.token;
        console.log('Generated test token for thumbnail:', filename);
      } catch (error) {
        console.error('Failed to generate test token for thumbnail:', error.message);
        // Continue without token - the service will handle it
      }
    }
    return this.videosService.serveSignedThumbnail(videoId, filename, token, res, req);
  }

  @Public()
  @Get('stream/:videoId/thumbnail')
  @ApiOperation({ summary: 'Serve thumbnail for internal videos' })
  @ApiResponse({ status: 200, description: 'Thumbnail image.' })
  async serveThumbnail(
    @Param('videoId') videoId: string,
    @Res() res: Response
  ) {
    return this.videosService.serveThumbnail(videoId, res);
  }

  @Public()
  @Get('stream/:videoId/thumbs/:filename')
  @ApiOperation({ summary: 'Serve thumbnail sprites and VTT files for internal videos' })
  @ApiResponse({ status: 200, description: 'Thumbnail sprite or VTT file.' })
  async serveThumbFile(
    @Param('videoId') videoId: string,
    @Param('filename') filename: string,
    @Res() res: Response
  ) {
    return this.videosService.serveThumbFile(videoId, filename, res);
  }

  @Post(':videoId/playback-token')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Generate JWT token for video playback' })
  @ApiResponse({ status: 200, description: 'Playback token generated successfully.' })
  async generatePlaybackToken(
    @Param('videoId') videoId: string,
    @Body() body: { expiryMinutes?: number },
    @Request() req: any
  ) {
    return this.videosService.generatePlaybackToken(videoId, req.organizationId, body.expiryMinutes);
  }

  @Get('organization')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get all videos for the authenticated organization' })
  @ApiResponse({ status: 200, description: 'Return all videos for the authenticated organization.' })
  async findAllOrganizationVideos(@Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    const videos = await this.videosService.findAll(organizationId);
    
    // Map videos to DTO format and return proper response structure
    const result = videos.map(video => this.videosService.mapVideoToDto(video));
    
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
  }

  @Get('test-cloudflare-connection')
  @Public()
  @ApiOperation({ summary: 'Test the connection to Cloudflare Stream API' })
  @ApiResponse({ status: 200, description: 'Returns the Cloudflare Stream API response.' })
  async testCloudflareConnection() {
    try {
      console.log('Testing Cloudflare Stream API connection...');
      const response = await this.videosService.testCloudflareConnection();
      console.log('Cloudflare Stream API connection test successful!');
      return response;
    } catch (error) {
      console.error('Cloudflare Stream API connection test failed:', error);
      throw new BadRequestException(`Failed to connect to Cloudflare Stream API: ${error.message}`);
    }
  }

  @Get('organization/providers')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get available video providers for the organization' })
  @ApiResponse({ status: 200, description: 'Available providers list.' })
  async getAvailableProviders(@Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    return this.videosService.getAvailableProviders(organizationId);
  }

  @Post('organization/test-providers')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Test all available video providers for the organization' })
  @ApiResponse({ status: 200, description: 'Provider test results.' })
  async testAllProviders(@Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    return this.videosService.testAllProviders(organizationId);
  }

  @Get('organization/:id')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get a video by ID from the organization' })
  @ApiResponse({ status: 200, description: 'Return the video with the specified ID.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async findOrgVideo(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    return this.videosService.findOne(id, organizationId);
  }

  @Post('organization/upload-url')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get a direct upload URL for Cloudflare Stream and save to organization' })
  @ApiResponse({ status: 201, description: 'Returns an upload URL and video ID.' })
  async createOrgUploadUrl(@Body() createVideoDto: CreateVideoDto, @Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    return this.videosService.createDirectUploadUrl(createVideoDto, organizationId);
  }

  @Delete('organization/:id')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Delete a video from the organization' })
  @ApiResponse({ status: 204, description: 'The video has been successfully deleted.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @HttpCode(204)
  async removeOrgVideo(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    await this.videosService.remove(id, organizationId);
  }

  @Put('organization/:id')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Update a video in the organization' })
  @ApiResponse({ status: 200, description: 'The video has been successfully updated.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async updateOrgVideo(
    @Param('id') id: string,
    @Body() updateVideoDto: UpdateVideoDto,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req.organization.id;
    return this.videosService.update(id, updateVideoDto, organizationId);
  }

  @Post('organization/:id/sync')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Sync video status with Cloudflare for organization video' })
  @ApiResponse({ status: 200, description: 'Video status has been synced.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  async syncOrgVideoStatus(@Param('id') id: string, @Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    return this.videosService.syncVideoStatus(id, organizationId);
  }

  @Public()
  @Post('webhook')
  @ApiOperation({ summary: 'Webhook endpoint for Mux Stream events' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully.' })
  async webhook(
    @Body() payload: any,
    @Headers('mux-signature') signature: string
  ) {
    // Here you would typically verify the webhook signature

    try {
      await this.videosService.handleMuxWebhook(payload, signature);
      return { success: true };
    } catch (error) {
      throw new BadRequestException('Failed to process webhook');
    }
  }

  @Public()
  @Post('transcode/callback')
  @ApiOperation({ summary: 'Internal callback when FFmpeg worker finishes transcode' })
  @ApiResponse({ status: 200, description: 'Callback processed.' })
  async transcodeCallback(@Body() dto: TranscodeCallbackDto) {
    return this.videosService.handleTranscodeCallback(dto);
  }



  // New public endpoints for direct Cloudflare integration

  @Post('get-upload-url')
  @ApiOperation({ summary: 'Get a direct upload URL for MUX' })
  @ApiResponse({ status: 201, description: 'Returns an upload URL and video ID.' })
  async getCloudflareUploadUrl(
    @Body() dto: GetUploadUrlDto,
    @Req() req: AuthenticatedRequest
  ): Promise<GetUploadUrlResponseDto> {
    const organizationId = req['organization']?.id || dto.organizationId;
    if (!organizationId) {
      throw new BadRequestException('Organization ID is required');
    }
    return this.videosService.getUploadUrl({ ...dto, organizationId });
  }

  // Multipart upload flow (R2 S3-compatible)
  @Post('multipart/init')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Init multipart upload and create PendingVideo' })
  @ApiResponse({ status: 200 })
  async multipartInit(@Body() dto: MultipartInitDto, @Req() req: AuthenticatedRequest) {
    const organizationId = req.organization?.id || dto.organizationId;
    return this.videosService.multipartInit({ ...dto, organizationId });
  }

  @Post('multipart/part-url')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get presigned URL for a specific part' })
  @ApiResponse({ status: 200 })
  async multipartPartUrl(@Body() dto: MultipartPartUrlDto) {
    return this.videosService.multipartPartUrl(dto);
  }

  @Post('multipart/complete')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Complete multipart upload and enqueue transcode' })
  @ApiResponse({ status: 200 })
  async multipartComplete(@Body() dto: MultipartCompleteDto, @Req() req: AuthenticatedRequest) {
    const organizationId = req.organization?.id || dto.organizationId;
    return this.videosService.multipartComplete({ ...dto, organizationId });
  }

  @Post('multipart/abort')
  @ApiOperation({ summary: 'Abort multipart upload' })
  @ApiResponse({ status: 200 })
  async multipartAbort(@Body() dto: MultipartAbortDto) {
    return this.videosService.multipartAbort(dto);
  }

  @Get(':uid/status')
  @ApiOperation({ summary: 'Check the status of an uploaded video' })
  @ApiResponse({ status: 200, description: 'Returns the video status.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @ApiParam({ name: 'uid', description: 'The MUX upload ID' })
  @Public()
  async getVideoStatus(@Param('uid') uid: string): Promise<VideoStatusResponseDto> {
    return this.videosService.getVideoStatus(uid);
  }

  /**
   * Alias route to preserve UX: GET /api/videos/status/:id
   * Returns the same payload as GET /api/videos/:uid/status
   */
  @Get('status/:id')
  @ApiOperation({ summary: 'Alias: Check video status by ID' })
  @ApiResponse({ status: 200, description: 'Returns the video status.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @ApiParam({ name: 'id', description: 'Video ID or related provider ID' })
  @Public()
  async getVideoStatusAlias(@Param('id') id: string): Promise<VideoStatusResponseDto> {
    return this.videosService.getVideoStatus(id);
  }

  @Get()
  @ApiOperation({ summary: 'Get all videos from Cloudflare Stream' })
  @ApiResponse({ status: 200, description: 'Returns all videos.' })
  @Public()
  async getAllCloudflareVideos(): Promise<VideoListResponseDto> {
    return this.videosService.getAllVideos();
  }

  /**
   * Get video for embedding - MUST be before :uid to avoid route conflicts
   */
  @Get('embed/:uid')
  @Public()
  @ApiOperation({ summary: 'Get video details for embedding' })
  @ApiResponse({ status: 200, description: 'Returns the video with embed information.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @ApiParam({ name: 'uid', description: 'The Cloudflare Stream video UID' })
  async getVideoForEmbed(
    @Param('uid') uid: string,
    @Req() req: Request,
    @Res() res: any
  ): Promise<EmbedVideoResponseDto> {
    // Set aggressive CORS headers for cross-domain embedding
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'false');
    res.header('X-Frame-Options', 'ALLOWALL');
    res.header('Content-Security-Policy', 'frame-ancestors *;');
    res.header('X-Embed-API', 'true');
    res.header('X-Cross-Domain-Ready', 'true');
    
    // Extract organization ID from request if it exists
    const organizationId = req['organization']?.id;
    const result = await this.videosService.getVideoForEmbed(uid, organizationId);
    
    return res.json(result);
  }

  @Public()
  @Get('embed-test')
  @ApiOperation({ summary: 'Test endpoint for cross-domain CORS' })
  @ApiResponse({ status: 200, description: 'CORS test successful.' })
  async testEmbedCors(@Req() req: Request, @Res() res: any) {
    // Set aggressive CORS headers for testing
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', '*');
    res.header('Access-Control-Allow-Credentials', 'false');
    res.header('X-Frame-Options', 'ALLOWALL');
    res.header('Content-Security-Policy', 'frame-ancestors *;');
    res.header('X-Embed-Test', 'true');
    res.header('X-Cross-Domain-Ready', 'true');
    
    return res.json({
      success: true,
      message: 'CORS test successful',
      timestamp: new Date().toISOString(),
      origin: req.headers['origin'] || 'No origin',
      userAgent: req.headers['user-agent'] || 'No user agent',
      method: req.method,
      url: req.url
    });
  }

  @Get(':uid')
  @ApiOperation({ summary: 'Get a video by UID' })
  @ApiResponse({ status: 200, description: 'Returns the video with the specified UID.' })
  @ApiResponse({ status: 404, description: 'Video not found.' })
  @ApiParam({ name: 'uid', description: 'The Cloudflare Stream video UID' })
  @Public()
  async getVideoByUid(@Param('uid') uid: string): Promise<SingleVideoResponseDto> {
    return this.videosService.getVideoByUid(uid);
  }

  /**
   * Test Cloudflare connection for organization
   */
  @Post('organization/test-cloudflare')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Test Cloudflare API connection for the organization' })
  @ApiResponse({ status: 200, description: 'Connection successful.' })
  @ApiResponse({ status: 400, description: 'Connection failed.' })
  async testOrgCloudflare(@Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    return this.videosService.testCloudflareConnection(organizationId);
  }

  /**
   * Update organization Cloudflare settings
   */
  @Post('organization/cloudflare-settings')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Update Cloudflare settings for the organization' })
  @ApiResponse({ status: 200, description: 'Settings updated.' })
  async updateOrgCloudflareSettings(
    @Body() updateOrgCloudflareDto: UpdateOrgCloudflareDto,
    @Req() req: AuthenticatedRequest
  ) {
    const organizationId = req.organization.id;
    return this.videosService.updateOrgCloudflareSettings(updateOrgCloudflareDto, organizationId);
  }

  /**
   * Get organization Cloudflare settings
   */
  @Get('organization/cloudflare-settings')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Get Cloudflare settings for the organization' })
  @ApiResponse({ status: 200, description: 'Settings retrieved.' })
  async getOrgCloudflareSettings(@Req() req: AuthenticatedRequest) {
    const organizationId = req.organization.id;
    return this.videosService.getOrgCloudflareSettings(organizationId);
  }





  @Public()
  @Post('test-upload')
  @ApiOperation({ summary: 'Test endpoint to create a pending video and test the upload flow' })
  @ApiResponse({ status: 201, description: 'Test upload created successfully.' })
  async testUpload(@Body() dto: GetUploadUrlDto) {
    this.logger.log(`Received test upload request with data: ${JSON.stringify(dto)}`);

    try {
      // Ensure we have an organization ID
      if (!dto.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      // Create direct upload URL and PendingVideo
      const result = await this.videosService.createDirectUploadUrl(
        {
          name: dto.name || 'Test Upload',
          description: dto.description || 'Created by test endpoint',
          visibility: dto.requireSignedURLs ? Visibility.PRIVATE : Visibility.PUBLIC,
          tags: [],
        },
        dto.organizationId
      );

      // Log for debugging
      this.logger.log(`Test upload created successfully. PendingVideo ID: ${result.videoId}`);

      // Check if the PendingVideo exists
      const pendingVideo = await this.prismaService.pendingVideo.findUnique({
        where: { id: result.videoId },
      });

      if (!pendingVideo) {
        this.logger.error(`Failed to find PendingVideo with ID: ${result.videoId}`);
        throw new InternalServerErrorException('Failed to create pending video');
      }

      this.logger.log(`PendingVideo verified in database: ${JSON.stringify(pendingVideo)}`);

      // Format response
      return {
        success: true,
        pendingVideoId: result.videoId,
        uploadUrl: result.uploadUrl,
        message: 'Test upload created successfully',
      };
    } catch (error) {
      this.logger.error(`Error in test upload: ${error.message}`, error.stack);
      throw new BadRequestException(`Test upload failed: ${error.message}`);
    }
  }

  @Public()
  @Post('test-pending-video')
  @ApiOperation({ summary: 'Test endpoint for creating a pending video' })
  @ApiResponse({ status: 201, description: 'Test pending video created.' })
  async testPendingVideo(@Body() body: any) {
    try {
      this.logger.log(`Received request to create test pending video: ${JSON.stringify(body)}`);

      // Check for organization ID
      if (!body.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      // Verify organization exists
      const organization = await this.prismaService.organization.findUnique({
        where: { id: body.organizationId },
      });

      if (!organization) {
        this.logger.error(`Organization with ID ${body.organizationId} not found`);
        throw new BadRequestException(`Organization not found`);
      }

      // Generate ID for the pending video
      const id = body.id || randomUUID();
      const name = body.name || 'Test Video';
      const muxUploadId = `test-upload-${Date.now()}`;

      // Create a pending video record with READY status
      try {
        this.logger.log(`Creating pending video with ID: ${id}`);

        const pendingVideo = await this.prismaService.pendingVideo.create({
          data: {
            id,
            name,
            description: '',
            organizationId: body.organizationId,
            muxUploadId,
            muxAssetId: null,
            tags: [],
            visibility: 'PUBLIC',
            status: 'READY', // Mark as READY to simulate an already processed upload
          },
        });

        this.logger.log(`Created pending video: ${pendingVideo.id}`);

        // Simulate webhook for processing the video
        try {
          this.logger.log(`Simulating webhook for test video ${pendingVideo.id}`);

          // Create a simulated webhook payload
          const webhookPayload = {
            type: 'video.asset.ready',
            data: {
              id: `test-asset-${Date.now()}`,
              upload_id: muxUploadId,
              playback_ids: [{ id: `test-playback-${Date.now()}` }],
              passthrough: JSON.stringify({
                organizationId: body.organizationId,
                name: name,
                id: id
              }),
            },
          };

          // Send the webhook payload to the MUX webhook endpoint
          await this.muxWebhookController.handleSimulatedWebhook(webhookPayload);

          this.logger.log(`Webhook simulation completed for test video ${pendingVideo.id}`);
        } catch (webhookError) {
          this.logger.error(`Error simulating webhook: ${webhookError.message}`, webhookError.stack);
        }

        return {
          success: true,
          pendingVideoId: pendingVideo.id,
          message: 'Test pending video created successfully',
        };
      } catch (error) {
        this.logger.error(`Error creating test pending video: ${error.message}`, error.stack);
        throw new BadRequestException(`Failed to create test pending video: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error in test-pending-video endpoint: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Public()
  @Post('test-create-video')
  @ApiOperation({ summary: 'Test endpoint for manually creating a video' })
  @ApiResponse({ status: 201, description: 'Test video created.' })
  async testCreateVideo(@Body() body: any) {
    try {
      this.logger.log(`Received request to manually create video: ${JSON.stringify(body)}`);

      // Check for required fields
      if (!body.organizationId) {
        throw new BadRequestException('Organization ID is required');
      }

      // Verify organization exists
      const organization = await this.prismaService.organization.findUnique({
        where: { id: body.organizationId },
      });

      if (!organization) {
        this.logger.error(`Organization with ID ${body.organizationId} not found`);
        throw new BadRequestException(`Organization not found`);
      }

      // Create a Video record
      try {
        const videoData = {
          id: body.id || randomUUID(),
          name: body.name || 'Test Video',
          description: body.description || '',
          organizationId: body.organizationId,
          status: body.status || 'READY',
          muxAssetId: body.muxAssetId || `test-asset-${Date.now()}`,
          muxPlaybackId: body.muxPlaybackId || `test-playback-${Date.now()}`,
          muxUploadId: body.muxUploadId || `test-upload-${Date.now()}`,
          thumbnailUrl: body.thumbnailUrl || `https://image.mux.com/${body.muxPlaybackId || `test-playback-${Date.now()}`}/thumbnail.jpg`,
          playbackUrl: body.playbackUrl || `https://stream.mux.com/${body.muxPlaybackId || `test-playback-${Date.now()}`}.m3u8`,
          tags: body.tags || [],
          visibility: body.visibility || 'PUBLIC',
          duration: body.duration || 0,
        };

        this.logger.log(`Creating video with data: ${JSON.stringify(videoData)}`);

        // Delete existing PendingVideo with same ID if it exists
        if (body.id) {
          try {
            await this.prismaService.pendingVideo.delete({
              where: { id: body.id },
            });
            this.logger.log(`Deleted existing PendingVideo with ID ${body.id}`);
          } catch (error) {
            this.logger.log(`No existing PendingVideo with ID ${body.id} found to delete`);
          }
        }

        // Create the Video
        const video = await this.prismaService.video.create({
          data: videoData,
        });

        this.logger.log(`Created video with ID: ${video.id}`);

        return {
          success: true,
          message: 'Video created successfully',
          video,
        };
      } catch (error) {
        this.logger.error(`Error creating video: ${error.message}`, error.stack);
        throw new BadRequestException(`Failed to create video: ${error.message}`);
      }
    } catch (error) {
      this.logger.error(`Error in test-create-video endpoint: ${error.message}`, error.stack);
      throw error;
    }
  }

  @Post(':videoId/cover')
  @OrganizationScoped()
  @UseInterceptors(AnyFilesInterceptor({
    fileFilter: (req, file, cb) => {
      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (allowedTypes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.'), false);
      }
    },
    limits: {
      fileSize: 10 * 1024 * 1024, // 10MB file size limit for covers
    }
  }))
  @ApiOperation({ summary: 'Upload a cover image for a video' })
  @ApiResponse({ status: 201, description: 'Cover image uploaded successfully.' })
  @ApiResponse({ status: 400, description: 'Bad request (e.g., no file, invalid file type, video not found).' })
  @ApiParam({ name: 'videoId', description: 'The ID of the video' })
  async uploadCoverImage(
    @Param('videoId') videoId: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: AuthenticatedRequest,
  ) {
    this.logger.log(`Received request to upload cover for video ${videoId}. Files received: ${files?.length}`);

    const coverFile = files?.find(file => file.fieldname === 'cover');

    if (!coverFile) {
      this.logger.error('No cover image file with fieldname \'cover\' was uploaded.');
      throw new BadRequestException('No cover image file with fieldname \'cover\' uploaded.');
    }
    this.logger.log(`Processing cover file: ${coverFile.originalname}, size: ${coverFile.size}`);

    const organizationId = req.organization.id;
    return this.uploadService.uploadCoverImage(coverFile, videoId, organizationId);
  }

  @Delete(':videoId/cover')
  @OrganizationScoped()
  @ApiOperation({ summary: 'Remove the cover image for a video' })
  @ApiResponse({ status: 200, description: 'Cover image removed.' })
  @ApiParam({ name: 'videoId', description: 'The ID of the video' })
  async removeCoverImage(
    @Param('videoId') videoId: string,
    @Req() req: AuthenticatedRequest,
  ) {
    const organizationId = req.organization.id;
    return this.uploadService.removeCoverImage(videoId, organizationId);
  }
} 