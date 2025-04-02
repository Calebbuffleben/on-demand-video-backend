"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkClientProvider = void 0;
const backend_1 = require("@clerk/backend");
const config_1 = require("@nestjs/config");
exports.ClerkClientProvider = {
    provide: 'ClerkClient',
    useFactory: (configService) => {
        const secretKey = configService.get('CLERK_SECRET_KEY');
        if (!secretKey) {
            throw new Error('CLERK_SECRET_KEY is not defined in environment variables');
        }
        return (0, backend_1.createClerkClient)({
            secretKey,
        });
    },
    inject: [config_1.ConfigService],
};
//# sourceMappingURL=clerk-client.provider.js.map