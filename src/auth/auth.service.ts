import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Organization } from '@prisma/client';
import { ClerkVerificationResponse } from './interfaces/clerk-verification.interface';

@Injectable()
export class AuthService {
  constructor(private prisma: PrismaService) {}

  async verifyToken(token: string): Promise<ClerkVerificationResponse | null> {
    try {
      // In a real implementation, this would verify with Clerk API
      // This is a simplified version for demonstration
      const clerkVerification = {
        userId: 'clerk_user_id_here',
        organizationId: 'clerk_org_id_here',
        email: 'user@example.com',
        organizationName: 'Example Org',
        role: 'admin',
      };

      return clerkVerification;
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