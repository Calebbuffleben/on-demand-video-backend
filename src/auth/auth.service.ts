import { Injectable, UnauthorizedException, ConflictException, BadRequestException, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { User, Organization, PlanType, SubscriptionStatus } from '@prisma/client';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcryptjs';
import * as jwt from 'jsonwebtoken';
import { MailService } from '../mail/mail.service';
import { createHash, randomBytes } from 'crypto';
import { ConsumeInviteDto } from './dto/consume-invite.dto';
import { RegisterWithTokenDto } from './dto/register-with-token.dto';
// Updated Prisma types

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
          usedAt: Date | null;
          createdAt: Date 
        } | null>;
    update: (
      args: 
      { 
        where: { token: string }; 
        data: { usedAt: Date } 
      }
    ) => Promise<{ 
        id: string; 
        email: string; 
        organizationId: string; 
        role: string; 
        token: string; 
        expiresAt: Date; 
        usedAt: Date | null;
        createdAt: Date 
      }>;
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
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private prisma: PrismaService,
    private configService: ConfigService,
    private mail: MailService,
  ) {}

  // Criar metodo para get invite by token
  async getInvite(token: string) {
    // Atualizar os dados do convite de acordo com a aplicação atual
    // Verificar se o convite existe e se esta expirado
    // Criar try catch para tratar o erro
    try {
    // Hash-based lookup (backward compatible fallback to raw)
    const hashed = createHash('sha256').update(token).digest('hex');
    let invite = await (this.prisma as PrismaWithInvite).invite.findUnique({ where: { token: hashed } });
    if (!invite) {
      invite = await (this.prisma as PrismaWithInvite).invite.findUnique({ where: { token } });
    }
    if (!invite) {
      throw new NotFoundException('Invite not found');
    }
    if (invite.expiresAt < new Date()) {
      throw new BadRequestException('Invite expired');
    }

    // Verificar se o convite foi usado
    if ((invite as { usedAt?: Date | null }).usedAt) {
      throw new BadRequestException('Invite already used');
    }

      // Retornar o convite
      return invite;
    } catch (error) {
      throw new NotFoundException('Invite not found');
    }
  }

  // Criar metodo para consume invite by token
  // Criar try catch para tratar o erro
  async consumeInvite(token: string, payload: ConsumeInviteDto): Promise<AuthResponse> {
    try {
      const hashed = createHash('sha256').update(token).digest('hex');
      let invite = await (this.prisma as PrismaWithInvite).invite.findUnique({ where: { token: hashed } });
      if (!invite) {
        invite = await (this.prisma as PrismaWithInvite).invite.findUnique({ where: { token } });
      }
      if (!invite) throw new NotFoundException('Invite not found');
      if (invite.expiresAt < new Date()) throw new BadRequestException('Invite expired');
      if ((invite as { usedAt?: Date | null }).usedAt) throw new BadRequestException('Invite already used');

      // Create or update user and attach to organization within a transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // Find or create user by invite email
        let user = await tx.user.findUnique({ where: { email: invite!.email } });
        if (!user) {
          const hash = payload.password ? await this.hashPassword(payload.password) : null;
          user = await tx.user.create({
            data: {
              email: invite!.email,
              password: hash,
              firstName: payload.firstName || null,
              lastName: payload.lastName || null,
              emailVerified: true,
            },
          });
        } else if (!user.password && payload.password) {
          // Set password if user exists but has none (migrated)
          const hash = await this.hashPassword(payload.password);
          user = await tx.user.update({ where: { id: user.id }, data: { password: hash } });
        }

        // Ensure membership in organization
        const org = await tx.organization.findUnique({ where: { id: invite!.organizationId } });
        if (!org) throw new NotFoundException('Organization not found');
        await tx.userOrganization.upsert({
          where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
          create: { userId: user.id, organizationId: org.id, role: invite!.role as any },
          update: {},
        });

        // Mark invite as used
        await (tx as unknown as PrismaWithInvite).invite.update({ where: { token: invite!.token }, data: { usedAt: new Date() } });

        return { user, organization: org };
      });

      // Issue session tokens
      const tokenJwt = this.generateToken(result.user.id, result.organization.id);
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
        token: tokenJwt,
        refreshToken,
      };
    } catch (error) {
      if (error instanceof NotFoundException || error instanceof BadRequestException) {
        throw error;
      }
      throw new NotFoundException('Invite not found');
    }
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

      // 4. Ensure default subscription exists (FREE/ACTIVE)
      await prisma.subscription.upsert({
        where: { organizationId: organization.id },
        update: {},
        create: {
          organizationId: organization.id,
          planType: PlanType.FREE,
          status: SubscriptionStatus.ACTIVE,
        },
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
   * Register user with account creation token
   */
  async registerWithToken(registerWithTokenDto: RegisterWithTokenDto): Promise<AuthResponse> {
    const { token, email, password, firstName, lastName } = registerWithTokenDto;

    this.logger.log(`🔐 [REGISTER_TOKEN] Iniciando registro com token para: ${email}`);
    this.logger.log(`🔐 [REGISTER_TOKEN] Token: ${token.substring(0, 8)}...`);

    // Validate token
    this.logger.log(`🔐 [REGISTER_TOKEN] Validando token no banco de dados`);
    const tokenRecord = await this.prisma.accountCreationToken.findUnique({
      where: { token }
    });

    if (!tokenRecord) {
      this.logger.warn(`❌ [REGISTER_TOKEN] Token não encontrado: ${token.substring(0, 8)}...`);
      throw new BadRequestException('Token inválido ou não encontrado');
    }

    this.logger.log(`✅ [REGISTER_TOKEN] Token encontrado no banco de dados`);

    // Check if token is expired
    if (tokenRecord.expiresAt < new Date()) {
      this.logger.warn(`❌ [REGISTER_TOKEN] Token expirado para ${email}. Expira em: ${tokenRecord.expiresAt}`);
      throw new BadRequestException('Token expirado. Solicite um novo link de criação de conta.');
    }

    this.logger.log(`✅ [REGISTER_TOKEN] Token não está expirado. Expira em: ${tokenRecord.expiresAt}`);

    // Check if token is already used
    if (tokenRecord.usedAt) {
      this.logger.warn(`❌ [REGISTER_TOKEN] Token já foi usado para ${email}. Usado em: ${tokenRecord.usedAt}`);
      throw new BadRequestException('Token já foi utilizado. Cada token só pode ser usado uma vez.');
    }

    this.logger.log(`✅ [REGISTER_TOKEN] Token não foi usado anteriormente`);

    // Verify email matches token
    if (tokenRecord.email !== email) {
      this.logger.warn(`❌ [REGISTER_TOKEN] Email não corresponde. Token email: ${tokenRecord.email}, Fornecido: ${email}`);
      throw new BadRequestException('Email não corresponde ao token fornecido');
    }

    this.logger.log(`✅ [REGISTER_TOKEN] Email corresponde ao token`);

    // Check if user already exists
    this.logger.log(`🔐 [REGISTER_TOKEN] Verificando se usuário já existe`);
    const existingUser = await this.prisma.user.findUnique({
      where: { email }
    });

    if (existingUser) {
      this.logger.warn(`❌ [REGISTER_TOKEN] Usuário já existe com email: ${email}`);
      throw new ConflictException('Usuário já existe com este email');
    }

    this.logger.log(`✅ [REGISTER_TOKEN] Usuário não existe, prosseguindo com criação`);

    // Hash the password
    this.logger.log(`🔐 [REGISTER_TOKEN] Gerando hash da senha`);
    const hashedPassword = await this.hashPassword(password);

    // Create user and organization in a transaction
    this.logger.log(`🔐 [REGISTER_TOKEN] Iniciando transação para criar usuário e organização`);
    const result = await this.prisma.$transaction(async (prisma) => {
      // 1. Create user
      this.logger.log(`🔐 [REGISTER_TOKEN] Criando usuário: ${email}`);
      const user = await prisma.user.create({
        data: {
          email,
          password: hashedPassword,
          firstName: firstName || null,
          lastName: lastName || null,
          emailVerified: true, // User is verified via payment
        }
      });

      this.logger.log(`✅ [REGISTER_TOKEN] Usuário criado com ID: ${user.id}`);

      // 2. Create organization
      const orgName = `${firstName || 'User'}'s Organization`;
      this.logger.log(`🔐 [REGISTER_TOKEN] Criando organização: ${orgName}`);
      const organization = await prisma.organization.create({
        data: {
          name: orgName,
          slug: this.generateSlug(email),
          description: `Organization created for ${firstName || 'User'} ${lastName || ''}`,
        }
      });

      this.logger.log(`✅ [REGISTER_TOKEN] Organização criada com ID: ${organization.id}`);

      // 3. Create user-organization relationship
      this.logger.log(`🔐 [REGISTER_TOKEN] Criando relacionamento user-organization`);
      await prisma.userOrganization.create({
        data: {
          userId: user.id,
          organizationId: organization.id,
          role: 'OWNER'
        }
      });

      this.logger.log(`✅ [REGISTER_TOKEN] Relacionamento user-organization criado`);

      // 4. Create subscription using plan from token (ACTIVE)
      // Buscar o plano do token diretamente do banco para garantir tipo e coluna
      let effectivePlan: PlanType = PlanType.FREE;
      try {
        const tokenRow = await prisma.$queryRaw<{ planType: PlanType | null }[]>`
          SELECT "planType" FROM "AccountCreationToken" WHERE id = ${tokenRecord.id}
        `;
        const dbPlan = tokenRow?.[0]?.planType;
        if (dbPlan) effectivePlan = dbPlan;
      } catch {}
      await prisma.subscription.upsert({
        where: { organizationId: organization.id },
        update: {
          planType: effectivePlan,
          status: SubscriptionStatus.ACTIVE,
        },
        create: {
          organizationId: organization.id,
          planType: effectivePlan,
          status: SubscriptionStatus.ACTIVE,
        },
      });

      // 4b. User planType is now managed through the organization's subscription
      // No need to update User table directly as planType is on Subscription model

      // 5. Mark token as used
      this.logger.log(`🔐 [REGISTER_TOKEN] Marcando token como usado`);
      await prisma.accountCreationToken.update({
        where: { id: tokenRecord.id },
        data: { usedAt: new Date() }
      });

      this.logger.log(`✅ [REGISTER_TOKEN] Token marcado como usado`);

      return { user, organization };
    });

    // 5. Generate session tokens
    this.logger.log(`🔐 [REGISTER_TOKEN] Gerando tokens de sessão`);
    const tokenJwt = this.generateToken(result.user.id, result.organization.id);
    const refreshToken = await this.issueRefreshToken(result.user.id, result.organization.id);

    this.logger.log(`✅ [REGISTER_TOKEN] Tokens de sessão gerados com sucesso`);

    this.logger.log(`✅ [REGISTER_TOKEN] Registro com token concluído com sucesso para: ${email}`);
    this.logger.log(`✅ [REGISTER_TOKEN] User ID: ${result.user.id}, Organization ID: ${result.organization.id}`);

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
      token: tokenJwt,
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