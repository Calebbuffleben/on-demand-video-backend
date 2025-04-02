import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    // Inject AuthService to handle token verification and user management
    private authService: AuthService,
    // Reflector allows reading metadata from decorators
    private reflector: Reflector,
  ) {}

  /**
   * Main authentication method that determines route access
   * 
   * This method:
   * 1. Checks if the route is public
   * 2. Extracts authentication token
   * 3. Verifies the token
   * 4. Retrieves or creates user and organization
   * 5. Attaches user context to the request
   * 
   * @param context Provides access to the current execution context
   * @returns Boolean indicating whether access is granted
   * @throws UnauthorizedException for authentication failures
   */
  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if the route is marked as public using @Public() decorator
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Immediately allow access to public routes
    if (isPublic) {
      return true;
    }

    // Get the HTTP request from the current context
    const request = context.switchToHttp().getRequest<Request>();
    
    // Extract the authentication token from the request header
    const token = this.extractTokenFromHeader(request);

    // Throw an error if no token is present
    if (!token) {
      throw new UnauthorizedException('Authentication token is missing');
    }

    try {
      // Verify the token using AuthService
      const verificationResult = await this.authService.verifyToken(token);
      
      // Throw an error if token verification fails
      if (!verificationResult) {
        throw new UnauthorizedException('Invalid authentication token');
      }

      // Retrieve or create user in the database based on token information
      const user = await this.authService.getOrCreateUser(
        verificationResult.userId,
        verificationResult.email,
      );

      // If organization information is present, retrieve or create organization
      if (verificationResult.organizationId && verificationResult.organizationName) {
        const organization = await this.authService.getOrCreateOrganization(
          verificationResult.organizationId,
          verificationResult.organizationName,
          user.id,
          // Use provided role or default to 'member'
          verificationResult.role || 'member',
        );

        // Attach organization to the request for downstream use
        request['organization'] = organization;
      }

      // Attach user to the request for downstream use
      request['user'] = user;
      
      // Grant access to the route
      return true;
    } catch (error) {
      // Catch any unexpected errors during authentication process
      throw new UnauthorizedException('Authentication failed');
    }
  }

  /**
   * Extracts the Bearer token from the Authorization header
   * 
   * @param request The incoming HTTP request
   * @returns The extracted token or undefined
   */
  private extractTokenFromHeader(request: Request): string | undefined {
    // Split the Authorization header and extract the token
    // Returns undefined if the header is not in the correct Bearer token format
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
} 