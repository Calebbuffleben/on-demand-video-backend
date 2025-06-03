import { Injectable, Inject, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClerkClient } from '@clerk/backend';
import { Role } from '@prisma/client';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ClerkService {
  private readonly logger = new Logger(ClerkService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject('ClerkClient') private readonly clerkClient: ClerkClient,
    private readonly configService: ConfigService,
  ) {}

  /**
   * Sync a user from Clerk to the local database
   * 
   * @param userData User data from Clerk webhook
   * @returns The synced User entity
   */
  async syncUser(userData: any) {
    const clerkId = userData.id;
    
    if (!clerkId) {
      this.logger.error('User ID missing from webhook data');
      throw new Error('Invalid user data');
    }

    // Get email from Clerk data
    const emailObj = userData.email_addresses?.[0];
    const email = emailObj?.email_address;

    if (!email) {
      this.logger.error('No primary email found for user');
      throw new Error('Email required for user sync');
    }

    try {
      // Check if user already exists
      const existingUser = await this.prisma.user.findUnique({
        where: { clerkId },
      });

      if (existingUser) {
        // Update existing user
        this.logger.log(`Updating existing user with clerkId: ${clerkId}`);
        return this.prisma.user.update({
          where: { clerkId },
          data: { email },
        });
      } else {
        // Create new user
        this.logger.log(`Creating new user with clerkId: ${clerkId}`);
        return this.prisma.user.create({
          data: { clerkId, email },
        });
      }
    } catch (error) {
      this.logger.error(`Error syncing user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle user deletion events from Clerk
   * 
   * @param userData User data from Clerk webhook
   */
  async handleUserDeleted(userData: any) {
    const clerkId = userData.id;
    
    if (!clerkId) {
      this.logger.error('User ID missing from webhook data');
      throw new Error('Invalid user data');
    }

    try {
      // Find the user in our database
      const user = await this.prisma.user.findUnique({
        where: { clerkId },
      });

      if (!user) {
        this.logger.warn(`User with clerkId ${clerkId} not found for deletion`);
        return;
      }

      // Delete the user
      this.logger.log(`Deleting user with clerkId: ${clerkId}`);
      await this.prisma.user.delete({
        where: { clerkId },
      });
    } catch (error) {
      this.logger.error(`Error deleting user: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Sync an organization from Clerk to the local database
   * 
   * @param orgData Organization data from Clerk webhook
   * @returns The synced Organization entity
   */
  async syncOrganization(orgData: any) {
    const clerkId = orgData.id;
    const name = orgData.name;
    
    if (!clerkId || !name) {
      this.logger.error('Organization ID or name missing from webhook data');
      throw new Error('Invalid organization data');
    }

    try {
      // Check if organization already exists
      const existingOrg = await this.prisma.organization.findUnique({
        where: { clerkId },
      });

      if (existingOrg) {
        // Update existing organization
        this.logger.log(`Updating existing organization with clerkId: ${clerkId}`);
        return this.prisma.organization.update({
          where: { clerkId },
          data: { name },
        });
      } else {
        // Get Mux credentials from environment
        const muxTokenId = this.configService.get<string>('MUX_TOKEN_ID');
        const muxTokenSecret = this.configService.get<string>('MUX_TOKEN_SECRET');

        this.logger.log(`Mux credentials found - Token ID: ${muxTokenId ? 'Yes' : 'No'}, Token Secret: ${muxTokenSecret ? 'Yes' : 'No'}`);

        if (!muxTokenId || !muxTokenSecret) {
          this.logger.warn('Global MUX credentials not configured, organization will be created without Mux credentials');
        }

        // Create new organization with Mux credentials
        this.logger.log(`Creating new organization with clerkId: ${clerkId} and name: ${name}`);
        const newOrg = await this.prisma.organization.create({
          data: { 
            clerkId, 
            name,
            muxTokenId,
            muxTokenSecret,
          },
        });

        this.logger.log(`Organization created successfully with ID: ${newOrg.id}`);
        this.logger.log(`Mux credentials set - Token ID: ${newOrg.muxTokenId ? 'Yes' : 'No'}, Token Secret: ${newOrg.muxTokenSecret ? 'Yes' : 'No'}`);

        return newOrg;
      }
    } catch (error) {
      this.logger.error(`Error syncing organization: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle organization deletion events from Clerk
   * 
   * @param orgData Organization data from Clerk webhook
   */
  async handleOrganizationDeleted(orgData: any) {
    const clerkId = orgData.id;
    
    if (!clerkId) {
      this.logger.error('Organization ID missing from webhook data');
      throw new Error('Invalid organization data');
    }

    try {
      // Find the organization in our database
      const organization = await this.prisma.organization.findUnique({
        where: { clerkId },
      });

      if (!organization) {
        this.logger.warn(`Organization with clerkId ${clerkId} not found for deletion`);
        return;
      }

      // Delete the organization
      this.logger.log(`Deleting organization with clerkId: ${clerkId}`);
      await this.prisma.organization.delete({
        where: { clerkId },
      });
    } catch (error) {
      this.logger.error(`Error deleting organization: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Sync organization membership from Clerk to the local database
   * 
   * @param membershipData Membership data from Clerk webhook
   * @returns The synced UserOrganization entity
   */
  async syncOrganizationMembership(membershipData: any) {
    const orgId = membershipData.organization.id;
    const userId = membershipData.public_user_data?.user_id;
    const role = this.mapClerkRoleToDbRole(membershipData.role);
    
    if (!orgId || !userId) {
      this.logger.error('Organization ID or User ID missing from webhook data');
      throw new Error('Invalid organization membership data');
    }

    try {
      // Find organization
      const organization = await this.prisma.organization.findUnique({
        where: { clerkId: orgId },
      });

      if (!organization) {
        this.logger.warn(`Organization with clerkId ${orgId} not found for membership sync`);
        // Try to fetch and create organization
        try {
          const clerkOrg = await this.clerkClient.organizations.getOrganization({
            organizationId: orgId,
          });
          await this.syncOrganization(clerkOrg);
        } catch (error) {
          this.logger.error(`Failed to fetch organization details: ${error.message}`);
          throw new Error('Organization not found');
        }
      }

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!user) {
        this.logger.warn(`User with clerkId ${userId} not found for membership sync`);
        // Try to fetch and create user
        try {
          const clerkUser = await this.clerkClient.users.getUser(userId);
          await this.syncUser(clerkUser);
        } catch (error) {
          this.logger.error(`Failed to fetch user details: ${error.message}`);
          throw new Error('User not found');
        }
      }

      // Refetch after potential creation
      const updatedOrg = await this.prisma.organization.findUnique({
        where: { clerkId: orgId },
      });
      
      const updatedUser = await this.prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!updatedOrg || !updatedUser) {
        throw new Error('Failed to create required organization or user');
      }

      // Check if membership already exists
      const existingMembership = await this.prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: updatedUser.id,
            organizationId: updatedOrg.id,
          },
        },
      });

      if (existingMembership) {
        // Update existing membership
        this.logger.log(`Updating membership for user ${updatedUser.id} in organization ${updatedOrg.id}`);
        return this.prisma.userOrganization.update({
          where: {
            userId_organizationId: {
              userId: updatedUser.id,
              organizationId: updatedOrg.id,
            },
          },
          data: { role },
        });
      } else {
        // Create new membership
        this.logger.log(`Creating membership for user ${updatedUser.id} in organization ${updatedOrg.id}`);
        return this.prisma.userOrganization.create({
          data: {
            role,
            user: { connect: { id: updatedUser.id } },
            organization: { connect: { id: updatedOrg.id } },
          },
        });
      }
    } catch (error) {
      this.logger.error(`Error syncing organization membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Handle organization membership deletion events from Clerk
   * 
   * @param membershipData Membership data from Clerk webhook
   */
  async handleOrganizationMembershipDeleted(membershipData: any) {
    const orgId = membershipData.organization.id;
    const userId = membershipData.public_user_data?.user_id;
    
    if (!orgId || !userId) {
      this.logger.error('Organization ID or User ID missing from webhook data');
      throw new Error('Invalid organization membership data');
    }

    try {
      // Find organization
      const organization = await this.prisma.organization.findUnique({
        where: { clerkId: orgId },
      });

      // Find user
      const user = await this.prisma.user.findUnique({
        where: { clerkId: userId },
      });

      if (!organization || !user) {
        this.logger.warn(`Organization or user not found for membership deletion`);
        return;
      }

      // Delete membership
      this.logger.log(`Deleting membership for user ${user.id} in organization ${organization.id}`);
      await this.prisma.userOrganization.delete({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: organization.id,
          },
        },
      });
    } catch (error) {
      this.logger.error(`Error deleting organization membership: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Map Clerk role string to database Role enum
   * 
   * @param clerkRole Role string from Clerk
   * @returns Database Role enum value
   */
  private mapClerkRoleToDbRole(clerkRole: string): Role {
    switch (clerkRole?.toLowerCase()) {
      case 'admin':
        return Role.ADMIN;
      case 'owner':
        return Role.OWNER;
      default:
        return Role.MEMBER;
    }
  }
} 