import { SetMetadata } from '@nestjs/common';

export const ORGANIZATION_SCOPED_KEY = 'organizationScoped';

/**
 * Decorator to mark endpoints that require organization context.
 * This ensures that the endpoint can only be accessed by authenticated users
 * with proper organization context, and automatically scopes all data access
 * to the user's organization.
 */
export const OrganizationScoped = () => SetMetadata(ORGANIZATION_SCOPED_KEY, true); 