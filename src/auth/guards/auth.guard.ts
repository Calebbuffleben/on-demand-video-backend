import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { AuthService } from '../auth.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    // Inject AuthService to handle token verification and user management
    private authService: AuthService,
    // Reflector allows reading metadata from decorators
    private reflector: Reflector,
    private prisma: PrismaService,
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
      console.log('Verifying token...');
      
      // Verify the token using AuthService
      const verificationResult = await this.authService.verifyToken(token);
      
      // Throw an error if token verification fails
      if (!verificationResult) {
        console.log('Token verification failed');
        throw new UnauthorizedException('Invalid authentication token');
      }

      console.log('Token verification successful:', JSON.stringify(verificationResult, null, 2));

      // Retrieve or create user in the database based on token information
      const user = await this.authService.getOrCreateUser(
        verificationResult.userId,
        verificationResult.email,
      );

      console.log('User from database:', JSON.stringify(user, null, 2));

      // Attach the organizations array from the token if available
      if (verificationResult.organizations) {
        console.log('Attaching organizations array to request:', 
          JSON.stringify(verificationResult.organizations, null, 2));
        request['rawOrganizations'] = verificationResult.organizations;
      }

      // Check for X-Organization-Id header - it takes precedence if present
      const requestedOrgId = request.headers['x-organization-id'] as string;
      
      if (requestedOrgId) {
        console.log('X-Organization-Id header present:', requestedOrgId);
        
        // First, check if the organization exists in our database
        let organization = await this.prisma.organization.findUnique({
          where: { clerkId: requestedOrgId },
        });
        
        // If organization doesn't exist in our database, create it using token info
        if (!organization) {
          console.log('Organization not found in database, creating from token info...');
          
          // Use organization info from token if available
          const orgName = verificationResult.organizationName || 'Unknown Organization';
          const orgRole = verificationResult.organizationRole || verificationResult.role || 'member';
          
          try {
            // Create the organization and user membership in one transaction
            organization = await this.authService.getOrCreateOrganization(
              requestedOrgId,
              orgName,
              user.id,
              orgRole,
            );
            
            console.log('Organization created in database:', JSON.stringify(organization, null, 2));
          } catch (error) {
            console.error('Failed to create organization:', error);
          }
        } else {
          // Organization exists, check if user has membership
          const userOrg = await this.prisma.userOrganization.findFirst({
            where: {
              userId: user.id,
              organizationId: organization.id,
            },
          });
          
          // If no membership exists, create it
          if (!userOrg) {
            console.log('User membership not found, creating...');
            const orgRole = verificationResult.organizationRole || verificationResult.role || 'member';
            
            // Map Clerk roles to database roles
            const mapClerkRoleToDbRole = (clerkRole: string): 'ADMIN' | 'OWNER' | 'MEMBER' => {
              if (clerkRole === 'org:admin' || clerkRole === 'admin') return 'ADMIN';
              if (clerkRole === 'org:owner' || clerkRole === 'owner') return 'OWNER';
              return 'MEMBER'; // Default to member for org:member or any other role
            };
            
            try {
              await this.prisma.userOrganization.create({
                data: {
                  userId: user.id,
                  organizationId: organization.id,
                  role: mapClerkRoleToDbRole(orgRole),
                },
              });
              console.log('User membership created successfully');
            } catch (error) {
              console.error('Failed to create user membership:', error);
            }
          }
        }
        
        // Attach organization to request if we have it
        if (organization) {
          console.log('Attaching organization to request:', JSON.stringify(organization, null, 2));
          request['organization'] = organization;
        } else {
          console.log('Could not resolve organization, falling back to token info');
          
          // Fallback: create a minimal organization object from token info
          if (verificationResult.organizationId && verificationResult.organizationName) {
            console.log('Creating fallback organization object from token info');
            request['organization'] = {
              id: verificationResult.organizationId, // Use Clerk ID as fallback
              clerkId: verificationResult.organizationId,
              name: verificationResult.organizationName,
              // Add other required fields with defaults
              createdAt: new Date(),
              updatedAt: new Date(),
            };
          }
        }
      }
      // If no header but organization info in token, use that
      else if (verificationResult.organizationId && verificationResult.organizationName) {
        console.log('Organization info from token:', 
          verificationResult.organizationId, 
          verificationResult.organizationName,
          verificationResult.organizationRole || 'No role specified');
        
        // Create or retrieve organization in database
        const organization = await this.authService.getOrCreateOrganization(
          verificationResult.organizationId,
          verificationResult.organizationName,
          user.id,
          // Use organizationRole if available, fallback to role, or default to 'member'
          verificationResult.organizationRole || verificationResult.role || 'member',
        );

        console.log('Organization from database:', JSON.stringify(organization, null, 2));

        // Attach organization to the request for downstream use
        request['organization'] = organization;
      } else {
        console.log('No specific organization info in token or headers');
      }

      // Attach user to the request for downstream use
      request['user'] = user;
      
      console.log('Request user and organization attached:', {
        user: !!request['user'],
        organization: !!request['organization'],
        rawOrganizations: !!request['rawOrganizations']
      });
      
      // Grant access to the route
      return true;
    } catch (error) {
      // Catch any unexpected errors during authentication process
      console.error('Authentication error:', error);
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