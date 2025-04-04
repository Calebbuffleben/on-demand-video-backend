"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClerkClientProvider = void 0;
const config_1 = require("@nestjs/config");
const backend_1 = require("@clerk/backend");
exports.ClerkClientProvider = {
    provide: 'ClerkClient',
    useFactory: (configService) => {
        return (0, backend_1.createClerkClient)({
            secretKey: configService.get('CLERK_SECRET_KEY'),
        });
    },
    inject: [config_1.ConfigService],
};
//# sourceMappingURL=clerk-client.provider.js.map