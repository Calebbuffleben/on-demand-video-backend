import {
  Controller,
  Get,
  Req,
  BadRequestException,
  UseGuards,
  Post,
  Body,
} from '@nestjs/common';
import { Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';
import { OrganizationScoped } from '../common/decorators/organization-scoped.decorator';
import { CreateInviteDto } from './dto/create-invite.dto';

// Extend the Request type to include the user property

// Remover any dos itens do request
interface AuthenticatedRequest extends Request {
  user?: any;
  organization?: any;
  rawOrganizations?: any[];
}

@ApiTags('subscriptions')
@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
  ) {}
  // Criar endpoint /invites
  @Post('invites')
  @UseGuards(AuthGuard)
  @OrganizationScoped()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create an invite' })
  async createInvite(@Body() createInviteDto: CreateInviteDto, @Req() req: AuthenticatedRequest) {
    return this.subscriptionsService.createInvite(createInviteDto, req);
  }
} 