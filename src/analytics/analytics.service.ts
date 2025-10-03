import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
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
import { toUtcDateRange, buildCreatedAtFilter } from './utils/time-range.util';
import { parseUserAgent, extractGeoFromHeaders, lookupGeoByIp } from './utils/ua-geo.util';
import { EventsTimeRangeDto } from './dto/events-time-range.dto';

@Injectable()
export class AnalyticsService {
  private readonly logger = new Logger(AnalyticsService.name);

  constructor(
    private prisma: PrismaService,
    @Inject(CACHE_MANAGER) private cacheManager: Cache,
    private configService: ConfigService,
  ) {}

  /**
   * Build an absolute thumbnail URL for a video with sensible fallbacks.
   */
  private buildThumbnailUrl(video: any): string {
    try {
      const appUrl = this.configService.get<string>('APP_URL') || 'http://localhost:4000';
      // 1) If custom cover exists
      if (video?.thumbnailUrl) {
        const t = String(video.thumbnailUrl);
        if (t.startsWith('/')) return `${appUrl}${t}`;
        return t;
      }
      // 2) If internal provider generated thumbnails
      if (video?.thumbnailPath || video?.assetKey) {
        return `${appUrl}/api/videos/thumb/${video.id}/0001.jpg`;
      }
      // 3) If MUX playback exists
      if (video?.muxPlaybackId) {
        return `https://image.mux.com/${video.muxPlaybackId}/thumbnail.jpg`;
      }
    } catch {}
    return '';
  }

