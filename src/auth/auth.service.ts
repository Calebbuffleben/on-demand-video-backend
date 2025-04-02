import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Organization } from '@prisma/client';
import { ClerkVerificationResponse } from './interfaces/clerk-verification.interface';
import { ConfigService } from '@nestjs/config';
import { verifyToken, ClerkClient } from '@clerk/backend';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    @Inject('ClerkClient') private clerkClient: ClerkClient,
  ) {}

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
          const org = await this.clerkClient.organizations.getOrganization({
            organizationId: tokenPayload.org_id,
          });
          organizationName = org.name;
          
          // Get the user's role in the organization
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

  async getOrCreateUser(clerkId: string, email: string): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { clerkId },
    });

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

  async getOrCreateOrganization(
    clerkOrgId: string,
    name: string,
    userId: string,
    role: string,
  ): Promise<Organization> {
    let organization = await this.prisma.organization.findUnique({
      where: { clerkId: clerkOrgId },
    });

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