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
exports.ClerkStrategy = void 0;
const common_1 = require("@nestjs/common");
const passport_1 = require("@nestjs/passport");
const passport_custom_1 = require("passport-custom");
const config_1 = require("@nestjs/config");
const backend_1 = require("@clerk/backend");
let ClerkStrategy = class ClerkStrategy extends (0, passport_1.PassportStrategy)(passport_custom_1.Strategy, 'clerk') {
    configService;
    clerkClient;
    constructor(configService) {
        super();
        this.configService = configService;
        this.clerkClient = (0, backend_1.createClerkClient)({
            secretKey: configService.get('CLERK_SECRET_KEY'),
        });
    }
    async validate(request) {
        const authHeader = request.headers.authorization;
        if (!authHeader) {
            throw new common_1.UnauthorizedException('No token provided');
        }
        const token = authHeader.split(' ')[1];
        try {
            const claims = await (0, backend_1.verifyToken)(token, {
                secretKey: this.configService.get('CLERK_SECRET_KEY'),
            });
            const user = await this.clerkClient.users.getUser(claims.sub);
            return {
                id: user.id,
                email: user.emailAddresses[0]?.emailAddress,
                firstName: user.firstName,
                lastName: user.lastName,
                organizationId: claims.org_id,
                claims,
            };
        }
        catch (error) {
            throw new common_1.UnauthorizedException('Invalid token');
        }
    }
};
exports.ClerkStrategy = ClerkStrategy;
exports.ClerkStrategy = ClerkStrategy = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [config_1.ConfigService])
], ClerkStrategy);
//# sourceMappingURL=clerk.strategy.js.map