  /**
   * Aggregate: unique views (distinct sessionId or userId) per video
   */
  async getUniqueViews(videoId: string, range?: EventsTimeRangeDto): Promise<number> {
    const dateFilter = buildCreatedAtFilter(toUtcDateRange(range));
    // Prefer sessionId; fallback to userId; else count distinct ip+userAgent
    const bySession = await (this.prisma as any).videoPlaybackEvent.groupBy({
      by: ['sessionId'],
      where: { videoId, eventType: { in: ['play', 'ended'] }, sessionId: { not: null }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      _count: { _all: true },
    });
    if (bySession.length > 0) {
      return bySession.length;
    }
    const byUser = await (this.prisma as any).videoPlaybackEvent.groupBy({
      by: ['userId'],
      where: { videoId, eventType: { in: ['play', 'ended'] }, userId: { not: null }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
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
        ${dateFilter?.gte ? Prisma.sql`AND "createdAt" >= ${dateFilter.gte}` : Prisma.sql``}
        ${dateFilter?.lte ? Prisma.sql`AND "createdAt" <= ${dateFilter.lte}` : Prisma.sql``}
    `);
    return rows.length;
  }

  /**
   * Aggregate: total watch time in seconds from timeupdate heartbeats
   * Assumes timeupdate sent every ~5s; we sum deltas per session, clamped ≥0
   */
  async getWatchTimeSeconds(videoId: string, range?: EventsTimeRangeDto): Promise<number> {
    const dateFilter = buildCreatedAtFilter(toUtcDateRange(range));
    // Fetch events ordered by session/time
    const events = await (this.prisma as any).videoPlaybackEvent.findMany({
      where: { videoId, eventType: { in: ['timeupdate', 'ended'] }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
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
  async getRetentionBuckets(videoId: string, duration: number, bucketSize: number = 10, range?: EventsTimeRangeDto) {
    if (!duration || duration <= 0) return [];
    const bucketCount = Math.ceil(duration / bucketSize);
    const buckets = Array.from({ length: bucketCount }, (_, i) => ({ start: i * bucketSize, end: Math.min((i + 1) * bucketSize, duration), viewers: 0 }));

    const progresses = await this.getMaxProgresses(videoId, range);
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
  async getSecondBySecondRetention(videoId: string, duration: number, range?: EventsTimeRangeDto) {
    if (!duration || duration <= 0) return [] as Array<{ time: number; pct: number }>;
    const progresses = await this.getMaxProgresses(videoId, range);
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
  private async getMaxProgresses(videoId: string, range?: EventsTimeRangeDto): Promise<number[]> {
    const dateFilter = buildCreatedAtFilter(toUtcDateRange(range));
    // 1) By sessionId
    const bySession = await (this.prisma as any).videoPlaybackEvent.groupBy({
      by: ['sessionId'],
      where: { videoId, eventType: { in: ['timeupdate', 'ended'] }, sessionId: { not: null }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      _max: { currentTime: true },
    });
    if (bySession.length > 0) return bySession.map((r: any) => r._max?.currentTime ?? 0);

    // 2) By userId
    const byUser = await (this.prisma as any).videoPlaybackEvent.groupBy({
      by: ['userId'],
      where: { videoId, eventType: { in: ['timeupdate', 'ended'] }, userId: { not: null }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      _max: { currentTime: true },
    });
    if (byUser.length > 0) return byUser.map((r: any) => r._max?.currentTime ?? 0);

    // 3) Fallback: ip + userAgent
    const rows = await this.prisma.$queryRaw<{ max_time: number }[]>(Prisma.sql`
      SELECT MAX("currentTime")::int as max_time
      FROM "VideoPlaybackEvent"
      WHERE "videoId" = ${videoId} AND "eventType" IN ('timeupdate','ended')
        ${dateFilter?.gte ? Prisma.sql`AND "createdAt" >= ${dateFilter.gte}` : Prisma.sql``}
        ${dateFilter?.lte ? Prisma.sql`AND "createdAt" <= ${dateFilter.lte}` : Prisma.sql``}
      GROUP BY (COALESCE(ip,'') || '|' || COALESCE("userAgent",''))
    `);
    return rows.map(r => r.max_time || 0);
  }

  /**
   * Compute per-bucket heatmap of watched seconds using timeupdate deltas.
   */
  async getWatchHeatmap(
    videoId: string,
    duration: number,
    bucketSize: number = 5,
    range?: EventsTimeRangeDto,
  ): Promise<Array<{ start: number; end: number; secondsWatched: number; intensityPct: number }>> {
    if (!duration || duration <= 0) return [];
    const dateFilter = buildCreatedAtFilter(toUtcDateRange(range));
    const events = await (this.prisma as any).videoPlaybackEvent.findMany({
      where: { videoId, eventType: { in: ['timeupdate', 'ended'] }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      orderBy: [{ sessionId: 'asc' }, { createdAt: 'asc' }],
      select: { sessionId: true, currentTime: true, createdAt: true },
    });

    const bucketCount = Math.ceil(duration / bucketSize);
    const secondsPerBucket = new Array<number>(bucketCount).fill(0);

    let prevSession = '';
    let prevTime = 0;
    for (const e of events) {
      const s = e.sessionId || 'anon';
      const cur = Math.max(0, Math.min(duration, e.currentTime || 0));
      if (s !== prevSession) {
        prevSession = s;
        prevTime = cur;
        continue;
      }
      if (cur > prevTime && cur - prevTime < 600) {
        let start = prevTime;
        let end = cur;
        const startBucket = Math.floor(start / bucketSize);
        const endBucket = Math.floor((end - 1) / bucketSize);
        for (let b = startBucket; b <= endBucket; b++) {
          const bStart = b * bucketSize;
          const bEnd = Math.min((b + 1) * bucketSize, duration);
          const overlap = Math.max(0, Math.min(end, bEnd) - Math.max(start, bStart));
          if (overlap > 0) secondsPerBucket[b] += overlap;
        }
      }
      prevTime = cur;
    }

    const maxSeconds = secondsPerBucket.reduce((m, v) => (v > m ? v : m), 0) || 1;
    return secondsPerBucket.map((secs, idx) => {
      const start = idx * bucketSize;
      const end = Math.min((idx + 1) * bucketSize, duration);
      return {
        start,
        end,
        secondsWatched: Math.round(secs),
        intensityPct: Math.round((secs / maxSeconds) * 100),
      };
    });
  }

  /**
   * Insights: quartiles, completion, replays, heatmap, drop-offs
   */
  async getEventsInsights(
    videoId: string,
    duration: number,
    range?: EventsTimeRangeDto,
    bucketSize: number = 5,
    topDropOffs: number = 5,
  ) {
    const progresses = await this.getMaxProgresses(videoId, range);
    const totalViewers = progresses.length || 1;

    const milestones = [0.25, 0.5, 0.75, 1.0].map((p) => Math.floor(duration * p));
    const reachCounts = milestones.map((t) => progresses.reduce((acc, p) => acc + (p >= t ? 1 : 0), 0));
    const quartiles = {
      q25: { time: milestones[0], reached: reachCounts[0], pct: Math.round((reachCounts[0] / totalViewers) * 100) },
      q50: { time: milestones[1], reached: reachCounts[1], pct: Math.round((reachCounts[1] / totalViewers) * 100) },
      q75: { time: milestones[2], reached: reachCounts[2], pct: Math.round((reachCounts[2] / totalViewers) * 100) },
      q100: { time: milestones[3], reached: reachCounts[3], pct: Math.round((reachCounts[3] / totalViewers) * 100) },
    };

    const completionThreshold = Math.max(0, duration - Math.ceil(duration * 0.01));
    const completed = progresses.reduce((acc, p) => acc + (p >= completionThreshold ? 1 : 0), 0);
    const completionRate = { completed, pct: Math.round((completed / totalViewers) * 100) };

    const dateFilter = buildCreatedAtFilter(toUtcDateRange(range));
    const playEvents: Array<{ sessionId: string | null }> = await (this.prisma as any).videoPlaybackEvent.findMany({
      where: { videoId, eventType: 'play', ...(dateFilter ? { createdAt: dateFilter } : {}) },
      select: { sessionId: true },
      orderBy: [{ sessionId: 'asc' }],
    });
    const replayMap = new Map<string, number>();
    for (const e of playEvents) {
      const key = e.sessionId || 'anon';
      replayMap.set(key, (replayMap.get(key) || 0) + 1);
    }
    let replayCount = 0;
    let sessionsWithReplay = 0;
    for (const [, count] of replayMap) {
      if (count > 1) {
        replayCount += count - 1;
        sessionsWithReplay += 1;
      }
    }
    const replays = {
      count: replayCount,
      sessionsWithReplay,
      ratePct: Math.round((sessionsWithReplay / totalViewers) * 100),
    };

    const heatmap = await this.getWatchHeatmap(videoId, duration, bucketSize, range);

    const perSecond = await this.getSecondBySecondRetention(videoId, duration, range);
    const drops: Array<{ time: number; dropPct: number }> = [];
    for (let i = 0; i < perSecond.length - 1; i++) {
      const d = perSecond[i].pct - perSecond[i + 1].pct;
      if (d > 0) drops.push({ time: perSecond[i + 1].time, dropPct: d });
    }
    drops.sort((a, b) => b.dropPct - a.dropPct);
    const dropOffPoints = drops.slice(0, topDropOffs);

    return { quartiles, completionRate, replays, heatmap, dropOffPoints };
  }

  /**
   * Build viewer analytics (devices, browsers, OS, locations) from User-Agent/IP headers stored in events.
   * We derive breakdowns from 'play' and 'ended' events to approximate unique viewers.
   */
  async getViewerAnalyticsFromEvents(videoId: string, range?: EventsTimeRangeDto) {
    const dateFilter = buildCreatedAtFilter(toUtcDateRange(range));
    // Use the earliest event per logical session to avoid double counting
    const events: Array<{ userAgent: string | null; ip: string | null; sessionId: string | null; userId: string | null; createdAt: Date }>
      = await (this.prisma as any).videoPlaybackEvent.findMany({
      where: { videoId, eventType: { in: ['play', 'ended'] }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
      select: { userAgent: true, ip: true, sessionId: true, userId: true, createdAt: true },
      orderBy: [{ sessionId: 'asc' }, { userId: 'asc' }, { createdAt: 'asc' }],
    });

    // Deduplicate by priority: sessionId -> userId -> (ip|ua)
    const seenKeys = new Set<string>();
    const uniqueEvents: Array<{ userAgent: string | null; ip: string | null }> = [];
    for (const e of events) {
      const sessionKey = e.sessionId ? `s:${e.sessionId}` : '';
      const userKey = !sessionKey && e.userId ? `u:${e.userId}` : '';
      const ipUaKey = !sessionKey && !userKey ? `k:${e.ip || ''}|${e.userAgent || ''}` : '';
      const key = sessionKey || userKey || ipUaKey;
      if (!key) continue;
      if (seenKeys.has(key)) continue;
      seenKeys.add(key);
      uniqueEvents.push({ userAgent: e.userAgent, ip: e.ip });
    }

    const deviceMap = new Map<string, { device: string; category: string; manufacturer: string; views: number }>();
    const browserMap = new Map<string, { browser: string; version: string; views: number }>();
    const osMap = new Map<string, { os: string; version: string; views: number }>();
    const locationMap = new Map<string, { country: string; countryCode: string; region?: string; city?: string; views: number }>();

    for (const e of uniqueEvents) {
      const parsed = parseUserAgent(e.userAgent || undefined);
      const deviceKey = `${parsed.device.type}|${parsed.device.manufacturer}`;
      const browserKey = `${parsed.browser.name}|${parsed.browser.version}`;
      const osKey = `${parsed.os.name}|${parsed.os.version}`;
      const geo = lookupGeoByIp(e.ip) || extractGeoFromHeaders({});
      const locKey = `${geo.countryCode}|${geo.region || ''}|${geo.city || ''}`;

      const deviceLabel = parsed.device.type === 'desktop' ? 'Desktop' : parsed.device.type === 'tablet' ? 'Tablet' : parsed.device.type === 'phone' ? 'Phone' : 'Unknown';
      const manufacturer = parsed.device.manufacturer || 'Unknown';
      const deviceEntry = deviceMap.get(deviceKey) || { device: deviceLabel, category: parsed.device.type, manufacturer, views: 0 };
      deviceEntry.views += 1;
      deviceMap.set(deviceKey, deviceEntry);

      const [bName, bVer] = browserKey.split('|');
      const browserEntry = browserMap.get(browserKey) || { browser: bName, version: bVer, views: 0 };
      browserEntry.views += 1;
      browserMap.set(browserKey, browserEntry);

      const [oName, oVer] = osKey.split('|');
      const osEntry = osMap.get(osKey) || { os: oName, version: oVer, views: 0 };
      osEntry.views += 1;
      osMap.set(osKey, osEntry);

      const [cc, reg, city] = locKey.split('|');
      const locEntry = locationMap.get(locKey) || { country: geo.country, countryCode: cc || 'ZZ', region: reg || undefined, city: city || undefined, views: 0 };
      locEntry.views += 1;
      locationMap.set(locKey, locEntry);
    }

    const total = uniqueEvents.length || 1;
    const toPct = (n: number) => Math.round((n / total) * 1000) / 10; // 1 decimal

    return {
      devices: Array.from(deviceMap.values()).map(d => ({ ...d, percentage: toPct(d.views) })),
      browsers: Array.from(browserMap.values()).map(b => ({ ...b, percentage: toPct(b.views) })),
      operatingSystems: Array.from(osMap.values()).map(o => ({ ...o, percentage: toPct(o.views) })),
      locations: Array.from(locationMap.values()).map(l => ({ ...l, percentage: toPct(l.views) })),
      connections: [] as Array<{ connectionType: string; views: number; percentage: number }>,
      totalViews: await this.getUniqueViews(videoId, range),
    };
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
        thumbnailUrl: this.buildThumbnailUrl(video),
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
          thumbnailUrl: this.buildThumbnailUrl(video),
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