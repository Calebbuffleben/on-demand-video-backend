import { ClerkClient } from '@clerk/backend';
import { ConfigService } from '@nestjs/config';
export declare const ClerkClientProvider: {
    provide: string;
    useFactory: (configService: ConfigService) => ClerkClient;
    inject: (typeof ConfigService)[];
};
