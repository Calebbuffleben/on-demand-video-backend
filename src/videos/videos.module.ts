import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { VideosService } from './videos.service';
import { VideosController } from './videos.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { TransformInterceptor } from '../common/interceptors/transform.interceptor';

@Module({
  imports: [PrismaModule],
  controllers: [VideosController],
  providers: [
    VideosService,
    {
      provide: APP_INTERCEPTOR,
      useClass: TransformInterceptor,
    },
  ],
  exports: [VideosService],
})
export class VideosModule {} 