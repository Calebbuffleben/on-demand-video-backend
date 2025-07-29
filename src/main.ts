import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { HttpExceptionFilter, AllExceptionsFilter } from './common/exceptions/http-exception.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import helmet from 'helmet';
import { json } from 'express';

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
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS, HEAD');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-Organization-Id, X-DB-Organization-Id, User-Agent');
    res.header('Access-Control-Allow-Credentials', 'false');
    
    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
    } else {
      next();
    }
  });
  
  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin) return callback(null, true);
      
      // Allow all origins for embed endpoints
      if (origin && origin.includes('embed')) {
        return callback(null, true);
      }
      
      // Check if origin is in allowed list
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // For cross-domain embedding, allow all origins
      if (process.env.NODE_ENV === 'production') {
        return callback(null, true);
      }
      
      return callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: false, // Changed to false for cross-domain
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
