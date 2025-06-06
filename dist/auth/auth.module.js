"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthModule = void 0;
const common_1 = require("@nestjs/common");
const auth_controller_1 = require("./auth.controller");
const auth_service_1 = require("./auth.service");
const core_1 = require("@nestjs/core");
const auth_guard_1 = require("./guards/auth.guard");
const passport_1 = require("@nestjs/passport");
const clerk_strategy_1 = require("./strategies/clerk.strategy");
const clerk_client_provider_1 = require("../providers/clerk-client.provider");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("../prisma/prisma.module");
const clerk_webhook_controller_1 = require("./controllers/clerk-webhook.controller");
const clerk_service_1 = require("./services/clerk.service");
let AuthModule = class AuthModule {
};
exports.AuthModule = AuthModule;
exports.AuthModule = AuthModule = __decorate([
    (0, common_1.Module)({
        imports: [
            passport_1.PassportModule.register({ defaultStrategy: 'clerk' }),
            config_1.ConfigModule,
            prisma_module_1.PrismaModule,
        ],
        controllers: [
            auth_controller_1.AuthController,
            clerk_webhook_controller_1.ClerkWebhookController,
        ],
        providers: [
            auth_service_1.AuthService,
            clerk_service_1.ClerkService,
            clerk_strategy_1.ClerkStrategy,
            clerk_client_provider_1.ClerkClientProvider,
            {
                provide: core_1.APP_GUARD,
                useClass: auth_guard_1.AuthGuard,
            },
        ],
        exports: [
            auth_service_1.AuthService,
            clerk_service_1.ClerkService,
        ],
    })
], AuthModule);
//# sourceMappingURL=auth.module.js.map