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
} 