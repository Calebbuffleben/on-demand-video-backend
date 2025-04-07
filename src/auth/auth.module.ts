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
import { ClerkWebhookController } from './controllers/clerk-webhook.controller';
import { ClerkService } from './services/clerk.service';

/**
 * Authentication Module
 * 
 * This module:
 * - Manages authentication and authorization
 * - Provides token verification
 * - Handles user context for the application
 * - Processes Clerk webhooks for data sync
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
  controllers: [
    AuthController,
    ClerkWebhookController,
  ],
  
  // Provide services and strategies for authentication
  providers: [
    // Authentication service for token verification and user management
    AuthService,
    
    // Clerk service for syncing data between Clerk and local database
    ClerkService,
    
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
  exports: [
    AuthService,
    ClerkService,
  ],
})
export class AuthModule {} 