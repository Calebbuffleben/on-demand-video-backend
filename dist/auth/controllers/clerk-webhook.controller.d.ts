import { ConfigService } from '@nestjs/config';
import { ClerkService } from '../services/clerk.service';
export interface WebhookEvent {
    type: string;
    data: any;
    object: string;
    id: string;
}
export declare class ClerkWebhookController {
    private readonly configService;
    private readonly clerkService;
    private readonly logger;
    constructor(configService: ConfigService, clerkService: ClerkService);
    handleWebhook(body: WebhookEvent, headers: Record<string, string>): Promise<{
        success: boolean;
        message: string;
    }>;
}
