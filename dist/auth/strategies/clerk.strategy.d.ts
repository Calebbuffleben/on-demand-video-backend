import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
declare const ClerkStrategy_base: new () => Strategy & {
    validate(...args: any[]): unknown;
};
export declare class ClerkStrategy extends ClerkStrategy_base {
    private readonly configService;
    private clerkClient;
    constructor(configService: ConfigService);
    validate(request: Request): Promise<any>;
}
export {};
