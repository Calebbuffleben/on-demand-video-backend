import { Injectable, Logger, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as jwt from 'jsonwebtoken';

export interface PlaybackTokenPayload {
  videoId: string;
  organizationId: string;
  iat: number;
  exp: number;
}

@Injectable()
export class JwtPlaybackService {
  private readonly logger = new Logger(JwtPlaybackService.name);
  private readonly secret: string;
  private readonly defaultExpiryMinutes = 5; // 5 minutes default

  constructor(private configService: ConfigService) {
    // Use JWT_SECRET from environment or fallback to a default for development
    this.secret = this.configService.get<string>('JWT_SECRET') || 'your-secret-key-change-in-production';
    
    if (this.secret === 'your-secret-key-change-in-production') {
      this.logger.warn('Using default JWT secret. Please set JWT_SECRET environment variable in production.');
    }
  }

  /**
   * Generate a short-lived JWT token for video playback
   */
  generatePlaybackToken(videoId: string, organizationId: string, expiryMinutes?: number): string {
    const expiry = expiryMinutes || this.defaultExpiryMinutes;
    
    const payload: Omit<PlaybackTokenPayload, 'iat' | 'exp'> = {
      videoId,
      organizationId,
    };

    const token = jwt.sign(payload, this.secret, {
      expiresIn: `${expiry}m`,
      issuer: 'stream-api',
      subject: videoId,
    });

    this.logger.debug(`Generated playback token for video ${videoId}, expires in ${expiry}m`);
    return token;
  }

  /**
   * Verify and decode a playback token
   */
  verifyPlaybackToken(token: string): PlaybackTokenPayload {
    try {
      const payload = jwt.verify(token, this.secret, {
        issuer: 'stream-api',
      }) as PlaybackTokenPayload;

      return payload;
    } catch (error) {
      if (error instanceof jwt.TokenExpiredError) {
        throw new UnauthorizedException('Playback token has expired');
      } else if (error instanceof jwt.JsonWebTokenError) {
        throw new UnauthorizedException('Invalid playback token');
      } else {
        this.logger.error(`JWT verification error: ${error.message}`);
        throw new UnauthorizedException('Token verification failed');
      }
    }
  }

  /**
   * Extract token from query parameter or Authorization header
   */
  extractTokenFromRequest(req: any): string {
    // Try query parameter first (for HLS segments)
    if (req.query?.token) {
      return req.query.token;
    }

    // Try Authorization header
    const authHeader = req.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    throw new BadRequestException('No token provided');
  }

  /**
   * Middleware helper to validate token and extract payload
   */
  validateTokenFromRequest(req: any): PlaybackTokenPayload {
    const token = this.extractTokenFromRequest(req);
    return this.verifyPlaybackToken(token);
  }
}
