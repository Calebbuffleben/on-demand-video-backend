import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MuxModule } from '../providers/mux/mux.module';
import { MuxAnalyticsService } from './services/mux-analytics.service';
import { CacheModule } from '@nestjs/cache-manager';
import { MuxService } from './mux.service';

@Module({
  imports: [
    PrismaModule,
    MuxModule,
    CacheModule.register(),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, MuxAnalyticsService, MuxService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {} 