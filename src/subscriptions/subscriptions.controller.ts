import {
  Controller,
  Post,
  Body,
  Get,
  Param,
  Req,
  Headers,
  HttpCode,
  Res,
  BadRequestException,
  UseGuards,
  NotFoundException,
} from '@nestjs/common';
import { Response, Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import getRawBody from 'raw-body';
import { AuthGuard } from '../auth/guards/auth.guard';
import { PrismaService } from '../prisma/prisma.service';

// Extend the Request type to include the user property
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
    private readonly stripeService: StripeService,
    private readonly prismaService: PrismaService,
  ) {}

  @Post('create-checkout')
  @ApiOperation({ summary: 'Create a Stripe checkout session' })
  @ApiResponse({ status: 200, description: 'Return the checkout session information.' })
  async createCheckout(@Body() createCheckoutDto: CreateCheckoutDto, @Req() req: Request) {
    const { planType, successUrl, cancelUrl } = createCheckoutDto;
    const organizationId = req['organization'].id;
    const userEmail = req['user'].email;

    const session = await this.subscriptionsService.createCheckoutSession(
      organizationId,
      planType,
      userEmail,
      successUrl,
      cancelUrl,
    );

    return { url: session.url };
  }

  @Get(':organizationId')
  @ApiOperation({ summary: 'Get subscription details for an organization' })
  @ApiResponse({ status: 200, description: 'Return the subscription details.' })
  @ApiResponse({ status: 404, description: 'Subscription not found.' })
  async getSubscription(@Param('organizationId') organizationId: string, @Req() req: AuthenticatedRequest) {
    console.log('GET subscription for organization ID:', organizationId);
    console.log('Request user data:', JSON.stringify(req.user, null, 2));
    console.log('Request organization data:', JSON.stringify(req.organization, null, 2));
    console.log('Request raw organizations:', JSON.stringify(req.rawOrganizations, null, 2));
    
    // Extract user data
    const userData = req.user;
    
    if (!userData) {
      throw new BadRequestException('User information not found');
    }
    
    // Check if user has access to the requested organization
    let hasAccess = false;
    
    // First check current organization
    if (req.organization && req.organization.id === organizationId) {
      hasAccess = true;
    } 
    // Then check raw organizations from token
    else if (req.rawOrganizations) {
      const orgExists = req.rawOrganizations.some(org => {
        // Handle different potential formats
        if (typeof org === 'string') {
          return org === organizationId;
        } else if (org.id) {
          return org.id === organizationId;
        }
        return false;
      });
      
      if (orgExists) {
        hasAccess = true;
      }
    }
    // Finally check database for membership
    else {
      const userOrg = await this.prismaService.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: userData.id,
            organizationId,
          },
        },
      });
      
      if (userOrg) {
        hasAccess = true;
      }
    }
    
    if (!hasAccess) {
      throw new BadRequestException('You do not have access to this organization');
    }

    try {
      const subscription = await this.subscriptionsService.getSubscription(organizationId);
      
      return {
        status: 'SUCCESS',
        subscription,
        organizationId
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        return {
          status: 'NO_SUBSCRIPTION',
          message: 'No active subscription found for this organization',
          organizationId
        };
      }
      throw error;
    }
  }

  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Handle Stripe webhooks' })
  @ApiResponse({ status: 200, description: 'Successfully processed webhook event.' })
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
    @Res() res: Response,
  ) {
    if (!signature) {
      throw new BadRequestException('Missing stripe-signature header');
    }

    // Get raw body of the request
    const payload = await getRawBody(req);

    // Verify the event
    const event = await this.stripeService.handleWebhook(signature, payload);

    // Handle different event types
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object;
        const organizationId = session.client_reference_id;
        const customerId = session.customer;
        const subscriptionId = session.subscription;
        
        // Check metadata
        if (!session.metadata || !session.metadata.planType) {
          throw new BadRequestException('Missing plan type in metadata');
        }
        
        const planType = session.metadata.planType;

        if (typeof organizationId !== 'string' || 
            typeof customerId !== 'string' || 
            typeof subscriptionId !== 'string') {
          throw new BadRequestException('Invalid checkout session data');
        }

        await this.subscriptionsService.handleSubscriptionCreated(
          subscriptionId,
          customerId,
          organizationId,
          planType,
        );
        break;
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.deleted': {
        const subscription = event.data.object;
        if (typeof subscription.id !== 'string' || typeof subscription.status !== 'string') {
          throw new BadRequestException('Invalid subscription data');
        }
        
        await this.subscriptionsService.handleSubscriptionUpdated(
          subscription.id,
          subscription.status,
        );
        break;
      }
    }

    return res.json({ received: true });
  }

  /**
   * Get the current user's subscription
   * 
   * This endpoint:
   * - Requires authentication
   * - Retrieves the current user's subscription plan
   * 
   * @param req The request object containing the authenticated user
   * @returns The user's current subscription details
   */
  @Get('current')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get the current user\'s subscription' })
  async getCurrentSubscription(@Req() req: AuthenticatedRequest) {
    // Extract the user information from the request
    const userData = req.user;
    
    if (!userData) {
      throw new BadRequestException('User information not found');
    }
    
    console.log('User data in request:', JSON.stringify(userData, null, 2));
    
    // Get organization information from the request
    const organizationData = req.organization;
    console.log('Organization data from request:', JSON.stringify(organizationData, null, 2));
    
    if (!organizationData) {
      // Check if we have organizations available
      if (req.rawOrganizations && req.rawOrganizations.length > 0) {
        return { 
          status: 'ORGANIZATION_SELECTION_REQUIRED', 
          message: 'Please select an organization to view subscription details.',
          availableOrganizations: req.rawOrganizations 
        };
      }
      
      // No organizations available
      return { 
        status: 'NO_ORGANIZATION', 
        message: 'No organization found for the current user. Please create or join an organization first.' 
      };
    }
    
    // Prepare user object for service call
    const user = {
      id: userData.id,
      email: userData.email,
      organization: organizationData
    };
    
    console.log('User data for subscription:', JSON.stringify(user, null, 2));

    // Get the current subscription using the SubscriptionsService
    const subscription = await this.subscriptionsService.getCurrentSubscription(user);
    
    if (!subscription) {
      return { 
        status: 'NO_SUBSCRIPTION', 
        message: 'No active subscription found for this organization',
        organizationId: organizationData.id,
        organizationName: organizationData.name
      };
    }

    return {
      status: 'SUCCESS',
      subscription,
      organization: {
        id: organizationData.id,
        name: organizationData.name
      }
    };
  }

  /**
   * Get organizations associated with the current user
   * 
   * This endpoint:
   * - Requires authentication
   * - Lists all organizations the user belongs to
   * 
   * @param req The authenticated request object
   * @returns List of organizations or error
   */
  @Get('organizations')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get organizations for the current user' })
  @ApiResponse({ status: 200, description: 'Return the list of organizations.' })
  async getUserOrganizations(@Req() req: AuthenticatedRequest) {
    // Check if user exists
    const userData = req.user;
    if (!userData) {
      throw new BadRequestException('User information not found');
    }
    
    console.log('Looking up organizations for user ID:', userData.id);
    
    // Check if organizations were attached directly (from rawOrganizations)
    if (req.rawOrganizations) {
      console.log('Using raw organizations from token:', req.rawOrganizations);
      return {
        status: 'SUCCESS',
        organizations: req.rawOrganizations
      };
    }
    
    // Lookup organizations in the database
    const userOrganizations = await this.prismaService.userOrganization.findMany({
      where: {
        userId: userData.id
      },
      include: {
        organization: true
      }
    });
    
    console.log('Found organizations in database:', JSON.stringify(userOrganizations, null, 2));
    
    if (!userOrganizations || userOrganizations.length === 0) {
      return {
        status: 'NO_ORGANIZATIONS',
        message: 'User does not belong to any organizations'
      };
    }
    
    // Transform the data for the response
    const organizations = userOrganizations.map(uo => ({
      id: uo.organization.id,
      name: uo.organization.name,
      role: uo.role
    }));
    
    return {
      status: 'SUCCESS',
      organizations
    };
  }
} 