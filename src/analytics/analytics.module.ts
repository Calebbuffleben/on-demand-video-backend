import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MuxService } from './mux/mux.service';
import { PrismaService } from '../prisma/prisma.service';
import { AnalyticsRepository } from './repositories/analytics.repository';
import { MuxAnalyticsService } from './services/mux-analytics.service';

@Module({
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    MuxService,
    PrismaService,
    AnalyticsRepository,
    MuxAnalyticsService,
  ],
  exports: [AnalyticsService, MuxAnalyticsService],
})
export class AnalyticsModule {} 