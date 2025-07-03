import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    // Inject AuthService to handle token verification and user management
    private readonly authService: AuthService
  ) {}

  /**
   * Verify Clerk JWT token
   * 
   * This method:
   * - Allows public access to token verification
   * - Validates the provided authentication token
   * - Returns user and organization details if token is valid
   * 
   * @param verifyTokenDto DTO containing the token to verify
   * @returns Token verification result with user and organization information
   */
  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify a Clerk JWT token' })
  async verifyToken(@Body() verifyTokenDto: VerifyTokenDto) {
    // Attempt to verify the token using AuthService
    const verification = await this.authService.verifyToken(verifyTokenDto.token);
    
    // Handle token verification failure
    if (!verification) {
      return { success: false, message: 'Invalid token' };
    }

    // Return successful verification with user and organization details
    return {
      success: true,
      user: {
        id: verification.userId,
        email: verification.email,
      },
      organization: verification.organizationId
        ? {
            id: verification.organizationId,
            name: verification.organizationName,
          }
        : null,
      role: verification.role,
    };
  }

  /**
   * Refresh authentication token
   * 
   * This method:
   * - Allows public access for token refresh
   * - Validates the current token
   * - Returns a new token if the current one is valid
   * 
   * @param req Request object containing the current token
   * @returns New token or error message
   */
  @Public()
  @Post('refresh-token')
  @ApiOperation({ summary: 'Refresh authentication token' })
  async refreshToken(@Req() req: any) {
    try {
      // Extract the current token from the request
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return { success: false, message: 'No token provided' };
      }

      const token = authHeader.split(' ')[1];
      if (!token) {
        return { success: false, message: 'Invalid token format' };
      }

      // Verify the current token
      const verification = await this.authService.verifyToken(token);
      if (!verification) {
        return { success: false, message: 'Invalid or expired token' };
      }

      // For Clerk, we don't actually generate new tokens on the backend
      // Instead, we return success to indicate the token is still valid
      // The frontend should get a fresh token from Clerk's session
      return {
        success: true,
        message: 'Token is valid, get fresh token from Clerk session',
        user: {
          id: verification.userId,
          email: verification.email,
        },
        organization: verification.organizationId
          ? {
              id: verification.organizationId,
              name: verification.organizationName,
            }
          : null,
      };
    } catch (error) {
      console.error('Token refresh error:', error);
      return { success: false, message: 'Token refresh failed' };
    }
  }

  /**
   * Get authenticated user's profile
   * 
   * This method:
   * - Requires authentication
   * - Retrieves user and organization details from the request
   * - Confirms user's authentication status
   * 
   * @param request Request object containing user and organization information
   * @returns User profile with authentication confirmation
   */
  @Get('me')
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get authenticated user profile' })
  async getProfile(@Req() request) {
    // The request.user contains the user entity from our database
    // that was attached by the AuthGuard
    return {
      user: request.user,
      organization: request.organization || null,
      message: 'You are authenticated',
    };
  }

  @Public()
  @Get('test-debug')
  @ApiOperation({ summary: 'Test debug endpoint' })
  async testDebug() {
    return {
      message: 'Debug endpoint working',
      timestamp: new Date().toISOString()
    };
  }

  @Public()
  @Get('debug')
  @ApiOperation({ summary: 'Debug token and organization access' })
  async debugAuth(@Req() req: any) {
    // Get the raw token to examine
    const authHeader = req.headers.authorization;
    const token = authHeader ? authHeader.split(' ')[1] : null;
    
    // Extract decoded info if token exists
    let tokenInfo: any = null;
    if (token) {
      try {
        tokenInfo = await this.authService.verifyToken(token);
      } catch (error) {
        console.error('Token verification error:', error);
      }
    }
    
    return {
      auth: {
        hasToken: !!token,
        tokenValid: !!tokenInfo,
        user: req.user || null,
        currentOrganization: req.organization || null,
        rawOrganizations: req.rawOrganizations || null,
        tokenInfo: tokenInfo,
      }
    };
  }
} 