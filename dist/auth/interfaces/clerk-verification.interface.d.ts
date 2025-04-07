export interface ClerkVerificationResponse {
    userId: string;
    email: string;
    organizationId?: string;
    organizationName?: string;
    organizationRole?: string;
    role?: string;
    organizations?: any[];
}
