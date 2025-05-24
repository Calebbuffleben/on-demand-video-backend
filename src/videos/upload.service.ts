import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { randomUUID } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';
import * as mime from 'mime-types';
import { Mux } from '@mux/mux-node'; // Added Mux for potential future use or consistency

@Injectable()
export class UploadService {
  private readonly logger = new Logger(UploadService.name);
  private readonly uploadDir: string;
  private readonly MuxService; // Placeholder for MuxService if needed later

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    // private readonly muxService: MuxService, // Intentionally commented out for now
  ) {
    this.uploadDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadDir)) {
      fs.mkdirSync(this.uploadDir, { recursive: true });
      this.logger.log(`Created uploads directory at ${this.uploadDir}`);
    }
    // Initialize MuxService if it were injected
    // this.MuxService = muxService;
  }

  /**
   * Upload a cover image for a video
   */
  async uploadCoverImage(file: Express.Multer.File, videoId: string, organizationId: string) {
    try {
      this.logger.log(`Uploading cover image for video ${videoId} in organization ${organizationId}`);
      
      if (!file) {
        this.logger.error('No cover image file uploaded.');
        throw new BadRequestException('No cover image file uploaded');
      }

      const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
      if (!allowedTypes.includes(file.mimetype)) {
        this.logger.error(`Invalid file type: ${file.mimetype}. Only JPEG, PNG, WebP, GIF are allowed.`);
        throw new BadRequestException('Invalid file type. Only JPEG, PNG, WebP, and GIF images are allowed.');
      }

      this.logger.log(`Looking for video with ID: ${videoId} and organization ID: ${organizationId}`);
      const video = await this.prisma.video.findUnique({
        where: { 
          id: videoId,
          organizationId: organizationId 
        }
      });

      if (!video) {
        this.logger.error(`Video not found for ID: ${videoId} and organization ID: ${organizationId}`);
        throw new BadRequestException('Video not found or you do not have permission to upload a cover image for this video.');
      }
      this.logger.log(`Found video: ${video.name}`);

      const fileExt = mime.extension(file.mimetype);
      const filename = `cover_${videoId}_${randomUUID()}.${fileExt}`;
      
      const coverDir = path.join(this.uploadDir, 'covers');
      if (!fs.existsSync(coverDir)) {
        fs.mkdirSync(coverDir, { recursive: true });
        this.logger.log(`Created covers directory at ${coverDir}`);
      }
      const filepath = path.join(coverDir, filename);

      this.logger.log(`Saving cover image to ${filepath}`);
      fs.writeFileSync(filepath, file.buffer);

      const thumbnailUrl = `/uploads/covers/${filename}`; // Relative path for frontend
      this.logger.log(`Updating video ${videoId} with new thumbnailUrl: ${thumbnailUrl}`);
      
      const updatedVideo = await this.prisma.video.update({
        where: { id: videoId },
        data: { thumbnailUrl }
      });

      this.logger.log(`Cover image uploaded successfully for video ${videoId}. New thumbnail URL: ${updatedVideo.thumbnailUrl}`);

      return {
        success: true,
        message: 'Cover image uploaded successfully',
        data: {
          result: [updatedVideo]
        }
      };
    } catch (error) {
      this.logger.error(`Error uploading cover image for video ${videoId}: ${error.message}`, error.stack);
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to upload cover image: ${error.message}`);
    }
  }

  async removeCoverImage(videoId: string, organizationId: string) {
    this.logger.log(`Removing cover image for video ${videoId} in organization ${organizationId}`);
    const video = await this.prisma.video.findUnique({ where: { id: videoId, organizationId } });
    if (!video) throw new BadRequestException('Video not found');
    await this.prisma.video.update({ where: { id: videoId }, data: { thumbnailUrl: null } });
    this.logger.log(`Cover image removed for video ${videoId}`);
    return { success: true, message: 'Cover image removed' };
  }

  // Placeholder for generateVideoThumbnail if we decide to use it from here
  // async generateVideoThumbnail(videoId: string, muxAssetId: string, organizationId: string): Promise<string | null> { ... }
} 