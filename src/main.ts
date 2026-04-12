/* eslint-disable prettier/prettier */

// import { webcrypto } from "crypto";
// (global as any).crypto = webcrypto;
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';
import * as Sentry from "@sentry/node";
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

Sentry.init({
  dsn: "https://c44430e6475b8b79fa4c4862f087c093@o4511044105273344.ingest.de.sentry.io/4511044110450768",
});

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());

  app.enableCors({
    origin: '*',
  });

  // Swagger setup
  const config = new DocumentBuilder()
    .setTitle('I-Verify Backend API')
    .setDescription('API documentation for I-Verify backend application')
    .setVersion('1.0')
    .addTag('auth', 'Authentication endpoints')
    .addTag('users', 'User management endpoints')
    .addTag('beneficiaries', 'Beneficiary management endpoints')
    .addTag('training-sites', 'Training site management endpoints')
    .addTag('monitoring', 'Monitoring endpoints')
    .addTag('audit', 'Audit trail endpoints')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,        // remove extra fields
      forbidNonWhitelisted: true, // throw error on extra fields
      transform: true,        // auto transform types
    }),
  );
  //await app.listen(3000, '0.0.0.0'); // 👈 important
  await app.listen(process.env.PORT || 3000);
}
bootstrap();
