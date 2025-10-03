import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { MuxModule } from '../providers/mux/mux.module';
import { UploadService } from './upload.service';
import { ConfigModule } from '@nestjs/config';
import { R2Service } from '../storage/r2.service';
import { ContentCacheService } from '../storage/content-cache.service';
import { TranscodeQueue } from '../queue/transcode.queue';
import { JwtPlaybackService } from './jwt-playback.service';
import { VideoProviderFactory } from './providers/video-provider.factory';
import { InternalProvider } from './providers/internal.provider';
import { MuxProvider } from './providers/mux.provider';
import { LimitsService } from '../common/limits.service';

@Module({
  imports: [
    PrismaModule,
    MuxModule,
    ConfigModule
  ],
  controllers: [VideosController],
  providers: [
    VideosService,
    UploadService,
    R2Service,
    ContentCacheService,
    TranscodeQueue,
    JwtPlaybackService,
    VideoProviderFactory,
    InternalProvider,
    MuxProvider,
    LimitsService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [VideosService, UploadService],
})
export class VideosModule {} 