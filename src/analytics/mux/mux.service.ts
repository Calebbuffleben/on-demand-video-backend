import { Injectable, Logger } from '@nestjs/common';
import { MuxCredentials, VideoAnalytics, ViewCountData } from './mux.interface';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class MuxService {
  private readonly logger = new Logger(MuxService.name);

  constructor(private readonly prisma: PrismaService) {}

  async getVideoAnalytics(videoId: string, tenantId: string): Promise<VideoAnalytics> {
    const credentials = await this.getTenantCredentials(tenantId);
    // TODO: Implement Mux API calls using credentials
    throw new Error('Not implemented');
  }

  async getViewCountData(videoId: string, tenantId: string): Promise<ViewCountData> {
    const credentials = await this.getTenantCredentials(tenantId);
    // TODO: Implement Mux API calls using credentials
    throw new Error('Not implemented');
  }

  private async getTenantCredentials(tenantId: string): Promise<MuxCredentials> {
    const organization = await this.prisma.organization.findUnique({
      where: { id: tenantId },
      select: {
        muxTokenId: true,
        muxTokenSecret: true,
      },
    });

    if (!organization || !organization.muxTokenId || !organization.muxTokenSecret) {
      throw new Error(`Organization ${tenantId} not found or missing Mux credentials`);
    }

    return {
      accessToken: organization.muxTokenId,
      secretKey: organization.muxTokenSecret,
      tenantId,
    };
  }
} 