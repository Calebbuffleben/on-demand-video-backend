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
    const corsOrigin = configService.get('CORS_ORIGIN');
    const allowedOrigins = corsOrigin
        ? corsOrigin.split(',').map(origin => origin.trim())
        : [
            'https://on-demand-video-frontend-production.up.railway.app',
            'http://localhost:3000',
            'http://localhost:3001'
        ];
    app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Organization-Id, X-DB-Organization-Id, User-Agent');
        res.header('Access-Control-Allow-Credentials', 'false');
        if (req.method === 'OPTIONS') {
            res.sendStatus(200);
        }
        else {
            next();
        }
    });
    app.enableCors({
        origin: (origin, callback) => {
            if (!origin)
                return callback(null, true);
            if (origin && origin.includes('embed')) {
                return callback(null, true);
            }
            if (allowedOrigins.includes(origin)) {
                return callback(null, true);
            }
            if (process.env.NODE_ENV === 'production') {
                return callback(null, true);
            }
            return callback(new Error('Not allowed by CORS'));
        },
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
        credentials: false,
        allowedHeaders: [
            'Content-Type',
            'Authorization',
            'X-Requested-With',
            'X-Organization-Id',
            'X-DB-Organization-Id',
            'Origin',
            'Accept',
            'User-Agent'
        ],
        preflightContinue: false,
        optionsSuccessStatus: 204
    });
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
    app.use((0, helmet_1.default)({
        crossOriginResourcePolicy: { policy: "cross-origin" },
        crossOriginEmbedderPolicy: false,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('Scale Video API')
        .setDescription('API for managing video uploads and status with Scale')
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