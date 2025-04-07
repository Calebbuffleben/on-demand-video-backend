import { Controller, Post, Body, Headers, UnauthorizedException, BadRequestException, Logger } from '@nestjs/common';
import { Public } from '../decorators/public.decorator';
import { ConfigService } from '@nestjs/config';
import { ClerkService } from '../services/clerk.service';
// Define the interface directly to avoid import issues
export interface WebhookEvent {
  type: string;
  data: any;
  object: string;
  id: string;
}
import { Webhook, WebhookRequiredHeaders } from 'svix';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('webhooks')
@Controller('webhooks')
export class ClerkWebhookController {
  private readonly logger = new Logger(ClerkWebhookController.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly clerkService: ClerkService,
  ) {}

  /**
   * Webhook endpoint for Clerk events
   * 
   * This endpoint:
   * - Verifies the webhook signature
   * - Processes different Clerk event types
   * - Syncs data to local database
   * 
   * @param body The webhook event payload
   * @param headers The request headers with webhook signature
   * @returns Confirmation of event processing
   */
  @Public()
  @Post('clerk')
  @ApiOperation({ summary: 'Process Clerk webhook events' })
  @ApiBody({ description: 'Clerk webhook event payload' })
  async handleWebhook(
    @Body() body: WebhookEvent,
    @Headers() headers: Record<string, string>,
  ) {
    this.logger.log(`Received Clerk webhook: ${body.type}`);

    try {
      // Verify webhook signature
      const webhookSecret = this.configService.get<string>('CLERK_WEBHOOK_SECRET');
      
      if (!webhookSecret) {
        throw new BadRequestException('Webhook secret not configured');
      }

      // Extract svix headers
      const svixHeaders = {
        'svix-id': headers['svix-id'],
        'svix-timestamp': headers['svix-timestamp'],
        'svix-signature': headers['svix-signature'],
      } as WebhookRequiredHeaders;

      // Validate headers
      if (!svixHeaders['svix-id'] || !svixHeaders['svix-timestamp'] || !svixHeaders['svix-signature']) {
        throw new UnauthorizedException('Missing svix headers');
      }

      // Create Webhook instance and verify
      const wh = new Webhook(webhookSecret);
      let event: WebhookEvent;
      
      try {
        event = wh.verify(JSON.stringify(body), svixHeaders) as WebhookEvent;
      } catch (error) {
        this.logger.error(`Webhook verification failed: ${error.message}`);
        throw new UnauthorizedException('Invalid webhook signature');
      }

      // Process different event types
      switch (event.type) {
        case 'user.created':
          await this.clerkService.syncUser(event.data);
          break;
        
        case 'user.updated':
          await this.clerkService.syncUser(event.data);
          break;
        
        case 'user.deleted':
          await this.clerkService.handleUserDeleted(event.data);
          break;
        
        case 'organization.created':
          await this.clerkService.syncOrganization(event.data);
          break;
        
        case 'organization.updated':
          await this.clerkService.syncOrganization(event.data);
          break;
        
        case 'organization.deleted':
          await this.clerkService.handleOrganizationDeleted(event.data);
          break;
        
        case 'organizationMembership.created':
          await this.clerkService.syncOrganizationMembership(event.data);
          break;
        
        case 'organizationMembership.updated':
          await this.clerkService.syncOrganizationMembership(event.data);
          break;
        
        case 'organizationMembership.deleted':
          await this.clerkService.handleOrganizationMembershipDeleted(event.data);
          break;
        
        default:
          this.logger.warn(`Unhandled webhook event type: ${event.type}`);
      }

      return { success: true, message: `Processed event: ${event.type}` };
    } catch (error) {
      this.logger.error(`Webhook processing error: ${error.message}`, error.stack);
      throw error;
    }
  }
} 