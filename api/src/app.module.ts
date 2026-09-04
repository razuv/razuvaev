import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { S3Module } from './s3/s3.module.js';

const config = {
  envFilePath: '.env',
  isGlobal: true,
};

@Module({
  imports: [
    ConfigModule.forRoot(config),
    S3Module
  ],
  controllers: [
    AppController
  ],
})

export class AppModule {}
