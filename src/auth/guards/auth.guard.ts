import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.extractTokenFromHeader(request);

    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      const verificationResult = await this.authService.verifyToken(token);
      
      if (!verificationResult) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      // Get or create user in our database
      const user = await this.authService.getOrCreateUser(
        verificationResult.userId,
        verificationResult.email,
      );

      // If organizationId is present, get or create organization
      if (verificationResult.organizationId && verificationResult.organizationName) {
        const organization = await this.authService.getOrCreateOrganization(
          verificationResult.organizationId,
          verificationResult.organizationName,
          user.id,
          verificationResult.role || 'member',
        );

        // Set organization context for the request
        request['organization'] = organization;
      }

      // Set user context for the request
      request['user'] = user;
      
      return true;
    } catch (error) {
      throw new UnauthorizedException('Authentication failed');
    }
  }

  private extractTokenFromHeader(request: Request): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 