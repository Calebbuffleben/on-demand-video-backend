import { Injectable, ForbiddenException, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Prisma, PlanType } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { R2Service } from '../storage/r2.service';

export interface PlanLimits {
  maxStorageGB: number | null; // null => unlimited
  maxTotalMinutes: number | null;
  maxUniqueViews: number | null;
}

const DEFAULT_LIMITS: Record<PlanType, PlanLimits> = {
  FREE: { maxStorageGB: 2, maxTotalMinutes: 60, maxUniqueViews: 1000 },
  BASIC: { maxStorageGB: 50, maxTotalMinutes: 600, maxUniqueViews: 50000 },
  PRO: { maxStorageGB: 500, maxTotalMinutes: 5000, maxUniqueViews: 1000000 },
  ENTERPRISE: { maxStorageGB: null, maxTotalMinutes: null, maxUniqueViews: null },
};

@Injectable()
export class LimitsService {
  private readonly logger = new Logger(LimitsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly r2: R2Service,
    private readonly config: ConfigService,
  ) {}

  getLimitsForPlan(plan: PlanType): PlanLimits {
    const raw = this.config.get<string>('PLAN_LIMITS_JSON');
    if (raw) {
      try {
        const parsed = JSON.parse(raw) as Partial<Record<PlanType, Partial<PlanLimits>>>;
        const base = DEFAULT_LIMITS[plan];
        const override = parsed[plan] || {};
        return {
          maxStorageGB: override.maxStorageGB ?? base.maxStorageGB,
          maxTotalMinutes: override.maxTotalMinutes ?? base.maxTotalMinutes,
          maxUniqueViews: override.maxUniqueViews ?? base.maxUniqueViews,
        };
      } catch (e) {
        this.logger.warn(`Invalid PLAN_LIMITS_JSON: ${(e as Error).message}`);
      }
    }
    return DEFAULT_LIMITS[plan];
  }

  async getOrganizationPlan(organizationId: string): Promise<PlanType> {
    const sub = await this.prisma.subscription.findUnique({ where: { organizationId } });
    return sub?.planType ?? PlanType.FREE;
  }

  async getOrganizationUsage(organizationId: string): Promise<{
    storageGB: number;
    totalMinutes: number;
    uniqueViews: number;
  }> {
    // Storage usage from R2
    const bytes = await this.r2.getTotalSizeForPrefix(`org/${organizationId}/`);
    const storageGB = bytes / (1024 ** 3);

    // Total minutes from Video.duration (seconds)
    const agg = await this.prisma.video.aggregate({
      where: { organizationId },
      _sum: { duration: true },
    });
    const totalSeconds = agg._sum.duration || 0;
    const totalMinutes = Math.floor(totalSeconds / 60);

    // Unique views across org (prefer session, fallback user, then ip|ua)
    let uniqueViews = 0;
    const bySession = await this.prisma.$queryRaw<{ views: number }[]>(Prisma.sql`
      SELECT COUNT(DISTINCT "sessionId")::int AS views
      FROM "VideoPlaybackEvent"
      WHERE "organizationId" = ${organizationId} AND "eventType" IN ('play','ended') AND "sessionId" IS NOT NULL
    `);
    uniqueViews = bySession?.[0]?.views || 0;
    if (uniqueViews === 0) {
      const byUser = await this.prisma.$queryRaw<{ views: number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT "userId")::int AS views
        FROM "VideoPlaybackEvent"
        WHERE "organizationId" = ${organizationId} AND "eventType" IN ('play','ended') AND "userId" IS NOT NULL
      `);
      uniqueViews = byUser?.[0]?.views || 0;
    }
    if (uniqueViews === 0) {
      const byIpUa = await this.prisma.$queryRaw<{ views: number }[]>(Prisma.sql`
        SELECT COUNT(DISTINCT (COALESCE(ip,'') || '|' || COALESCE("userAgent",'')))::int AS views
        FROM "VideoPlaybackEvent"
        WHERE "organizationId" = ${organizationId} AND "eventType" IN ('play','ended')
      `);
      uniqueViews = byIpUa?.[0]?.views || 0;
    }

    return { storageGB, totalMinutes, uniqueViews };
  }

  async ensureCanUpload(organizationId: string, expectedAdditionalMinutes: number, expectedAdditionalBytes: number = 0): Promise<void> {
    const plan = await this.getOrganizationPlan(organizationId);
    const limits = this.getLimitsForPlan(plan);
    const usage = await this.getOrganizationUsage(organizationId);

    if (limits.maxTotalMinutes !== null) {
      const projected = usage.totalMinutes + expectedAdditionalMinutes;
      if (projected > limits.maxTotalMinutes) {
        throw new ForbiddenException('limit_total_minutes_exceeded');
      }
    }

    if (limits.maxStorageGB !== null) {
      const projectedStorageGB = usage.storageGB + (expectedAdditionalBytes / (1024 ** 3));
      if (projectedStorageGB > limits.maxStorageGB) {
        throw new ForbiddenException('limit_storage_gb_exceeded');
      }
    }
  }

  async ensureCanEmbed(organizationId: string): Promise<void> {
    const plan = await this.getOrganizationPlan(organizationId);
    const limits = this.getLimitsForPlan(plan);
    if (limits.maxUniqueViews === null) return;
    const usage = await this.getOrganizationUsage(organizationId);
    if (usage.uniqueViews >= limits.maxUniqueViews) {
      throw new ForbiddenException('limit_unique_views_exceeded');
    }
  }
}


