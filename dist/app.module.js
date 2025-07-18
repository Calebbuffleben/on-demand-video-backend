"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const core_1 = require("@nestjs/core");
const config_module_1 = require("./config/config.module");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const videos_module_1 = require("./videos/videos.module");
const subscriptions_module_1 = require("./subscriptions/subscriptions.module");
const analytics_module_1 = require("./analytics/analytics.module");
const mux_module_1 = require("./providers/mux/mux.module");
const app_controller_1 = require("./app.controller");
const app_service_1 = require("./app.service");
const organization_scope_interceptor_1 = require("./common/interceptors/organization-scope.interceptor");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_module_1.AppConfigModule,
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            videos_module_1.VideosModule,
            subscriptions_module_1.SubscriptionsModule,
            analytics_module_1.AnalyticsModule,
            mux_module_1.MuxModule,
        ],
        controllers: [app_controller_1.AppController],
        providers: [
            app_service_1.AppService,
            {
                provide: core_1.APP_INTERCEPTOR,
                useClass: organization_scope_interceptor_1.OrganizationScopeInterceptor,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map