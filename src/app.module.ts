import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_INTERCEPTOR } from '@nestjs/core';
import { AppConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { VideosModule } from './videos/videos.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { MuxModule } from './providers/mux/mux.module';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { OrganizationScopeInterceptor } from './common/interceptors/organization-scope.interceptor';
import { PaymentsModule } from './payments/payments.module';

@Module({
  imports: [
    AppConfigModule,
    PrismaModule,
    AuthModule,
    VideosModule,
    SubscriptionsModule,
    AnalyticsModule,
    MuxModule,
    PaymentsModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_INTERCEPTOR,
      useClass: OrganizationScopeInterceptor,
    },
  ],
})
export class AppModule {}
