import { Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClerkClient } from '@clerk/backend';

/**
 * Provider for Clerk Client
 * 
 * This factory:
 * - Creates a Clerk client instance using the secret key from environment
 * - Makes the client available throughout the application
 * - Enables dependency injection for the client
 */
export const ClerkClientProvider: Provider = {
  provide: 'ClerkClient',
  useFactory: (configService: ConfigService) => {
    return createClerkClient({
      secretKey: configService.get<string>('CLERK_SECRET_KEY'),
    });
  },
  inject: [ConfigService],
}; 