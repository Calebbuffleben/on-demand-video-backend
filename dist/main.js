"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const config_1 = require("@nestjs/config");
const http_exception_filter_1 = require("./common/exceptions/http-exception.filter");
const transform_interceptor_1 = require("./common/interceptors/transform.interceptor");
const helmet_1 = require("helmet");
const express_1 = require("express");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    const configService = app.get(config_1.ConfigService);
    app.use((0, express_1.json)({
        verify: (req, res, buf) => {
            if (req.url.includes('/api/webhooks/mux')) {
                req.rawBody = buf;
            }
        }
    }));
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: false,
        enableDebugMessages: true,
        validationError: { target: true, value: true },
    }));
    app.useGlobalFilters(new http_exception_filter_1.HttpExceptionFilter(), new http_exception_filter_1.AllExceptionsFilter());
    app.useGlobalInterceptors(new transform_interceptor_1.TransformInterceptor());
    app.use((0, helmet_1.default)());
    app.enableCors({
        origin: configService.get('CORS_ORIGIN') || 'http://localhost:3000',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        credentials: true,
    });
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Cloudflare Stream Video API')
        .setDescription('API for managing video uploads and status with Cloudflare Stream')
        .setVersion('1.0')
        .addTag('videos')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api/docs', app, document);
    const port = configService.get('PORT') || 4000;
    await app.listen(port);
    console.log(`Application is running on: http://localhost:${port}`);
    console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
//# sourceMappingURL=main.js.map