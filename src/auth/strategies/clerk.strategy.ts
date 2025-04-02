import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-custom';
import { Request } from 'express';
import { ConfigService } from '@nestjs/config';
import { verifyToken, createClerkClient } from '@clerk/backend';

@Injectable()
export class ClerkStrategy extends PassportStrategy(Strategy, 'clerk') {
  // Clerk client for additional user and organization operations
  private clerkClient: ReturnType<typeof createClerkClient>;

  constructor(
    // ConfigService to access environment-specific configurations
    private readonly configService: ConfigService,
  ) {
    // Call the parent constructor with the strategy name
    super();

    // Initialize Clerk client with the secret key from configuration
    this.clerkClient = createClerkClient({
      secretKey: configService.get<string>('CLERK_SECRET_KEY'),
    });
  }

  /**
   * Validates the authentication request using Clerk
   * 
   * This method:
   * 1. Extracts the Bearer token from the request
   * 2. Verifies the token using Clerk's verification method
   * 3. Retrieves detailed user information
   * 4. Prepares user data for further processing
   * 
   * @param request The incoming HTTP request
   * @returns Processed user information
   * @throws UnauthorizedException for any authentication failures
   */
  async validate(request: Request): Promise<any> {
    // Extract the Authorization header
    const authHeader = request.headers.authorization;

    // Throw an error if no Authorization header is present
    if (!authHeader) {
      throw new UnauthorizedException('No token provided');
    }

    // Extract the token from the Authorization header
    const token = authHeader.split(' ')[1];

    try {
      // Verify the token using Clerk's verification method
      const claims = await verifyToken(token, {
        secretKey: this.configService.get<string>('CLERK_SECRET_KEY'),
      });

      // Retrieve detailed user information from Clerk
      const user = await this.clerkClient.users.getUser(claims.sub);

      // Prepare and return user information
      return {
        // Unique user identifier
        id: user.id,
        // Primary email address
        email: user.emailAddresses[0]?.emailAddress,
        // User's first name
        firstName: user.firstName,
        // User's last name
        lastName: user.lastName,
        // Organization ID from token claims (if applicable)
        organizationId: claims.org_id,
        // Full token claims for additional context
        claims,
      };
    } catch (error) {
      // Handle any errors during token verification or user retrieval
      throw new UnauthorizedException('Invalid token');
    }
  }
} 