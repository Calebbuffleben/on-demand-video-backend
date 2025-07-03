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
        CLERK_SECRET_KEY: Joi.string().required(),
        CLERK_PUBLISHABLE_KEY: Joi.string().required(),
        CLERK_WEBHOOK_SECRET: Joi.string().required(),
        STRIPE_SECRET_KEY: Joi.string().required(),
        STRIPE_WEBHOOK_SECRET: Joi.string().required(),
        STRIPE_PRICE_ID_BASIC: Joi.string().required(),
        STRIPE_PRICE_ID_PRO: Joi.string().required(),
        STRIPE_PRICE_ID_ENTERPRISE: Joi.string().required(),
        FRONTEND_URL: Joi.string().required(),
        CLOUDFLARE_ACCOUNT_ID: Joi.string().required(),
        CLOUDFLARE_API_TOKEN: Joi.string().required(),
        CORS_ORIGIN: Joi.string().default('http://localhost:3000'),
      }),
    }),
  ],
})
export class AppConfigModule {} 