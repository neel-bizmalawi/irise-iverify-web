/* eslint-disable prettier/prettier */
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import cookieParser from 'cookie-parser';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
    app.use(cookieParser());

  app.enableCors({
    origin: '*',
  });

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
