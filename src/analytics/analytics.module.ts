import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { CloudflareService } from './cloudflare.service';
import { PrismaModule } from '../prisma/prisma.module';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { CacheModule } from '@nestjs/cache-manager';

@Module({
  imports: [
    PrismaModule,
    CacheModule.register({
      ttl: 60 * 5, // 5 minutes cache
      max: 100, // maximum 100 items in cache
    }),
  ],
  controllers: [AnalyticsController],
  providers: [
    AnalyticsService,
    CloudflareService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [AnalyticsService, CloudflareService],
})
export class AnalyticsModule {} 