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

  // 1. Verifica se a rota é pública
  // 2. Extrai o token do cookie ou header
  // 3. Verifica se o token é válido
  // 4. Busca o usuário no banco de dados
  // 5. Busca a organização no banco de dados
  // 6. Verifica se o usuário pertence à organização
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const path = request.path;
    
    console.log(`🔐 AuthGuard: Checking access to ${path}`);
    
    // Check if the route is marked as public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      console.log(`🔐 AuthGuard: Public route, allowing access to ${path}`);
      return true;
    }
    
    // Extract token from cookie or header
    const token = this.extractToken(request);

    if (!token) {
      console.log(`🔐 AuthGuard: No token found for ${path}`);
      console.log(`🔐 AuthGuard: Cookies:`, request.cookies);
      console.log(`🔐 AuthGuard: Authorization header:`, request.headers.authorization ? 'Present' : 'Missing');
      throw new UnauthorizedException('Authentication token is missing');
    }

    console.log(`🔐 AuthGuard: Token found for ${path}, length: ${token.length}`);

    try {
      // Verify the JWT token
      const verificationResult = await this.authService.verifyToken(token);
      
      if (!verificationResult) {
        console.log(`🔐 AuthGuard: Token verification failed for ${path}`);
        throw new UnauthorizedException('Invalid authentication token');
      }

      console.log(`🔐 AuthGuard: Token verified for ${path}, userId: ${verificationResult.userId}, orgId: ${verificationResult.organizationId}`);

      // Get user from database
      const user = await this.prisma.user.findUnique({
        where: { id: verificationResult.userId }
      });

      if (!user) {
        console.log(`🔐 AuthGuard: User not found for ${path}, userId: ${verificationResult.userId}`);
        throw new UnauthorizedException('User not found');
      }

      // Get organization from database
      const organization = await this.prisma.organization.findUnique({
        where: { id: verificationResult.organizationId }
      });

      if (!organization) {
        console.log(`🔐 AuthGuard: Organization not found for ${path}, orgId: ${verificationResult.organizationId}`);
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
        console.log(`🔐 AuthGuard: User does not belong to organization for ${path}, userId: ${user.id}, orgId: ${organization.id}`);
        throw new UnauthorizedException('User does not belong to organization');
      }

      // Attach user and organization to request
      request['user'] = user;
      request['organization'] = organization;
      request['userRole'] = userOrg.role;
      
      console.log(`🔐 AuthGuard: Authentication successful for ${path}, user: ${user.email}, org: ${organization.name}`);
      return true;
    } catch (error) {
      console.error(`🔐 AuthGuard: Authentication error for ${path}:`, error);
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractToken(request: Request): string | undefined {
    // Prefer cookie first (httpOnly session), then Authorization header
    const cookieToken = request.cookies?.scale_token;
    if (cookieToken) {
      console.log(`🔐 AuthGuard: Token found in cookie, length: ${cookieToken.length}`);
      return cookieToken;
    }

    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      console.log(`🔐 AuthGuard: Token found in Authorization header, length: ${token.length}`);
      return token;
    }

    console.log(`🔐 AuthGuard: No token found in cookies or headers`);
    return undefined;
  }
} 