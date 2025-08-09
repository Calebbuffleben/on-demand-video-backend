"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppConfigModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const Joi = require("joi");
let AppConfigModule = class AppConfigModule {
};
exports.AppConfigModule = AppConfigModule;
exports.AppConfigModule = AppConfigModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
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
                }),
            }),
        ],
    })
], AppConfigModule);
//# sourceMappingURL=config.module.js.map