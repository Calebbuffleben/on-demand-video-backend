import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { ORGANIZATION_SCOPED_KEY } from '../decorators/organization-scoped.decorator';

@Injectable()
export class OrganizationScopeInterceptor implements NestInterceptor {
  constructor(private reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const isOrganizationScoped = this.reflector.getAllAndOverride<boolean>(
      ORGANIZATION_SCOPED_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!isOrganizationScoped) {
      return next.handle();
    }

    const request = context.switchToHttp().getRequest();
    
    // Ensure user is authenticated
    if (!request.user) {
      throw new ForbiddenException('Authentication required');
    }

    // Ensure organization context exists
    if (!request.organization) {
      throw new BadRequestException(
        'Organization context required. Please ensure you are accessing this endpoint with proper organization context.',
      );
    }

    // Validate that the user has access to the organization
    this.validateOrganizationAccess(request);

    return next.handle();
  }

  private validateOrganizationAccess(request: any): void {
    const user = request.user;
    const organization = request.organization;

    // Additional validation can be added here if needed
    // For example, checking if the user is a member of the organization
    // This is already handled by the AuthGuard, but we can add extra checks here
    
    if (!user || !organization) {
      throw new ForbiddenException('Invalid organization access');
    }
  }
} 