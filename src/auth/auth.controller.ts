import { Controller, Post, Body, Get, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { VerifyTokenDto } from './dto/verify-token.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify a Clerk JWT token' })
  async verifyToken(@Body() verifyTokenDto: VerifyTokenDto) {
    const verification = await this.authService.verifyToken(verifyTokenDto.token);
    
    if (!verification) {
      return { success: false, message: 'Invalid token' };
    }

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