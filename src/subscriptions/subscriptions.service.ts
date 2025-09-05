import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription } from '@prisma/client';
import { CreateInviteDto } from './dto/create-invite.dto';
import { Request } from 'express';
import { PrismaClient } from '@prisma/client';
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

// Define the enums separately since the generated Prisma types might not be available
enum PlanType {
  FREE = 'FREE',
  BASIC = 'BASIC',
  PRO = 'PRO',
  ENTERPRISE = 'ENTERPRISE'
}

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

    return (this.prisma as PrismaWithInvite).invite.create({
      data: {
        ...createInviteDto,
        organizationId,
        role: 'MEMBER', // Default role for invites
        token: this.generateInviteToken(),
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
      },
    });
  }

  private generateInviteToken(): string {
    return Math.random().toString(36).substring(2) + Date.now().toString(36);
  }

  // Esse metodo retorna o status da subscription do usuario
  async getSubscriptionStatus(req: Request) {
    const organizationId = (req as AuthenticatedRequest).organization?.id;
    if (!organizationId) {
      throw new NotFoundException('Organization not found');
    }
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
} 