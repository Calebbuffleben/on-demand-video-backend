import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Organization } from '@prisma/client';
import { ClerkVerificationResponse } from './interfaces/clerk-verification.interface';
import { ConfigService } from '@nestjs/config';
import { verifyToken, ClerkClient } from '@clerk/backend';

@Injectable()
export class AuthService {
  constructor(
    // Prisma service for database operations
    private prisma: PrismaService,
    // Configuration service to access environment variables
    private configService: ConfigService,
    // Clerk client for authentication and user management
    @Inject('ClerkClient') private clerkClient: ClerkClient,
  ) {}

  /**
   * Verifies the authentication token using Clerk
   * 
   * This method:
   * - Validates the token with Clerk's verification service
   * - Retrieves user details
   * - Extracts organization information if available
   * 
   * @param token Authentication token to verify
   * @returns Verified user and organization information or null
   */
  async verifyToken(token: string): Promise<ClerkVerificationResponse | null> {
    try {
      console.log('🔍 Starting token verification...');
      console.log('🔑 Token length:', token.length);
      console.log('🔑 Token preview:', token.substring(0, 20) + '...');
      
      // Verify token with Clerk API
      const tokenPayload = await verifyToken(token, {
        secretKey: this.configService.get('CLERK_SECRET_KEY'),
      });

      console.log('✅ Token verification successful');
      console.log('📋 Token payload keys:', Object.keys(tokenPayload || {}));

      if (!tokenPayload || !tokenPayload.sub) {
        console.error('❌ Token payload is invalid or missing sub field');
        return null;
      }

      console.log('Token payload from Clerk:', JSON.stringify(tokenPayload, null, 2));

      // Get user details from Clerk
      const clerkUser = await this.clerkClient.users.getUser(tokenPayload.sub);

      if (!clerkUser) {
        console.error('❌ Could not fetch user from Clerk');
        return null;
      }

      console.log('✅ User fetched from Clerk successfully');
      console.log('Clerk user details:', JSON.stringify({
        id: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
      }, null, 2));

      // Extract organization info from token claims
      // These fields now come directly from the token with the new structure
      let organizationId: string | undefined = tokenPayload.organizationId as string | undefined;
      let organizationName: string | undefined = tokenPayload.organizationName as string | undefined;
      let organizationRole: string | undefined = tokenPayload.organizationRole as string | undefined;
      let role: string | undefined;
      let organizations: any[] | undefined;

      // For backward compatibility, use org_id if organizationId is not present
      if (!organizationId && tokenPayload.org_id) {
        organizationId = tokenPayload.org_id;
        
        try {
          // Fetch organization details from Clerk if not in token
          if (!organizationName) {
            const org = await this.clerkClient.organizations.getOrganization({
              organizationId: tokenPayload.org_id,
            });
            organizationName = org.name;
          }
          
          // Get user's role if not provided
          if (!organizationRole) {
            const membershipsResponse = await this.clerkClient.organizations.getOrganizationMembershipList({
              organizationId: tokenPayload.org_id,
            });
            
            const userMembership = membershipsResponse.data.find(
              membership => membership.publicUserData?.userId === tokenPayload.sub
            );
            organizationRole = userMembership?.role;
          }
        } catch (error) {
          console.error('Error fetching organization details:', error);
        }
      }
      
      // Assign role from organizationRole for backward compatibility
      role = organizationRole || role;

      // Extract organizations array if available in token
      if (tokenPayload.organization) {
        console.log('Organizations found in token payload:', tokenPayload.organization);
        organizations = Array.isArray(tokenPayload.organization) 
          ? tokenPayload.organization 
          : [tokenPayload.organization];
      } else if (tokenPayload.organizations) {
        // Check old field name for backward compatibility
        console.log('Organizations found in token payload (old field name):', tokenPayload.organizations);
        organizations = Array.isArray(tokenPayload.organizations) 
          ? tokenPayload.organizations 
          : [tokenPayload.organizations];
      }

      // Return verified user and organization information
      return {
        userId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        organizationId,
        organizationName,
        organizationRole,
        role,          // Keep for backward compatibility
        organizations,
      };
    } catch (error) {
      console.error('❌ Error verifying token:', error);
      console.error('❌ Error details:', {
        name: error.name,
        message: error.message,
        stack: error.stack
      });
      
      // Check if it's a specific Clerk error
      if (error.message?.includes('jwt')) {
        console.error('❌ JWT verification failed - token might be invalid or expired');
      }
      if (error.message?.includes('secret')) {
        console.error('❌ Secret key issue - check CLERK_SECRET_KEY environment variable');
      }
      
      return null;
    }
  }

  /**
   * Retrieves an existing user or creates a new one in the database
   * 
   * This method:
   * - Checks if a user exists by Clerk ID
   * - Creates a new user if not found
   * 
   * @param clerkId Unique identifier from Clerk
   * @param email User's email address
   * @returns User entity from the database
   */
  async getOrCreateUser(clerkId: string, email: string): Promise<User> {
    // Find user by Clerk ID
    let user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

    // Create user if not exists
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          clerkId,
          email,
        },
      });
    }

    return user;
  }

  /**
   * Retrieves an existing organization or creates a new one
   * 
   * This method:
   * - Checks if an organization exists by Clerk ID
   * - Creates a new organization if not found
   * - Adds user to the organization with specified role
   * 
   * @param clerkOrgId Unique organization identifier from Clerk
   * @param name Organization name
   * @param userId User's database ID
   * @param role User's role in the organization
   * @returns Organization entity from the database
   */
  async getOrCreateOrganization(
    clerkOrgId: string,
    name: string,
    userId: string,
    role: string,
  ): Promise<Organization> {
    // Find organization by Clerk ID
    let organization = await this.prisma.organization.findUnique({
      where: { clerkId: clerkOrgId },
    });

    // Create organization if not exists
    if (!organization) {
      organization = await this.prisma.organization.create({
        data: {
          name,
          clerkId: clerkOrgId,
          users: {
            create: {
              role: role === 'admin' ? 'ADMIN' : role === 'owner' ? 'OWNER' : 'MEMBER',
              user: {
                connect: { id: userId },
              },
            },
          },
        },
      });
    } else {
      // Check if user is already part of organization
      const userOrg = await this.prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId,
            organizationId: organization.id,
          },
        },
      });

      // Add user to organization if not already a member
      if (!userOrg) {
        await this.prisma.userOrganization.create({
          data: {
            role: role === 'admin' ? 'ADMIN' : role === 'owner' ? 'OWNER' : 'MEMBER',
            user: {
              connect: { id: userId },
            },
            organization: {
              connect: { id: organization.id },
            },
          },
        });
      }
    }

    return organization;
  }

  /**
   * Gets all organizations that a user is a member of
   * 
   * @param userId The user's ID in the database
   * @returns Array of user-organization relationships with organization details
   */
  async getUserOrganizations(userId: string) {
    return this.prisma.userOrganization.findMany({
      where: { userId },
      include: {
        organization: true
      }
    });
  }
} 