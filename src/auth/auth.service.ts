import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { User, Organization } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { MailService } from '../mail/mail.service';
import { createHash, randomBytes } from 'crypto';

// Type assertion for invite model
type PrismaWithInvite = PrismaService & {
  invite: {
    findUnique: (
      args: 
      { 
        where: 
          { 
            token: string 
          } 
        }
      ) => Promise<{ 
          id: string; 
          email: string; 
          organizationId: string; 
          role: string; 
          token: string; 
          expiresAt: Date; 
          createdAt: Date 
        } | null>;
  };
};

interface JwtPayload {
  userId: string;
  organizationId: string;
  type: 'access';
}

interface AuthResponse {
  user: {
    id: string;
    email: string;
    firstName: string | null;
    lastName: string | null;
  };
  organization: {
    id: string;
    name: string;
    slug: string | null;
  };
  token: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mail: MailService,
  ) {}

  // Criar metodo para get invite by token
  async getInvite(token: string) {
    // Atualizar os dados do convite de acordo com a aplicação atual
    return (this.prisma as PrismaWithInvite).invite.findUnique({ where: { token } });
  }

  /**
   * Hash a password using bcrypt
   */
  private async hashPassword(password: string): Promise<string> {
    const saltRounds = 12;
    return bcrypt.hash(password, saltRounds);
  }

  /**
   * Compare a password with its hash
   */
  private async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  /**
   * Generate a JWT token
   */
  private generateToken(userId: string, organizationId: string): string {
    const payload: JwtPayload = {
      userId,
      organizationId,
      type: 'access'
    };

    const secret = this.configService.get('JWT_SECRET');
    if (!secret) {
      throw new Error('JWT_SECRET is not configured');
    }

    return jwt.sign(
      payload,
      secret,
      { 
        expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d') 
      }
    );
  }

  /**
   * Generate a long-lived refresh token (opaque) and store its hash
   */
  private async issueRefreshToken(userId: string, organizationId?: string | null): Promise<string> {
    const raw = randomBytes(48).toString('hex');
    const hashed = this.hashRefreshToken(raw);
    const expiresAt = new Date(Date.now() + this.getRefreshTtlMs());

    await this.prisma.refreshToken.create({
      data: {
        userId,
        organizationId: organizationId || null,
        hashedToken: hashed,
        expiresAt,
      }
    });

    return raw;
  }

  private hashRefreshToken(raw: string): string {
    return createHash('sha256').update(raw).digest('hex');
  }

  private getRefreshTtlMs(): number {
    const days = Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30);
    return days * 24 * 60 * 60 * 1000;
  }

  /**
   * Verify and rotate a refresh token, returning new access token and new refresh token
   */
  async refreshSession(oldRaw: string): Promise<{ token: string; refreshToken: string; user: AuthResponse['user']; organization: AuthResponse['organization'] }> {
    const hashed = this.hashRefreshToken(oldRaw);
    const record = await this.prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });
    if (!record || record.revokedAt || record.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    let organization = null as AuthResponse['organization'] | null;
    if (record.organizationId) {
      const org = await this.prisma.organization.findUnique({ where: { id: record.organizationId } });
      if (!org) throw new UnauthorizedException('Organization not found');
      organization = { id: org.id, name: org.name, slug: org.slug };
    } else {
      const userOrg = await this.prisma.userOrganization.findFirst({ where: { userId: user.id }, include: { organization: true } });
      if (!userOrg) throw new UnauthorizedException('Organization not found');
      organization = { id: userOrg.organization.id, name: userOrg.organization.name, slug: userOrg.organization.slug };
    }

    // Rotate: revoke old and create new
    await this.prisma.refreshToken.update({ where: { hashedToken: hashed }, data: { revokedAt: new Date() } });
    const newRefresh = await this.issueRefreshToken(user.id, organization.id);
    const newAccess = this.generateToken(user.id, organization.id);

    return {
      token: newAccess,
      refreshToken: newRefresh,
      user: { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName },
      organization,
    };
  }

  async revokeRefreshToken(raw: string): Promise<void> {
    try {
      const hashed = this.hashRefreshToken(raw);
      await this.prisma.refreshToken.update({ where: { hashedToken: hashed }, data: { revokedAt: new Date() } });
    } catch {}
  }

  /**
   * Generate a unique slug for organization
   */
  private generateSlug(email: string): string {
    const base = email.split('@')[0];
    const timestamp = Date.now().toString(36);
    return `${base}-${timestamp}`;
  }

  /**
   * Build a frontend URL ensuring there are no double slashes
   */
  private buildFrontendUrl(path: string): string {
    const base = (this.configService.get('FRONTEND_URL') || '').replace(/\/$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    return `${base}${normalizedPath}`;
  }

  /**
   * Register a new user and create their organization
   */
  async register(registerDto: RegisterDto): Promise<AuthResponse> {
    // Check if email already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email: registerDto.email }
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash the password
    const hashedPassword = await this.hashPassword(registerDto.password);

    // Create user and organization in a transaction
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Create user
      const user = await prisma.user.create({
        data: {
          email: registerDto.email,
          password: hashedPassword,
          firstName: registerDto.firstName,
          lastName: registerDto.lastName,
          emailVerified: false,
        }
      });

      // 2. Create organization
      const organization = await prisma.organization.create({
        data: {
          name: `${registerDto.firstName}'s Organization`,
          slug: this.generateSlug(registerDto.email),
          description: `Organization created for ${registerDto.firstName} ${registerDto.lastName}`,
        }
      });

      // 3. Create user-organization relationship
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'OWNER'
        }
      });

      return { user, organization };
    });

    // 4. Generate session tokens
    const token = this.generateToken(result.user.id, result.organization.id);
    const refreshToken = await this.issueRefreshToken(result.user.id, result.organization.id);

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        firstName: result.user.firstName,
        lastName: result.user.lastName,
      },
      organization: {
        id: result.organization.id,
        name: result.organization.name,
        slug: result.organization.slug,
      },
      token,
      refreshToken
    };
  }

  /**
   * Login user
   */
  async login(loginDto: LoginDto): Promise<AuthResponse> {
    // Find user by email
    const user = await this.prisma.user.findUnique({
      where: { email: loginDto.email }
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Check if user has password (migrated users might not have password yet)
    if (!user.password) {
      // Automatically issue a password reset to help user set a password
      try {
        await this.requestPasswordReset(user.email);
      } catch {}
      throw new BadRequestException('Password setup required. We sent a reset link to your email.');
    }

    // Verify password
    const isPasswordValid = await this.comparePassword(loginDto.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Do not block login for unverified emails; frontend will redirect to verify-email flow

    // Find user's organization
    const userOrg = await this.prisma.userOrganization.findFirst({
      where: { userId: user.id },
      include: { organization: true }
    });

    if (!userOrg) {
      throw new UnauthorizedException('User has no organization');
    }

    // Update last login
    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLogin: new Date() }
    });

    // Generate session tokens
    const token = this.generateToken(user.id, userOrg.organization.id);
    const refreshToken = await this.issueRefreshToken(user.id, userOrg.organization.id);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      organization: {
        id: userOrg.organization.id,
        name: userOrg.organization.name,
        slug: userOrg.organization.slug,
      },
      token,
      refreshToken
    };
  }

  /**
   * Email verification: issue token and (placeholder) send email
   */
  async requestEmailVerification(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) throw new BadRequestException('User not found');
    if (user.emailVerified) return { success: true };

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h

    const record = await this.prisma.emailVerificationToken.create({
      data: { userId: user.id, token, expiresAt },
    });

    const link = this.buildFrontendUrl(`/verify-email?token=${token}`);
    await this.mail.sendVerificationEmail(user.email, link);
    return { success: true };
  }

  /**
   * Verify email token and mark user as verified
   */
  async verifyEmailToken(token: string): Promise<boolean> {
    const record = await this.prisma.emailVerificationToken.findUnique({ where: { token } });
    if (!record) return false;
    if (record.usedAt) return false;
    if (record.expiresAt < new Date()) return false;

    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
      this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);

    return true;
  }

  /**
   * Password reset: issue token and send (placeholder) email
   */
  async requestPasswordReset(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return { success: true }; // do not reveal user existence

    const token = randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30); // 30m
    await this.prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });
    const link = this.buildFrontendUrl(`/reset-password?token=${token}`);
    await this.mail.sendPasswordResetEmail(user.email, link);
    return { success: true };
  }

  async resetPassword(token: string, newPassword: string) {
    const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });
    if (!record || record.usedAt || record.expiresAt < new Date()) {
      throw new BadRequestException('Invalid or expired token');
    }

    const hash = await this.hashPassword(newPassword);
    await this.prisma.$transaction([
      this.prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
      this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
    ]);
    return { success: true };
  }

  /**
   * Verify JWT token
   */
  async verifyToken(token: string): Promise<JwtPayload | null> {
    try {
      const secret = this.configService.get('JWT_SECRET');
      if (!secret) {
        throw new Error('JWT_SECRET is not configured');
      }

      const decoded = jwt.verify(token, secret) as any;
      return decoded;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get or create user (for backward compatibility)
   */
  async getOrCreateUser(userId: string, email: string): Promise<User> {
    let user = await this.prisma.user.findUnique({
      where: { id: userId }
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return user;
  }

  /**
   * Get or create organization (for backward compatibility)
   */
  async getOrCreateOrganization(organizationId: string, name: string, userId: string): Promise<Organization> {
    let organization = await this.prisma.organization.findUnique({
      where: { id: organizationId }
    });

    if (!organization) {
      throw new UnauthorizedException('Organization not found');
    }

    return organization;
  }

  /**
   * Get user organizations
   */
  async getUserOrganizations(userId: string) {
    return this.prisma.userOrganization.findMany({
      where: { userId },
      include: {
        organization: true
      }
    });
  }
} 