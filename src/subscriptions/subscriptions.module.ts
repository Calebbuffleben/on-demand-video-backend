import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { PrismaModule } from '../prisma/prisma.module';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { LimitsService } from '../common/limits.service';
import { R2Service } from '../storage/r2.service';

@Module({
  imports: [AuthModule, PrismaModule],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, StripeService, LimitsService, R2Service],
  exports: [SubscriptionsService, StripeService, LimitsService],
})
export class SubscriptionsModule {} 