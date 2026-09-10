import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AppController } from './app.controller.js';
import { MediaService } from './media/media.service.js';
import { SettingsService } from './settings/settings.service.js';

const config = {
  envFilePath: '.env',
  isGlobal: true,
};

@Module({
  imports: [
    ConfigModule.forRoot(config),
  ],
  controllers: [
    AppController
  ],
  providers: [
    MediaService,
    SettingsService
  ],
})

export class AppModule {}