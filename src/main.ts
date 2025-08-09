import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/exceptions/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from 'helmet';
import { json } from 'express';
import * as cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const configService = app.get(ConfigService);
  
  // Configure CORS first, before other middleware
  const corsOrigin = configService.get<string>('CORS_ORIGIN');
  
  // For cross-domain embedding, allow all origins for embed endpoints
  const allowedOrigins = corsOrigin 
    ? corsOrigin.split(',').map(origin => origin.trim())
    : [
        'https://on-demand-video-frontend-production.up.railway.app',
        'http://localhost:3000',
        'http://localhost:3001'
      ];
  
  // Add preflight handler for OPTIONS requests
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    
    // For embed endpoints, allow all origins without credentials
    if (req.url.includes('/embed') || req.url.includes('/api/embed')) {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Credentials', 'false');
    } else {
      // For other endpoints, use specific origin with credentials
      if (origin && allowedOrigins.includes(origin)) {
        res.header('Access-Control-Allow-Origin', origin);
        res.header('Access-Control-Allow-Credentials', 'true');
      } else {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Credentials', 'false');
      }
    }
    
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Organization-Id, X-DB-Organization-Id, User-Agent');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  app.enableCors({
    origin: allowedOrigins,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
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
  
  // Configure cookie parser
  app.use(cookieParser());

  // Basic rate limiting for auth endpoints
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth', authLimiter);
  app.use('/api/auth/login', sensitiveLimiter);
  app.use('/api/auth/register', sensitiveLimiter);
  
  // Configure raw body parser for webhooks
  app.use(json({
    verify: (req: any, res, buf) => {
      // Store the raw body for webhook verification
      if (req.url.includes('/api/webhooks/mux')) {
        req.rawBody = buf;
      }
    }
  }));
  
  // Add global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
      disableErrorMessages: false,
      enableDebugMessages: true,
      validationError: { target: true, value: true },
    }),
  );

  // Configure exception filters
  app.useGlobalFilters(
    new HttpExceptionFilter(),
    new AllExceptionsFilter(),
  );

  // Configure response transformation
  app.useGlobalInterceptors(new TransformInterceptor());

  // Configure security with helmet - disable CORS blocking
  app.use(helmet({
    crossOriginResourcePolicy: { policy: "cross-origin" },
    crossOriginEmbedderPolicy: false,
  }));

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Scale Video API')
    .setDescription('API for managing video uploads and status with Scale')
    .setVersion('1.0')
    .addTag('videos')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = configService.get<number>('PORT') || 4000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation available at: http://localhost:${port}/api/docs`);
}
bootstrap();
