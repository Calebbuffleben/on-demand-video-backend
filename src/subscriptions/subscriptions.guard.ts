import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Observable } from 'rxjs';
import { SubscriptionsService } from './subscriptions.service';

enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  TRIALING = 'TRIALING'
}

@Injectable()
export class SubscriptionsGuard implements CanActivate {
  constructor(private subscriptionsService: SubscriptionsService) {}
  async canActivate(ctx: ExecutionContext) {
    const request = ctx.switchToHttp().getRequest();
    const route = request.route?.path;

    if(['/billing', '/payments/webhook', '/auth/*'].some(path => route?.startsWith(path))) {
      return true;
    }
    const subscription = await this.subscriptionsService.getSubscriptionStatus(request);
    if (subscription.status === SubscriptionStatus.ACTIVE || subscription.status === SubscriptionStatus.TRIALING) return true;
    if (subscription.status === SubscriptionStatus.PAST_DUE) return true; // grace window handled by service later if needed
    throw new ForbiddenException('subscription_inactive');
  }
}
