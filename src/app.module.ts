import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VideosModule } from './videos/videos.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    VideosModule,
    SubscriptionsModule,
  ],
})
export class AppModule {}
