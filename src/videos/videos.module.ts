import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';
import { MuxModule } from '../providers/mux/mux.module';
import { UploadService } from './upload.service';
import { ConfigModule } from '@nestjs/config';

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
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [VideosService, UploadService],
})
export class VideosModule {} 