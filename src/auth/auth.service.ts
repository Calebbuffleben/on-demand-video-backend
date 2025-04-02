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
      // Verify token with Clerk API
      const tokenPayload = await verifyToken(token, {
        secretKey: this.configService.get('CLERK_SECRET_KEY'),
      });

      if (!tokenPayload || !tokenPayload.sub) {
        return null;
      }

      // Get user details from Clerk
      const clerkUser = await this.clerkClient.users.getUser(tokenPayload.sub);

      if (!clerkUser) {
        return null;
      }

      // Extract organization info if available
      let organizationId: string | undefined;
      let organizationName: string | undefined;
      let role: string | undefined;

      if (tokenPayload.org_id) {
        organizationId = tokenPayload.org_id;
        
        try {
          // Fetch organization details from Clerk
          const org = await this.clerkClient.organizations.getOrganization({
            organizationId: tokenPayload.org_id,
          });
          organizationName = org.name;
          
          // Retrieve user's role in the organization
          const membershipsResponse = await this.clerkClient.organizations.getOrganizationMembershipList({
            organizationId: tokenPayload.org_id,
          });
          
          const userMembership = membershipsResponse.data.find(
            membership => membership.publicUserData?.userId === tokenPayload.sub
          );
          role = userMembership?.role;
        } catch (error) {
          console.error('Error fetching organization details:', error);
        }
      }

      // Return verified user and organization information
      return {
        userId: clerkUser.id,
        email: clerkUser.emailAddresses[0]?.emailAddress || '',
        organizationId,
        organizationName,
        role,
      };
    } catch (error) {
      console.error('Error verifying token:', error);
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
} 