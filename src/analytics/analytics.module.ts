import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { MuxService } from './mux.service';
import { ConfigModule } from '@nestjs/config';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    ConfigModule,
    CacheModule.register({
      ttl: 60 * 5, // 5 minutes
      max: 100, // maximum number of items in cache
    }),
  ],
  controllers: [AnalyticsController],
  providers: [AnalyticsService, MuxService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {} 