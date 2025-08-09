import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from '../mail/mail.module';

/**
 * Authentication Module
 * 
 * This module:
 * - Manages authentication and authorization
 * - Provides JWT token verification
 * - Handles user context for the application
 */
@Module({
  imports: [
    ConfigModule,
    PrismaModule,
    MailModule,
  ],
  
  controllers: [
    AuthController,
  ],
  
  providers: [
    AuthService,
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  
  exports: [
    AuthService,
  ],
})
export class AuthModule {} 