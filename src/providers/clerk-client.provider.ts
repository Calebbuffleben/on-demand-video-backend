import { ClerkClient, createClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';

export const ClerkClientProvider = {
  provide: 'ClerkClient',
  useFactory: (configService: ConfigService) => {
    const secretKey = configService.get<string>('CLERK_SECRET_KEY');
    
    if (!secretKey) {
      throw new Error('CLERK_SECRET_KEY is not defined in environment variables');
    }
    
    return createClerkClient({
      secretKey,
    });
  },
  inject: [ConfigService],
}; 