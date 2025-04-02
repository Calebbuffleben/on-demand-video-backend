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
} from '@nestjs/common';
import { Response, Request } from 'express';
import { SubscriptionsService } from './subscriptions.service';
import { StripeService } from './stripe.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { Public } from '../auth/decorators/public.decorator';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import getRawBody from 'raw-body';

@ApiTags('subscriptions')
@Controller('api/subscriptions')
export class SubscriptionsController {
  constructor(
    private readonly subscriptionsService: SubscriptionsService,
    private readonly stripeService: StripeService,
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
  async getSubscription(@Param('organizationId') organizationId: string, @Req() req: Request) {
    // Check if user has access to this organization
    const userOrganization = req['organization'];
    if (userOrganization.id !== organizationId) {
      throw new BadRequestException('You do not have access to this organization');
    }

    return this.subscriptionsService.getSubscription(organizationId);
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
} 