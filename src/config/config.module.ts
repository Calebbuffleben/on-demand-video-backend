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
        STRIPE_SECRET_KEY: Joi.string().required(),
        STRIPE_WEBHOOK_SECRET: Joi.string().required(),
        STRIPE_PRICE_ID_BASIC: Joi.string().required(),
        STRIPE_PRICE_ID_PRO: Joi.string().required(),
        STRIPE_PRICE_ID_ENTERPRISE: Joi.string().required(),
        FRONTEND_URL: Joi.string().required(),
        CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
        COOKIE_DOMAIN: Joi.string().optional(),
        COOKIE_SAMESITE: Joi.string()
          .valid('lax', 'strict', 'none', 'LAX', 'STRICT', 'NONE')
          .default('lax'),
        // Proxy / networking
        TRUST_PROXY: Joi.boolean().default(false),
        // Email/SMTP (SendGrid SMTP compatible)
        SMTP_HOST: Joi.string().default('smtp.sendgrid.net'),
        SMTP_PORT: Joi.number().default(587),
        SMTP_SECURE: Joi.boolean().default(false),
        SMTP_USER: Joi.string().allow('').default('apikey'),
        SMTP_PASS: Joi.string().allow(''),
        MAIL_FROM: Joi.string().allow(''),
        MAIL_REPLY_TO: Joi.string().allow(''),
      }),
    }),
  ],
})
export class AppConfigModule {} 