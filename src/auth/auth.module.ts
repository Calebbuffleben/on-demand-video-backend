import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { APP_GUARD } from '@nestjs/core';
import { AuthGuard } from './guards/auth.guard';
import { PassportModule } from '@nestjs/passport';
import { ClerkStrategy } from './strategies/clerk.strategy';
import { ClerkClientProvider } from '../providers/clerk-client.provider';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Authentication Module
 * 
 * This module:
 * - Manages authentication and authorization
 * - Provides token verification
 * - Handles user context for the application
 */
@Module({
  // Import required modules for authentication
  imports: [
    // Passport module for authentication strategies
    PassportModule.register({ defaultStrategy: 'clerk' }),
    
    // Configuration module to access environment variables
    ConfigModule,
    
    // Prisma module for database operations
    PrismaModule,
  ],
  
  // Declare controllers for authentication routes
  controllers: [AuthController],
  
  // Provide services and strategies for authentication
  providers: [
    // Authentication service for token verification and user management
    AuthService,
    
    // Clerk authentication strategy
    ClerkStrategy,
    
    // Clerk client provider for Clerk API access
    ClerkClientProvider,
    
    // Global authentication guard
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
  ],
  
  // Export services if needed by other modules
  exports: [AuthService],
})
export class AuthModule {} 