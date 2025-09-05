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
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const config_1 = require("@nestjs/config");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const mail_service_1 = require("../mail/mail.service");
const crypto_1 = require("crypto");
let AuthService = class AuthService {
    prisma;
    configService;
    mail;
    constructor(prisma, configService, mail) {
        this.prisma = prisma;
        this.configService = configService;
        this.mail = mail;
    }
    async getInvite(token) {
        try {
            const invite = await this.prisma.invite.findUnique({ where: { token } });
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
    async consumeInvite(token) {
        try {
            return this.prisma.invite.update({ where: { token }, data: { usedAt: new Date() } });
        }
        catch (error) {
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
exports.AuthService = AuthService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        config_1.ConfigService,
        mail_service_1.MailService])
], AuthService);
//# sourceMappingURL=auth.service.js.map