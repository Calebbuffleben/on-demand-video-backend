import {
  Controller,
  Get,
  Req,
  BadRequestException,
  UseGuards,
  Post,
  Body,
  NotFoundException,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { OrganizationScoped } from '../common/decorators/organization-scoped.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';

// Properly typed authenticated request interface
interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
    clerkId: string | null;
    password: string | null;
    emailVerified: boolean;
    lastLogin: Date | null;
    createdAt: Date;
    updatedAt: Date;
  };
  organization?: {
    id: string;
    name: string;
    clerkId: string | null;
    slug: string | null;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
    muxTokenId: string | null;
    muxTokenSecret: string | null;
  };
  userRole?: 'OWNER' | 'ADMIN' | 'MEMBER';
}

@ApiTags('subscriptions')
@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}

  @Post('invites')
  @UseGuards(AuthGuard)
  @OrganizationScoped()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an invite' })
  async createInvite(@Body() createInviteDto: CreateInviteDto, @Req() req: AuthenticatedRequest) {
    try {
      return this.subscriptionsService.createInvite(createInviteDto, req);
    } catch (error) {
      throw new NotFoundException('Invite not found');
    }
  }

  @Post('pause')
  @UseGuards(AuthGuard)
  @OrganizationScoped()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Pause subscription' })
  async pauseSubscription(@Req() req: AuthenticatedRequest) {
    try {
      return this.subscriptionsService.pauseSubscription(req);
    } catch (error) {
      throw new NotFoundException('Subscription not found');
    }
  }

  @Post('resume')
  @UseGuards(AuthGuard)
  @OrganizationScoped()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Resume subscription' })
  async resumeSubscription(@Req() req: AuthenticatedRequest) {
    try {
      return this.subscriptionsService.resumeSubscription(req);
    } catch (error) {
      throw new NotFoundException('Subscription not found');
    }
  }

  @Post('cancel')
  @UseGuards(AuthGuard)
  @OrganizationScoped()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel subscription' })
  async cancelSubscription(@Req() req: AuthenticatedRequest) {
    try {
      return this.subscriptionsService.cancelSubscription(req);
    } catch (error) {
      throw new NotFoundException('Subscription not found');
    }
  }

  @Get('status')
  @UseGuards(AuthGuard)
  @OrganizationScoped()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get subscription status per account' })
  async getSubscriptionStatus(@Req() req: AuthenticatedRequest) {
    try {
    return this.subscriptionsService.getSubscriptionStatus(req);
    } catch (error) {
      throw new NotFoundException('Subscription not found');
    }
  }
} 