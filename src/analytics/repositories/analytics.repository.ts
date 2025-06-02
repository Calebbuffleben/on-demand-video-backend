import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { VideoAnalytics } from '../mux/mux.interface';

@Injectable()
export class AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {}

  async saveVideoAnalytics(analytics: VideoAnalytics): Promise<void> {
    await this.prisma.videoAnalytics.upsert({
      where: {
        videoId: analytics.videoId,
      },
      update: {
        views: analytics.views,
        watchTime: analytics.watchTime,
        retention: JSON.stringify(analytics.retention),
        updatedAt: new Date(),
      },
      create: {
        videoId: analytics.videoId,
        views: analytics.views,
        watchTime: analytics.watchTime,
        retention: JSON.stringify(analytics.retention),
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });
  }

  async getVideoAnalytics(videoId: string): Promise<VideoAnalytics | null> {
    const result = await this.prisma.videoAnalytics.findUnique({
      where: {
        videoId,
      },
    });
    
    if (!result) return null;
    
    return {
      ...result,
      retention: JSON.parse(result.retention as string),
    };
  }
} 