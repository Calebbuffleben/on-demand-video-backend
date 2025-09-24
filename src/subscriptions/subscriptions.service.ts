import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription, PlanType } from '@prisma/client';
import { CreateInviteDto } from './dto/create-invite.dto';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Request } from 'express';
import { createHash, randomBytes } from 'crypto';
// Updated to include invite model

// Type for authenticated request with organization
interface AuthenticatedRequest extends Request {
  organization?: {
    id: string;
    name: string;
    slug: string | null;
  };
  user?: {
    id: string;
    email: string;
  };
}

// Type assertion for invite model
type PrismaWithInvite = PrismaService & {
  invite: {
    create: (args: { 
      data: { 
        email: string; 
        organizationId: string; 
        role: string; 
        token: string; 
        expiresAt: Date 
      } 
    }) => Promise<{ 
      id: string; 
      email: string; 
      organizationId: string; 
      role: string; 
      token: string; 
      expiresAt: Date; 
      createdAt: Date 
    }>;
  };
};

// PlanType enum is now imported from @prisma/client

enum SubscriptionStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PAST_DUE = 'PAST_DUE',
  CANCELED = 'CANCELED',
  TRIALING = 'TRIALING'
}

@Injectable()
export class SubscriptionsService {

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {
  
  }

  // Esse metodo cria um convite para um usuario
  async createInvite(createInviteDto: CreateInviteDto, req: Request) {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    if (!organizationId) {
      throw new NotFoundException('Organization not found');
    }

    // Generate strong token and store only its hash
    const rawToken = randomBytes(32).toString('hex');
    const tokenHash = createHash('sha256').update(rawToken).digest('hex');

    const invite = await (this.prisma as PrismaWithInvite).invite.create({
      data: {
        ...createInviteDto,
        organizationId,
        role: 'MEMBER',
        token: tokenHash, // store hash in the existing token field
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });

    // Return safe payload with the raw token only once
    return {
      id: invite.id,
      email: invite.email,
      organizationId: invite.organizationId,
      role: invite.role,
      expiresAt: invite.expiresAt,
      token: rawToken,
      createdAt: invite.createdAt,
    };
  }

  private getGraceDays(): number {
    const raw = this.configService.get('SUBS_GRACE_DAYS');
    const num = Number(raw);
    return Number.isFinite(num) && num >= 0 ? num : 3;
  }

  private isWithinGrace(subscription: Subscription): boolean {
    if (subscription.status !== SubscriptionStatus.PAST_DUE) return false;
    if (!subscription.currentPeriodEnd) return false;
    const graceMs = this.getGraceDays() * 24 * 60 * 60 * 1000;
    return Date.now() <= new Date(subscription.currentPeriodEnd).getTime() + graceMs;
  }

  private isTrialingActive(subscription: Subscription): boolean {
    if (subscription.status !== SubscriptionStatus.TRIALING) return false;
    if (!subscription.trialEndsAt) return true;
    return new Date(subscription.trialEndsAt).getTime() >= Date.now();
  }

  // Checar se a organização tem acesso ativo (com grace period)
  async hasActiveAccess(req: Request): Promise<{ subscription: Subscription; hasAccess: boolean; isWithinGrace: boolean }> {
    const subscription = await this.getSubscriptionStatus(req);

    if (subscription.status === SubscriptionStatus.ACTIVE) {
      return { subscription, hasAccess: true, isWithinGrace: false };
    }
    if (subscription.status === SubscriptionStatus.TRIALING) {
      const ok = this.isTrialingActive(subscription);
      return { subscription, hasAccess: ok, isWithinGrace: false };
    }
    if (subscription.status === SubscriptionStatus.PAST_DUE) {
      const withinGrace = this.isWithinGrace(subscription);
      return { subscription, hasAccess: withinGrace, isWithinGrace: withinGrace };
    }
    if (subscription.status === SubscriptionStatus.CANCELED) {
      if (subscription.currentPeriodEnd && new Date(subscription.currentPeriodEnd).getTime() >= Date.now()) {
        return { subscription, hasAccess: true, isWithinGrace: false };
      }
      return { subscription, hasAccess: false, isWithinGrace: false };
    }
    return { subscription, hasAccess: false, isWithinGrace: false };
  }


  // Esse metodo retorna o status da subscription do usuario
  async getSubscriptionStatus(req: Request) {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    if (!organizationId) {
      throw new NotFoundException('Organization not found');
    }
    // Obter a assinatura da organização (única por organização)
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    return subscription;
  }

  // Criar metodo para pausar a subscription
  async pauseSubscription(req: Request) {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    // Verificar se o usuario tem uma subscription ativa
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    // Pausar a subscription
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.INACTIVE },
    });
    return subscription;
  }

  // Criar metodo para reativar a subscription
  async resumeSubscription(req: Request) {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    // Verificar se o usuario tem uma subscription ativa
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: SubscriptionStatus.INACTIVE,
      },
    });
    if (!subscription) {
      throw new NotFoundException('Organization not found');
    }
    // Reativar a subscription
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.ACTIVE },
    });
    return subscription;
  }

  // Criar metodo para cancelar a subscription
  async cancelSubscription(req: Request) {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    // Verificar se o usuario tem uma subscription ativa
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (!subscription) {
      throw new NotFoundException('Subscription not found');
    }
    // Cancelar a subscription
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.CANCELED },
    });
    return subscription;
  }

  // Criar metodo para atualizar a subscription
  async updateSubscription(req: Request) {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    // Verificar se o usuario tem uma subscription ativa
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: SubscriptionStatus.ACTIVE,
      },
    });
    if (!subscription) {
      throw new NotFoundException('Organization not found');
    }
    // Atualizar a subscription
    await this.prisma.subscription.update({
      where: { id: subscription.id },
      data: { status: SubscriptionStatus.ACTIVE },
    });
    return subscription;
  }

  // Retorna o plano atual do usuário e a assinatura da organização
  async getCurrentPlan(req: Request): Promise<{
    userPlanType: PlanType;
    subscription: Subscription;
  }> {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    const userId = (req as AuthenticatedRequest).user?.id;
    if (!organizationId) {
      throw new NotFoundException('Organization not found');
    }
    if (!userId) {
      throw new NotFoundException('User not found');
    }

    const subscription = await this.prisma.subscription.findUnique({ where: { organizationId } });
    if (!subscription) throw new NotFoundException('Subscription not found');

    // Get planType from the subscription (not from User table)
    const plan = subscription.planType || PlanType.FREE;
    return { userPlanType: plan, subscription };
  }

  // Criar sessão de checkout (Stripe)
  async createCheckoutSession(dto: CreateCheckoutDto, req: Request) {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    const customerEmail = (req as AuthenticatedRequest).user?.email || '';
    if (!organizationId) throw new NotFoundException('Organization not found');
    return this.stripeService.createCheckoutSession(
      organizationId,
      dto.planType,
      customerEmail,
      dto.successUrl,
      dto.cancelUrl,
    );
  }
} 