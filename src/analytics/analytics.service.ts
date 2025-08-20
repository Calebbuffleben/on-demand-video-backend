import { Injectable, Logger } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject } from '@nestjs/common';
import { Cache } from 'cache-manager';
import { PrismaService } from '../prisma/prisma.service';
import { 
  PlatformStats, 
  RecentUpload, 
  PopularVideo, 
  DashboardResponse
} from './interfaces/analytics.interfaces';
import { Prisma } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache
  ) {}

  /**
   * Aggregate: unique views (distinct sessionId or userId) per video
   */
  async getUniqueViews(videoId: string): Promise<number> {
    // Prefer sessionId; fallback to userId; else count distinct ip+userAgent
    const bySession = await (this.prisma as any).videoPlaybackEvent.groupBy({
      by: ['sessionId'],
      where: { videoId, eventType: { in: ['play', 'ended'] }, sessionId: { not: null } },
      _count: { _all: true },
    });
    if (bySession.length > 0) {
      return bySession.length;
    }
    const byUser = await (this.prisma as any).videoPlaybackEvent.groupBy({
      by: ['userId'],
      where: { videoId, eventType: { in: ['play', 'ended'] }, userId: { not: null } },
      _count: { _all: true },
    });
    if (byUser.length > 0) {
      return byUser.length;
    }
    // Crude unique visitor estimate by ip+userAgent
    const rows = await this.prisma.$queryRaw<{ k: string }[]>(Prisma.sql`
      SELECT DISTINCT (COALESCE(ip,'') || '|' || COALESCE("userAgent",'')) as k
      FROM "VideoPlaybackEvent"
      WHERE "videoId" = ${videoId} AND "eventType" IN ('play','ended')
    `);
    return rows.length;
  }

  /**
   * Aggregate: total watch time in seconds from timeupdate heartbeats
   * Assumes timeupdate sent every ~5s; we sum deltas per session, clamped ≥0
   */
  async getWatchTimeSeconds(videoId: string): Promise<number> {
    // Fetch events ordered by session/time
    const events = await (this.prisma as any).videoPlaybackEvent.findMany({
      where: { videoId, eventType: { in: ['timeupdate', 'ended'] } },
      orderBy: [{ sessionId: 'asc' }, { createdAt: 'asc' }],
      select: { sessionId: true, currentTime: true, createdAt: true },
    });
    let total = 0;
    let prevSession = '';
    let prevTime = 0;
    for (const e of events) {
      const s = e.sessionId || 'anon';
      if (s !== prevSession) {
        prevSession = s;
        prevTime = e.currentTime || 0;
        continue;
      }
      const delta = (e.currentTime || 0) - prevTime;
      if (delta > 0 && delta < 60) total += delta; // guard anomalies
      prevTime = e.currentTime || 0;
    }
    return Math.floor(total);
  }

  /**
   * Aggregate retention into buckets of N seconds (default 10s).
   * Returns [{ start: 0, end: 10, viewers: X, pct: Y }, ...]
   */
  async getRetentionBuckets(videoId: string, duration: number, bucketSize: number = 10) {
    if (!duration || duration <= 0) return [];
    const bucketCount = Math.ceil(duration / bucketSize);
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({ start: i * bucketSize, end: Math.min((i + 1) * bucketSize, duration), viewers: 0 }));

    const progresses = await this.getMaxProgresses(videoId);
    for (const p of progresses) {
      const reachedIndex = Math.min(Math.floor(p / bucketSize), bucketCount - 1);
      for (let i = 0; i <= reachedIndex; i++) buckets[i].viewers += 1;
    }
    const totalViewers = progresses.length || 1;
    return buckets.map(b => ({ ...b, pct: Math.round((b.viewers / totalViewers) * 100) }));
  }

  /**
   * Compute per-second retention: for each second s, percent of sessions that reached >= s.
   */
  async getSecondBySecondRetention(videoId: string, duration: number) {
    if (!duration || duration <= 0) return [] as Array<{ time: number; pct: number }>;
    const progresses = await this.getMaxProgresses(videoId);
    const total = progresses.length || 1;
    const result: Array<{ time: number; pct: number }> = [];
    for (let s = 0; s <= duration; s++) {
      const viewers = progresses.reduce((acc, p) => acc + (p >= s ? 1 : 0), 0);
      result.push({ time: s, pct: Math.round((viewers / total) * 100) });
    }
    return result;
  }

  /**
   * Helper: get maximum currentTime reached per logical session.
   * Prefer sessionId, fallback to userId, then fallback to ip+userAgent.
   */
  private async getMaxProgresses(videoId: string): Promise<number[]> {
    // 1) By sessionId
    const bySession = await (this.prisma as any).videoPlaybackEvent.groupBy({
      by: ['sessionId'],
      where: { videoId, eventType: { in: ['timeupdate', 'ended'] }, sessionId: { not: null } },
      _max: { currentTime: true },
    });
    if (bySession.length > 0) return bySession.map((r: any) => r._max?.currentTime ?? 0);

    // 2) By userId
    const byUser = await (this.prisma as any).videoPlaybackEvent.groupBy({
      by: ['userId'],
      where: { videoId, eventType: { in: ['timeupdate', 'ended'] }, userId: { not: null } },
      _max: { currentTime: true },
    });
    if (byUser.length > 0) return byUser.map((r: any) => r._max?.currentTime ?? 0);

    // 3) Fallback: ip + userAgent
    const rows = await this.prisma.$queryRaw<{ max_time: number }[]>(Prisma.sql`
      SELECT MAX("currentTime")::int as max_time
      FROM "VideoPlaybackEvent"
      WHERE "videoId" = ${videoId} AND "eventType" IN ('timeupdate','ended')
      GROUP BY (COALESCE(ip,'') || '|' || COALESCE("userAgent",''))
    `);
    return rows.map(r => r.max_time || 0);
  }

  /**
   * Format file size from bytes to human readable format
   */
  private formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 Bytes';

    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));

    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format duration from seconds to MM:SS format
   */
  private formatDuration(seconds: number): string {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  }

  /**
   * Format date to display format
   */
  private formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric'
    });
  }

  /**
   * Get platform statistics
   */
  async getPlatformStats(organizationId?: string): Promise<PlatformStats> {
    const cacheKey = `platform_stats_${organizationId || 'default'}`;
    const cachedStats = await this.cacheManager.get<PlatformStats>(cacheKey);
    
    if (cachedStats) {
      return cachedStats;
    }

    try {
      // Get videos from database
      const videos = await this.prisma.video.findMany({
        where: organizationId ? { organizationId } : undefined,
        select: { id: true },
      });

      // Calculate totals using raw event views
      const viewsByVideo = await this.getUniqueViewsByVideoMap(organizationId);
      const totalVideos = videos.length;
      const totalViews = videos.reduce((sum, v) => sum + (viewsByVideo[v.id] || 0), 0);
      const totalStorage = '0 GB';
      const totalBandwidth = '0 GB';

      const stats: PlatformStats = {
        totalVideos,
        totalViews,
        totalStorage,
        totalBandwidth,
      };

      // Cache the results
      await this.cacheManager.set(cacheKey, stats, 60 * 5); // 5 minutes

      return stats;
    } catch (error) {
      this.logger.error('Error getting platform stats', error);
      
      // Return default values on error
      return {
        totalVideos: 0,
        totalViews: 0,
        totalStorage: '0 GB',
        totalBandwidth: '0 GB',
      };
    }
  }

  /**
   * Get recent uploads
   */
  async getRecentUploads(limit: number = 5, organizationId?: string): Promise<RecentUpload[]> {
    const cacheKey = `recent_uploads_${limit}_${organizationId || 'default'}`;
    const cachedUploads = await this.cacheManager.get<RecentUpload[]>(cacheKey);
    
    if (cachedUploads) {
      return cachedUploads;
    }

    try {
      const videos = await this.prisma.video.findMany({
        where: organizationId ? { organizationId } : undefined,
        include: {
          analytics: true,
        },
        orderBy: { createdAt: 'desc' },
        take: limit,
      });

      const recentUploads = videos.map(video => ({
        id: video.id,
        title: video.name || 'Untitled Video',
        thumbnailUrl: video.thumbnailUrl || '',
        uploadDate: this.formatDate(video.createdAt.toISOString()),
        size: this.formatFileSize(video.analytics?.watchTime || 0),
        duration: this.formatDuration(video.duration || 0),
      }));

      // Cache the results
      await this.cacheManager.set(cacheKey, recentUploads, 60 * 5); // 5 minutes

      return recentUploads;
    } catch (error) {
      this.logger.error('Error getting recent uploads', error);
      return [];
    }
  }

  /**
   * Get popular videos
   */
  async getPopularVideos(limit: number = 5, organizationId?: string): Promise<PopularVideo[]> {
    const cacheKey = `popular_videos_${limit}_${organizationId || 'default'}`;
    const cachedVideos = await this.cacheManager.get<PopularVideo[]>(cacheKey);
    
    if (cachedVideos) {
      return cachedVideos;
    }

    try {
      // Get videos and compute event-based views
      const videos = await this.prisma.video.findMany({
        where: organizationId ? { organizationId } : undefined,
        select: {
          id: true,
          name: true,
          thumbnailUrl: true,
          duration: true,
        },
      });

      const viewsByVideo = await this.getUniqueViewsByVideoMap(organizationId);

      const popularVideos = videos
        .map(video => ({
          id: video.id,
          title: video.name || 'Untitled Video',
          thumbnailUrl: video.thumbnailUrl || '',
          views: viewsByVideo[video.id] || 0,
          duration: this.formatDuration(video.duration || 0),
        }))
        .sort((a, b) => b.views - a.views)
        .slice(0, limit);

      // Cache the results
      await this.cacheManager.set(cacheKey, popularVideos, 60 * 5); // 5 minutes

      return popularVideos;
    } catch (error) {
      this.logger.error('Error getting popular videos', error);
      return [];
    }
  }

  /**
   * Get dashboard data (combined endpoint)
   */
  async getDashboardData(organizationId?: string): Promise<DashboardResponse> {
    const cacheKey = `dashboard_data_${organizationId || 'default'}`;
    const cachedData = await this.cacheManager.get<DashboardResponse>(cacheKey);
    
    if (cachedData) {
      return cachedData;
    }

    try {
      // Get all data in parallel
      const [
        platformStats,
        recentUploads,
        popularVideos
      ] = await Promise.all([
        this.getPlatformStats(organizationId),
        this.getRecentUploads(5, organizationId),
        this.getPopularVideos(3, organizationId)
      ]);

      const dashboardData: DashboardResponse = {
        platformStats,
        recentUploads,
        popularVideos
      };

      // Cache the results
      await this.cacheManager.set(cacheKey, dashboardData, 60 * 5); // 5 minutes

      return dashboardData;
    } catch (error) {
      this.logger.error('Error getting dashboard data', error);
      
      // Return empty data on error
      return {
        platformStats: {
          totalVideos: 0,
          totalViews: 0,
          totalStorage: '0 GB',
          totalBandwidth: '0 GB',
        },
        recentUploads: [],
        popularVideos: []
      };
    }
  }

  /**
   * Build a map of unique views per video using raw events.
   */
  private async getUniqueViewsByVideoMap(organizationId?: string): Promise<Record<string, number>> {
    // Try sessionId-first aggregation
    const bySession = await this.prisma.$queryRaw<{ videoId: string; views: number }[]>(Prisma.sql`
      SELECT "videoId", COUNT(DISTINCT "sessionId")::int AS views
      FROM "VideoPlaybackEvent"
      WHERE ${organizationId ? Prisma.sql`"organizationId" = ${organizationId} AND` : Prisma.sql``}
            "eventType" IN ('play','ended') AND "sessionId" IS NOT NULL
      GROUP BY "videoId"
    `);
    const map: Record<string, number> = {};
    for (const row of bySession) map[row.videoId] = row.views || 0;
    if (bySession.length > 0) return map;

    // Fallback by userId
    const byUser = await this.prisma.$queryRaw<{ videoId: string; views: number }[]>(Prisma.sql`
      SELECT "videoId", COUNT(DISTINCT "userId")::int AS views
      FROM "VideoPlaybackEvent"
      WHERE ${organizationId ? Prisma.sql`"organizationId" = ${organizationId} AND` : Prisma.sql``}
            "eventType" IN ('play','ended') AND "userId" IS NOT NULL
      GROUP BY "videoId"
    `);
    for (const row of byUser) map[row.videoId] = row.views || 0;
    if (byUser.length > 0) return map;

    // Final fallback by ip|userAgent hash
    const byIpUa = await this.prisma.$queryRaw<{ videoId: string; views: number }[]>(Prisma.sql`
      SELECT "videoId", COUNT(DISTINCT (COALESCE(ip,'') || '|' || COALESCE("userAgent",'')))::int AS views
      FROM "VideoPlaybackEvent"
      WHERE ${organizationId ? Prisma.sql`"organizationId" = ${organizationId} AND` : Prisma.sql``}
            "eventType" IN ('play','ended')
      GROUP BY "videoId"
    `);
    for (const row of byIpUa) map[row.videoId] = row.views || 0;
    return map;
  }
} 