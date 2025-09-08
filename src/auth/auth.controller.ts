import { Controller, Post, Get, Body, UseGuards, Req, Res, HttpStatus, Param, Query, BadRequestException, NotFoundException } from '@nestjs/common';
import rateLimit from 'express-rate-limit';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthGuard } from './guards/auth.guard';
import { Public } from './decorators/public.decorator';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { ConsumeInviteDto } from './dto/consume-invite.dto';
import { ConfigService } from '@nestjs/config';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  private getCookieOptions() {
    const isProduction = this.configService.get('NODE_ENV') === 'production';
    const cookieDomain = this.configService.get('COOKIE_DOMAIN');
    const cookieSameSite = this.configService.get('COOKIE_SAMESITE') as 'lax' | 'strict' | 'none';
    
    return {
      httpOnly: true,
      secure: isProduction,
      sameSite: cookieSameSite || (isProduction ? 'none' : 'lax'),
      domain: cookieDomain || undefined,
      path: '/',
    };
  }

  @Public()
  @Get('invite/:token')
  @ApiOperation({ summary: 'Get invite by token' })
  async getInvite(@Param('token') token: string) {
    try {
      return this.authService.getInvite(token);
    } catch (error) {
      throw new NotFoundException('Invite not found');
    }
  }

  @Public()
  @Post('invite/:token/consume')
  @ApiOperation({ summary: 'Consume invite by token' })
  async consumeInvite(
    @Param('token') token: string,
    @Body() body: ConsumeInviteDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.authService.consumeInvite(token, body);
      // Set cookies like login
      res.cookie('scale_token', result.token, {
        ...this.getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      if (result.refreshToken) {
        res.cookie('scale_refresh', result.refreshToken, {
          ...this.getCookieOptions(),
          maxAge: Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30) * 24 * 60 * 60 * 1000,
        });
      }
      return res.json(result);
    } catch (error) {
      throw new NotFoundException('Invite not found');
    }
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user' })
  @ApiBody({ type: RegisterDto })
  async register(@Body() registerDto: RegisterDto, @Res() res: Response) {
    const result = await this.authService.register(registerDto);
    
    // Set httpOnly cookie
    res.cookie('scale_token', result.token, {
      ...this.getCookieOptions(),
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    });

    // Set refresh token cookie
    if (result.refreshToken) {
      res.cookie('scale_refresh', result.refreshToken, {
        ...this.getCookieOptions(),
        maxAge: Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30) * 24 * 60 * 60 * 1000,
      });
    }

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
        ...this.getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      // Set refresh token cookie
      if (result.refreshToken) {
        res.cookie('scale_refresh', result.refreshToken, {
          ...this.getCookieOptions(),
          maxAge: Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30) * 24 * 60 * 60 * 1000,
        });
      }

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
  async logout(@Req() req, @Res() res: Response) {
    // Clear cookie
    res.clearCookie('scale_token', this.getCookieOptions());
    const refresh = req.cookies?.scale_refresh;
    if (refresh) {
      try { await this.authService.revokeRefreshToken(refresh); } catch {}
    }
    res.clearCookie('scale_refresh', this.getCookieOptions());
    
    res.json({ message: 'Logged out successfully' });
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token using refresh token cookie' })
  async refresh(@Req() req, @Res() res: Response) {
    const refresh = req.cookies?.scale_refresh;
    if (!refresh) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'No refresh token' });
    }
    try {
      const result = await this.authService.refreshSession(refresh);
      res.cookie('scale_token', result.token, {
        ...this.getCookieOptions(),
        maxAge: 7 * 24 * 60 * 60 * 1000,
      });
      res.cookie('scale_refresh', result.refreshToken, {
        ...this.getCookieOptions(),
        maxAge: Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30) * 24 * 60 * 60 * 1000,
      });
      return res.json({
        user: result.user,
        organization: result.organization,
        token: result.token,
      });
    } catch (e) {
      return res.status(HttpStatus.UNAUTHORIZED).json({ message: 'Invalid refresh token' });
    }
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