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

  // Configure security with helmet
  app.use(helmet());

  // Configure CORS
  app.enableCors({
    origin: configService.get<string>('CORS_ORIGIN') || 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
  });

  // Setup Swagger
  const config = new DocumentBuilder()
    .setTitle('Cloudflare Stream Video API')
    .setDescription('API for managing video uploads and status with Cloudflare Stream')
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
