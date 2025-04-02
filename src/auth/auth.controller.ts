import { Controller, Post, Body, Get } from '@nestjs/common';
import { AuthService } from './auth.service';
import { Public } from './decorators/public.decorator';
import { VerifyTokenDto } from './dto/verify-token.dto';

@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('verify')
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
} 