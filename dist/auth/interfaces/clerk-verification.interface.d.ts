export interface ClerkVerificationResponse {
    userId: string;
    email: string;
    organizationId?: string;
    organizationName?: string;
    role?: string;
    organizations?: any[];
}
