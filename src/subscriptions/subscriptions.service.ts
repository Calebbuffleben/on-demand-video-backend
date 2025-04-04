import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { StripeService } from './stripe.service';
import { Prisma } from '@prisma/client';
import { ConfigService } from '@nestjs/config';
import Stripe from 'stripe';
import { Subscription } from '@prisma/client';

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
  private stripe: Stripe;

  constructor(
    private prisma: PrismaService,
    private stripeService: StripeService,
    private configService: ConfigService,
  ) {
    const stripeSecretKey = this.configService.get<string>('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('Stripe secret key is missing');
    }
    this.stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2025-03-31.basil',
    });
  }

  async getSubscription(organizationId: string) {
    const subscription = await this.prisma.subscription.findUnique({
      where: { organizationId },
    });

    if (!subscription) {
      throw new NotFoundException(`Subscription for organization ${organizationId} not found`);
    }

    return subscription;
  }

  async createCheckoutSession(
    organizationId: string,
    planType: string,
    customerEmail: string,
    successUrl: string,
    cancelUrl: string,
  ) {
    const organization = await this.prisma.organization.findUnique({
      where: { id: organizationId },
      include: { subscription: true },
    });

    if (!organization) {
      throw new NotFoundException(`Organization with ID ${organizationId} not found`);
    }

    // Create checkout session
    const session = await this.stripeService.createCheckoutSession(
      organizationId,
      planType,
      customerEmail,
      successUrl,
      cancelUrl,
    );

    // If organization doesn't have a subscription yet, create one
    if (!organization.subscription) {
      await this.prisma.subscription.create({
        data: {
          organizationId,
          planType: planType as any, // Type assertion to get around Prisma enum issues
          status: 'INACTIVE' as any, // Type assertion to get around Prisma enum issues
        },
      });
    }

    return session;
  }

  async handleSubscriptionCreated(
    subscriptionId: string,
    customerId: string,
    organizationId: string,
    planType: string,
  ) {
    const stripeSubscription = await this.stripeService.getSubscription(subscriptionId);
    
    // Type assertion for Stripe subscription object
    const subscription = stripeSubscription as any;
    
    // Update subscription in database
    return this.prisma.subscription.update({
      where: { organizationId },
      data: {
        stripeSubscriptionId: subscriptionId,
        stripeCustomerId: customerId,
        status: 'ACTIVE' as any, // Type assertion for Prisma enum
        planType: planType as any, // Type assertion for Prisma enum
        currentPeriodStart: new Date(subscription.current_period_start * 1000),
        currentPeriodEnd: new Date(subscription.current_period_end * 1000),
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
      },
    });
  }

  async handleSubscriptionUpdated(
    subscriptionId: string, 
    status: string,
  ) {
    const dbSubscription = await this.prisma.subscription.findUnique({
      where: { stripeSubscriptionId: subscriptionId },
    });

    if (!dbSubscription) {
      throw new NotFoundException(`Subscription with Stripe ID ${subscriptionId} not found`);
    }

    // Map Stripe status to our enum
    let dbStatus: string;
    switch (status) {
      case 'active':
        dbStatus = 'ACTIVE';
        break;
      case 'past_due':
        dbStatus = 'PAST_DUE';
        break;
      case 'canceled':
        dbStatus = 'CANCELED';
        break;
      case 'trialing':
        dbStatus = 'TRIALING';
        break;
      default:
        dbStatus = 'INACTIVE';
    }

    // Update subscription
    return this.prisma.subscription.update({
      where: { id: dbSubscription.id },
      data: { status: dbStatus as any },
    });
  }

  /**
   * Get the current user's active subscription
   * 
   * @param user The authenticated user object
   * @returns The user's active subscription, or null if no active subscription
   */
  async getCurrentSubscription(user: any): Promise<Subscription | null> {
    // Find the organization's active subscription in the database
    // Note: In our schema, subscriptions are linked to organizations, not directly to users
    
    console.log('Getting subscription for user:', JSON.stringify(user, null, 2));
    
    if (!user || !user.organization) {
      console.log('No organization data found for user');
      return null; // User has no associated organization
    }
    
    // Handle different possible organization data structures
    let organizationId: string;
    
    if (typeof user.organization === 'string') {
      // If organization is directly the ID string
      organizationId = user.organization;
    } else if (user.organization.id) {
      // If organization is an object with an id property
      organizationId = user.organization.id;
    } else if (Array.isArray(user.organization) && user.organization.length > 0) {
      // If organization is an array (user might belong to multiple orgs)
      // For simplicity, we'll use the first one
      const firstOrg = user.organization[0];
      organizationId = typeof firstOrg === 'string' ? firstOrg : firstOrg.id;
    } else {
      console.log('Could not determine organization ID from data:', user.organization);
      return null;
    }
    
    console.log('Querying subscription for organization ID:', organizationId);
    
    const subscription = await this.prisma.subscription.findFirst({
      where: {
        organizationId,
        status: 'ACTIVE',
      },
    });

    return subscription;
  }
} 