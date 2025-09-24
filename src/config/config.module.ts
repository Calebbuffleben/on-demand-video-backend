import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
        PORT: Joi.number().default(4000),
        DATABASE_URL: Joi.string().required(),
        JWT_SECRET: Joi.string().required(),
        JWT_EXPIRES_IN: Joi.string().default('7d'),
        STRIPE_SECRET_KEY: Joi.string().optional(),
        STRIPE_WEBHOOK_SECRET: Joi.string().optional(),
        STRIPE_PRICE_ID_BASIC: Joi.string().optional(),
        STRIPE_PRICE_ID_PRO: Joi.string().optional(),
        STRIPE_PRICE_ID_ENTERPRISE: Joi.string().optional(),
        FRONTEND_URL: Joi.string().required(),
        CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
        COOKIE_DOMAIN: Joi.string().optional(),
        COOKIE_SAMESITE: Joi.string()
          .valid('lax', 'strict', 'none')
          .insensitive()
          .default('lax'),
        // Proxy / networking
        TRUST_PROXY: Joi.boolean().default(false).optional(),
        TRUST_PROXY_HOPS: Joi.number().min(0).default(0).optional(),
        // Email/SMTP (SendGrid SMTP compatible)
        SMTP_HOST: Joi.string().default('smtp.sendgrid.net').optional(),
        SMTP_PORT: Joi.number().default(587).optional(),
        SMTP_SECURE: Joi.boolean().default(false).optional(),
        SMTP_USER: Joi.string().allow('').default('apikey').optional(),
        SMTP_PASS: Joi.string().allow('').optional(),
        MAIL_FROM: Joi.string().allow('').optional(),
        MAIL_REPLY_TO: Joi.string().allow('').optional(),
        // Pepper mapping (optional JSON: maps offer hash or title to PlanType)
        PEPPER_OFFER_PLAN_MAP: Joi.string().optional(),
        // Optional JSON to override per-plan limits
        PLAN_LIMITS_JSON: Joi.string().optional(),
      }),
    }),
  ],
})
export class AppConfigModule {} 