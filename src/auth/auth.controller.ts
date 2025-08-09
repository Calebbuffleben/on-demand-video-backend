import { Controller, Post, Get, Body, UseGuards, Req, Res, HttpStatus, Param, Query, BadRequestException } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import { Public } from './decorators/public.decorator';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(registerDto);
    
    // Set httpOnly cookie
    res.cookie('scale_token', result.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || (process.env.NODE_ENV !== 'production' ? 'none' : 'lax'),
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    res.status(HttpStatus.CREATED).json({
      user: result.user,
      organization: result.organization,
      token: result.token,
      message: 'User registered successfully'
    });
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Login user' })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto, @Res() res: Response) {
    try {
      const result = await this.authService.login(loginDto);
      
      // Set httpOnly cookie
      res.cookie('scale_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || (process.env.NODE_ENV !== 'production' ? 'none' : 'lax'),
        domain: process.env.COOKIE_DOMAIN || undefined,
        path: '/',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.json({
        user: result.user,
        organization: result.organization,
        token: result.token,
        message: 'Login successful'
      });
    } catch (err) {
      // If password setup is required, return 200 with an action flag instead of 400/401
      if (err instanceof BadRequestException) {
        const msg = (err.getResponse() as any)?.message || String(err.message || '');
        if (typeof msg === 'string' && msg.toLowerCase().includes('password setup required')) {
          return res.status(HttpStatus.OK).json({
            requiresPasswordSetup: true,
            message: 'Password setup required. We sent a reset link to your email.',
          });
        }
      }
      throw err;
    }
  }

  @Post('logout')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Logout user' })
  async logout(@Res() res: Response) {
    // Clear cookie
    res.clearCookie('scale_token', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: (process.env.COOKIE_SAMESITE as 'lax' | 'strict' | 'none') || (process.env.NODE_ENV !== 'production' ? 'none' : 'lax'),
      domain: process.env.COOKIE_DOMAIN || undefined,
      path: '/',
    });
    
    res.json({ message: 'Logged out successfully' });
  }

  @Get('me')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req) {
    // User and organization are already attached by AuthGuard
    return {
      user: req.user,
      organization: req.organization,
      userRole: req.userRole,
    };
  }

  @Public()
  @Post('verify')
  @ApiOperation({ summary: 'Verify JWT token' })
  async verifyToken(@Body() body: { token: string }) {
    const verification = await this.authService.verifyToken(body.token);
    
    if (!verification) {
      return { success: false, message: 'Invalid token' };
    }

    return {
      success: true,
      userId: verification.userId,
      organizationId: verification.organizationId,
    };
  }

  // Email verification endpoints (basic stub)
  @Public()
  @Post('email/request-verification')
  @ApiOperation({ summary: 'Request email verification (sends email)' })
  async requestEmailVerification(@Body() body: { email: string }) {
    return this.authService.requestEmailVerification(body.email);
  }

  @Public()
  @Get('email/verify')
  @ApiOperation({ summary: 'Verify email with token' })
  async verifyEmail(@Query('token') token: string, @Res() res: Response) {
    const ok = await this.authService.verifyEmailToken(token);
    if (!ok) {
      return res.status(HttpStatus.BAD_REQUEST).json({ success: false, message: 'Invalid or expired token' });
    }
    return res.json({ success: true });
  }

  // Password reset
  @Public()
  @Post('password/forgot')
  @ApiOperation({ summary: 'Request password reset email' })
  async requestPasswordReset(@Body() body: { email: string }) {
    return this.authService.requestPasswordReset(body.email);
  }

  @Public()
  @Post('password/reset')
  @ApiOperation({ summary: 'Reset password with token' })
  async resetPassword(@Body() body: { token: string; password: string }) {
    return this.authService.resetPassword(body.token, body.password);
  }
} 