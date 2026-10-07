import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module.js';

async function bootstrap() {
  console.log('Start application');
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { cors: false });
  app.useBodyParser('json', { limit: process.env.JSON_BODY_LIMIT || '10mb' });
  const corsOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean) || [];

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept, Authorization',
  });

  app.use((_request, response, next) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    next();
  });

  try {
    app.setGlobalPrefix('api');
    await app.listen(process.env.PORT || 3000, process.env.HOST || '0.0.0.0');
  } catch (error) {
    console.error(error);
  }
}
bootstrap();
