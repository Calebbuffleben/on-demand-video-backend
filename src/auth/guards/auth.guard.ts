import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private reflector: Reflector,
    private prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;
    
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }
    
    // Extract token from cookie or header
    const token = this.extractToken(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      // Verify the JWT token
      const verificationResult = await this.authService.verifyToken(token);
      
      if (!verificationResult) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: verificationResult.userId }
      });

      if (!user) {
        throw new UnauthorizedException('User not found');
      }

      // Get organization from database
      const organization = await this.prisma.organization.findUnique({
        where: { id: verificationResult.organizationId }
      });

      if (!organization) {
        throw new UnauthorizedException('Organization not found');
      }

      // Check if user belongs to organization
      const userOrg = await this.prisma.userOrganization.findUnique({
        where: {
          userId_organizationId: {
            userId: user.id,
            organizationId: organization.id,
          }
        }
      });

      if (!userOrg) {
        throw new UnauthorizedException('User does not belong to organization');
      }

      // Attach user and organization to request
      request['user'] = user;
      request['organization'] = organization;
      request['userRole'] = userOrg.role;
      
      return true;
    } catch (error) {
      console.error('Authentication error:', error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractToken(request: Request): string | undefined {
    // Prefer cookie first (httpOnly session), then Authorization header
    const cookieToken = request.cookies?.scale_token;
    if (cookieToken) {
      return cookieToken;
    }

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    return undefined;
  }
} 