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
    const organizationId = (req as any).organization?.id;
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
} 