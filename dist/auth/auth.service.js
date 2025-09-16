"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mail_service_1 = require("../mail/mail.service");
const crypto_1 = require("crypto");
let AuthService = AuthService_1 = class AuthService {
    prisma;
    configService;
    mail;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma, configService, mail) {
        this.prisma = prisma;
        this.configService = configService;
        this.mail = mail;
    }
    async getInvite(token) {
        try {
            const hashed = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
            let invite = await this.prisma.invite.findUnique({ where: { token: hashed } });
            if (!invite) {
                invite = await this.prisma.invite.findUnique({ where: { token } });
            }
            if (!invite) {
                throw new common_1.NotFoundException('Invite not found');
            }
            if (invite.expiresAt < new Date()) {
                throw new common_1.BadRequestException('Invite expired');
            }
            if (invite.usedAt) {
                throw new common_1.BadRequestException('Invite already used');
            }
            return invite;
        }
        catch (error) {
            throw new common_1.NotFoundException('Invite not found');
        }
    }
    async consumeInvite(token, payload) {
        try {
            const hashed = (0, crypto_1.createHash)('sha256').update(token).digest('hex');
            let invite = await this.prisma.invite.findUnique({ where: { token: hashed } });
            if (!invite) {
                invite = await this.prisma.invite.findUnique({ where: { token } });
            }
            if (!invite)
                throw new common_1.NotFoundException('Invite not found');
            if (invite.expiresAt < new Date())
                throw new common_1.BadRequestException('Invite expired');
            if (invite.usedAt)
                throw new common_1.BadRequestException('Invite already used');
            const result = await this.prisma.$transaction(async (tx) => {
                let user = await tx.user.findUnique({ where: { email: invite.email } });
                if (!user) {
                    const hash = payload.password ? await this.hashPassword(payload.password) : null;
                    user = await tx.user.create({
                        data: {
                            email: invite.email,
                            password: hash,
                            firstName: payload.firstName || null,
                            lastName: payload.lastName || null,
                            emailVerified: true,
                        },
                    });
                }
                else if (!user.password && payload.password) {
                    const hash = await this.hashPassword(payload.password);
                    user = await tx.user.update({ where: { id: user.id }, data: { password: hash } });
                }
                const org = await tx.organization.findUnique({ where: { id: invite.organizationId } });
                if (!org)
                    throw new common_1.NotFoundException('Organization not found');
                await tx.userOrganization.upsert({
                    where: { userId_organizationId: { userId: user.id, organizationId: org.id } },
                    create: { userId: user.id, organizationId: org.id, role: invite.role },
                    update: {},
                });
                await tx.invite.update({ where: { token: invite.token }, data: { usedAt: new Date() } });
                return { user, organization: org };
            });
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
        }
        catch (error) {
            if (error instanceof common_1.NotFoundException || error instanceof common_1.BadRequestException) {
                throw error;
            }
            throw new common_1.NotFoundException('Invite not found');
        }
    }
    async hashPassword(password) {
        const saltRounds = 12;
        return bcrypt.hash(password, saltRounds);
    }
    async comparePassword(password, hash) {
        return bcrypt.compare(password, hash);
    }
    generateToken(userId, organizationId) {
        const payload = {
            userId,
            organizationId,
            type: 'access'
        };
        const secret = this.configService.get('JWT_SECRET');
        if (!secret) {
            throw new Error('JWT_SECRET is not configured');
        }
        return jwt.sign(payload, secret, {
            expiresIn: this.configService.get('JWT_EXPIRES_IN', '7d')
        });
    }
    async issueRefreshToken(userId, organizationId) {
        const raw = (0, crypto_1.randomBytes)(48).toString('hex');
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
    hashRefreshToken(raw) {
        return (0, crypto_1.createHash)('sha256').update(raw).digest('hex');
    }
    getRefreshTtlMs() {
        const days = Number(this.configService.get('REFRESH_TOKEN_DAYS') || 30);
        return days * 24 * 60 * 60 * 1000;
    }
    async refreshSession(oldRaw) {
        const hashed = this.hashRefreshToken(oldRaw);
        const record = await this.prisma.refreshToken.findUnique({ where: { hashedToken: hashed } });
        if (!record || record.revokedAt || record.expiresAt < new Date()) {
            throw new common_1.UnauthorizedException('Invalid refresh token');
        }
        const user = await this.prisma.user.findUnique({ where: { id: record.userId } });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        let organization = null;
        if (record.organizationId) {
            const org = await this.prisma.organization.findUnique({ where: { id: record.organizationId } });
            if (!org)
                throw new common_1.UnauthorizedException('Organization not found');
            organization = { id: org.id, name: org.name, slug: org.slug };
        }
        else {
            const userOrg = await this.prisma.userOrganization.findFirst({ where: { userId: user.id }, include: { organization: true } });
            if (!userOrg)
                throw new common_1.UnauthorizedException('Organization not found');
            organization = { id: userOrg.organization.id, name: userOrg.organization.name, slug: userOrg.organization.slug };
        }
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
    async revokeRefreshToken(raw) {
        try {
            const hashed = this.hashRefreshToken(raw);
            await this.prisma.refreshToken.update({ where: { hashedToken: hashed }, data: { revokedAt: new Date() } });
        }
        catch { }
    }
    generateSlug(email) {
        const base = email.split('@')[0];
        const timestamp = Date.now().toString(36);
        return `${base}-${timestamp}`;
    }
    buildFrontendUrl(path) {
        const base = (this.configService.get('FRONTEND_URL') || '').replace(/\/$/, '');
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        return `${base}${normalizedPath}`;
    }
    async register(registerDto) {
        const existingUser = await this.prisma.user.findUnique({
            where: { email: registerDto.email }
        });
        if (existingUser) {
            throw new common_1.ConflictException('Email already registered');
        }
        const hashedPassword = await this.hashPassword(registerDto.password);
        const result = await this.prisma.$transaction(async (prisma) => {
            const user = await prisma.user.create({
                data: {
                    email: registerDto.email,
                    password: hashedPassword,
                    firstName: registerDto.firstName,
                    lastName: registerDto.lastName,
                    emailVerified: false,
                }
            });
            const organization = await prisma.organization.create({
                data: {
                    name: `${registerDto.firstName}'s Organization`,
                    slug: this.generateSlug(registerDto.email),
                    description: `Organization created for ${registerDto.firstName} ${registerDto.lastName}`,
                }
            });
            await prisma.userOrganization.create({
                data: {
                    userId: user.id,
                    organizationId: organization.id,
                    role: 'OWNER'
                }
            });
            return { user, organization };
        });
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
    async registerWithToken(registerWithTokenDto) {
        const { token, email, password, firstName, lastName } = registerWithTokenDto;
        this.logger.log(`🔐 [REGISTER_TOKEN] Iniciando registro com token para: ${email}`);
        this.logger.log(`🔐 [REGISTER_TOKEN] Token: ${token.substring(0, 8)}...`);
        this.logger.log(`🔐 [REGISTER_TOKEN] Validando token no banco de dados`);
        const tokenRecord = await this.prisma.accountCreationToken.findUnique({
            where: { token }
        });
        if (!tokenRecord) {
            this.logger.warn(`❌ [REGISTER_TOKEN] Token não encontrado: ${token.substring(0, 8)}...`);
            throw new common_1.BadRequestException('Token inválido ou não encontrado');
        }
        this.logger.log(`✅ [REGISTER_TOKEN] Token encontrado no banco de dados`);
        if (tokenRecord.expiresAt < new Date()) {
            this.logger.warn(`❌ [REGISTER_TOKEN] Token expirado para ${email}. Expira em: ${tokenRecord.expiresAt}`);
            throw new common_1.BadRequestException('Token expirado. Solicite um novo link de criação de conta.');
        }
        this.logger.log(`✅ [REGISTER_TOKEN] Token não está expirado. Expira em: ${tokenRecord.expiresAt}`);
        if (tokenRecord.usedAt) {
            this.logger.warn(`❌ [REGISTER_TOKEN] Token já foi usado para ${email}. Usado em: ${tokenRecord.usedAt}`);
            throw new common_1.BadRequestException('Token já foi utilizado. Cada token só pode ser usado uma vez.');
        }
        this.logger.log(`✅ [REGISTER_TOKEN] Token não foi usado anteriormente`);
        if (tokenRecord.email !== email) {
            this.logger.warn(`❌ [REGISTER_TOKEN] Email não corresponde. Token email: ${tokenRecord.email}, Fornecido: ${email}`);
            throw new common_1.BadRequestException('Email não corresponde ao token fornecido');
        }
        this.logger.log(`✅ [REGISTER_TOKEN] Email corresponde ao token`);
        this.logger.log(`🔐 [REGISTER_TOKEN] Verificando se usuário já existe`);
        const existingUser = await this.prisma.user.findUnique({
            where: { email }
        });
        if (existingUser) {
            this.logger.warn(`❌ [REGISTER_TOKEN] Usuário já existe com email: ${email}`);
            throw new common_1.ConflictException('Usuário já existe com este email');
        }
        this.logger.log(`✅ [REGISTER_TOKEN] Usuário não existe, prosseguindo com criação`);
        this.logger.log(`🔐 [REGISTER_TOKEN] Gerando hash da senha`);
        const hashedPassword = await this.hashPassword(password);
        this.logger.log(`🔐 [REGISTER_TOKEN] Iniciando transação para criar usuário e organização`);
        const result = await this.prisma.$transaction(async (prisma) => {
            this.logger.log(`🔐 [REGISTER_TOKEN] Criando usuário: ${email}`);
            const user = await prisma.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    firstName: firstName || null,
                    lastName: lastName || null,
                    emailVerified: true,
                }
            });
            this.logger.log(`✅ [REGISTER_TOKEN] Usuário criado com ID: ${user.id}`);
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
            this.logger.log(`🔐 [REGISTER_TOKEN] Criando relacionamento user-organization`);
            await prisma.userOrganization.create({
                data: {
                    userId: user.id,
                    organizationId: organization.id,
                    role: 'OWNER'
                }
            });
            this.logger.log(`✅ [REGISTER_TOKEN] Relacionamento user-organization criado`);
            this.logger.log(`🔐 [REGISTER_TOKEN] Marcando token como usado`);
            await prisma.accountCreationToken.update({
                where: { id: tokenRecord.id },
                data: { usedAt: new Date() }
            });
            this.logger.log(`✅ [REGISTER_TOKEN] Token marcado como usado`);
            return { user, organization };
        });
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
    async login(loginDto) {
        const user = await this.prisma.user.findUnique({
            where: { email: loginDto.email }
        });
        if (!user) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        if (!user.password) {
            try {
                await this.requestPasswordReset(user.email);
            }
            catch { }
            throw new common_1.BadRequestException('Password setup required. We sent a reset link to your email.');
        }
        const isPasswordValid = await this.comparePassword(loginDto.password, user.password);
        if (!isPasswordValid) {
            throw new common_1.UnauthorizedException('Invalid credentials');
        }
        const userOrg = await this.prisma.userOrganization.findFirst({
            where: { userId: user.id },
            include: { organization: true }
        });
        if (!userOrg) {
            throw new common_1.UnauthorizedException('User has no organization');
        }
        await this.prisma.user.update({
            where: { id: user.id },
            data: { lastLogin: new Date() }
        });
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
    async requestEmailVerification(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            throw new common_1.BadRequestException('User not found');
        if (user.emailVerified)
            return { success: true };
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24);
        const record = await this.prisma.emailVerificationToken.create({
            data: { userId: user.id, token, expiresAt },
        });
        const link = this.buildFrontendUrl(`/verify-email?token=${token}`);
        await this.mail.sendVerificationEmail(user.email, link);
        return { success: true };
    }
    async verifyEmailToken(token) {
        const record = await this.prisma.emailVerificationToken.findUnique({ where: { token } });
        if (!record)
            return false;
        if (record.usedAt)
            return false;
        if (record.expiresAt < new Date())
            return false;
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: record.userId }, data: { emailVerified: true } }),
            this.prisma.emailVerificationToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        ]);
        return true;
    }
    async requestPasswordReset(email) {
        const user = await this.prisma.user.findUnique({ where: { email } });
        if (!user)
            return { success: true };
        const token = (0, crypto_1.randomBytes)(32).toString('hex');
        const expiresAt = new Date(Date.now() + 1000 * 60 * 30);
        await this.prisma.passwordResetToken.create({ data: { userId: user.id, token, expiresAt } });
        const link = this.buildFrontendUrl(`/reset-password?token=${token}`);
        await this.mail.sendPasswordResetEmail(user.email, link);
        return { success: true };
    }
    async resetPassword(token, newPassword) {
        const record = await this.prisma.passwordResetToken.findUnique({ where: { token } });
        if (!record || record.usedAt || record.expiresAt < new Date()) {
            throw new common_1.BadRequestException('Invalid or expired token');
        }
        const hash = await this.hashPassword(newPassword);
        await this.prisma.$transaction([
            this.prisma.user.update({ where: { id: record.userId }, data: { password: hash } }),
            this.prisma.passwordResetToken.update({ where: { id: record.id }, data: { usedAt: new Date() } }),
        ]);
        return { success: true };
    }
    async verifyToken(token) {
        try {
            const secret = this.configService.get('JWT_SECRET');
            if (!secret) {
                throw new Error('JWT_SECRET is not configured');
            }
            const decoded = jwt.verify(token, secret);
            return decoded;
        }
        catch (error) {
            return null;
        }
    }
    async getOrCreateUser(userId, email) {
        let user = await this.prisma.user.findUnique({
            where: { id: userId }
        });
        if (!user) {
            throw new common_1.UnauthorizedException('User not found');
        }
        return user;
    }
    async getOrCreateOrganization(organizationId, name, userId) {
        let organization = await this.prisma.organization.findUnique({
            where: { id: organizationId }
        });
        if (!organization) {
            throw new common_1.UnauthorizedException('Organization not found');
        }
        return organization;
    }
    async getUserOrganizations(userId) {
        return this.prisma.userOrganization.findMany({
            where: { userId },
            include: {
                organization: true
            }
        });
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map