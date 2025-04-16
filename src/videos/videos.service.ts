import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { CreateVideoDto } from './dto/create-video.dto';
import { UpdateVideoDto } from './dto/update-video.dto';
import { Video, VideoStatus, Visibility } from '@prisma/client';
import fetch from 'node-fetch';

@Injectable()
export class VideosService {
  private readonly cloudflareAccountId: string;
  private readonly cloudflareApiToken: string;
  private readonly cloudflareBaseUrl: string;

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
  ) {
    this.cloudflareAccountId = this.configService.get<string>('CLOUDFLARE_ACCOUNT_ID', '');
    this.cloudflareApiToken = this.configService.get<string>('CLOUDFLARE_API_TOKEN', '');
    this.cloudflareBaseUrl = `https://api.cloudflare.com/client/v4/accounts/${this.cloudflareAccountId}/stream`;
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
   * Create a direct upload URL for Cloudflare Stream
   */
  async createDirectUploadUrl(createVideoDto: CreateVideoDto, organizationId: string): Promise<{ uploadUrl: string; videoId: string }> {
    try {
      // Create a direct upload URL with Cloudflare Stream
      const response = await fetch(`${this.cloudflareBaseUrl}/direct_upload`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          maxDurationSeconds: 3600, // 1 hour max duration
          expiry: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
          requireSignedURLs: createVideoDto.visibility === Visibility.PRIVATE,
          creator: organizationId,
          meta: {
            name: createVideoDto.name,
            organizationId,
          },
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new BadRequestException(`Failed to create upload URL: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Create a record in our database
      const video = await this.prisma.video.create({
        data: {
          name: createVideoDto.name,
          description: createVideoDto.description,
          cloudflareId: data.result.uid,
          tags: createVideoDto.tags || [],
          visibility: createVideoDto.visibility || Visibility.PUBLIC,
          status: VideoStatus.PROCESSING,
          organizationId,
          thumbnailUrl: null,
          playbackUrl: null,
        },
      });

      return {
        uploadUrl: data.result.uploadURL,
        videoId: video.id,
      };
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
    await this.findOne(id, organizationId);

    // Update in Prisma
    return this.prisma.video.update({
      where: { id },
      data: updateVideoDto,
    });
  }

  /**
   * Delete a video
   */
  async remove(id: string, organizationId: string): Promise<void> {
    // Check if video exists and belongs to organization
    const video = await this.findOne(id, organizationId);

    // Delete from Cloudflare Stream
    try {
      const response = await fetch(`${this.cloudflareBaseUrl}/${video.cloudflareId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        console.error('Error deleting video from Cloudflare:', data);
      }
    } catch (error) {
      console.error('Error deleting video from Cloudflare:', error);
    }

    // Delete from our database
    await this.prisma.video.delete({
      where: { id },
    });
  }

  /**
   * Check the status of a video and update our database
   */
  async syncVideoStatus(id: string, organizationId: string): Promise<Video> {
    const video = await this.findOne(id, organizationId);

    try {
      const response = await fetch(`${this.cloudflareBaseUrl}/${video.cloudflareId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.cloudflareApiToken}`,
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new BadRequestException(`Failed to get video status: ${data.errors?.[0]?.message || 'Unknown error'}`);
      }

      // Update our database with latest information
      return this.prisma.video.update({
        where: { id: video.id },
        data: {
          status: data.result.readyToStream ? VideoStatus.READY : VideoStatus.PROCESSING,
          duration: data.result.duration,
          thumbnailUrl: data.result.thumbnail,
          playbackUrl: data.result.preview,
        },
      });
    } catch (error) {
      console.error('Error syncing video status:', error);
      throw new BadRequestException('Failed to sync video status');
    }
  }

  /**
   * Create a webhook handler for Cloudflare Stream events
   */
  async handleCloudflareWebhook(payload: any): Promise<void> {
    if (!payload || !payload.uid) {
      throw new BadRequestException('Invalid webhook payload');
    }

    // Find video by Cloudflare ID
    const video = await this.prisma.video.findUnique({
      where: { cloudflareId: payload.uid },
    });

    if (!video) {
      console.log(`No video found with Cloudflare ID: ${payload.uid}`);
      return;
    }

    // Update video status based on webhook event
    switch (payload.status) {
      case 'ready':
        await this.prisma.video.update({
          where: { id: video.id },
          data: {
            status: VideoStatus.READY,
            duration: payload.duration || video.duration,
            thumbnailUrl: payload.thumbnail || video.thumbnailUrl,
            playbackUrl: payload.preview || video.playbackUrl,
          },
        });
        break;
      case 'error':
        await this.prisma.video.update({
          where: { id: video.id },
          data: {
            status: VideoStatus.ERROR,
          },
        });
        break;
    }
  }
} 