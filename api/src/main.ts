import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  console.log('Start application');
  const app = await NestFactory.create(AppModule, { cors: false });
  const corsOrigins = process.env.CORS_ORIGINS
    ?.split(',')
    .map(origin => origin.trim())
    .filter(Boolean) || [];

  app.enableCors({
    origin: corsOrigins.length > 0 ? corsOrigins : true,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    allowedHeaders: 'Content-Type, Accept',
  });

  try {
    app.setGlobalPrefix('api');
    await app.listen(process.env.PORT || 3000);
  } catch (error) {
    console.error(error);
  }
}
bootstrap();
