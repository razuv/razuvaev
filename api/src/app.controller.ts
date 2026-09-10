import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Res, UploadedFile, UseInterceptors, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { basename, join } from 'path';
import { AdminGuard, authorized } from './admin.guard.js';
import { MediaService } from './media/media.service.js';
import { SettingsService } from './settings/settings.service.js';

interface UploadedMediaFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Controller('')
export class AppController {
  private requireAuth(header?: string) {
    if (!authorized(header)) throw new UnauthorizedException();
  }

  constructor(
    private readonly settingsService: SettingsService,
    private readonly mediaService: MediaService
  ) { }

  @Get('/token')
  async CheckTokenValidation(@Headers('authorization') authorization: string) {
    return { isTokenValid: authorized(authorization) };
  };

  @Get('/settings')
  async GetSettings(@Query('lang') lang?: string) {
    if (lang) {
      return this.settingsService.getForLanguage(lang);
    }

    return this.settingsService.getAll();
  };

  @Get('/media/:filename')
  async GetMedia(@Param('filename') filename: string, @Res() response: Response) {
    if(basename(filename) !== filename) {
      throw new BadRequestException('Invalid filename');
    }

    return response.sendFile(join(process.cwd(), 'media', filename));
  };

  @Post('/media')
  @UseGuards(AdminGuard)
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  }))
  async UploadMedia(@Headers('authorization') authorization: string, @UploadedFile() file: UploadedMediaFile) {
    this.requireAuth(authorization);

    if(!file || ! /^(image\/(png|jpeg|gif|webp|avif)|video\/(mp4|webm|quicktime))$/.test(file.mimetype)) {
      throw new BadRequestException('Only image and video files are supported');
    }

    const link = await this.mediaService.save(file);

    return { link };
  };

  @Put('/languages')
  @UseGuards(AdminGuard)
  async UploadLanguages(@Headers('authorization') authorization: string, @Body() body) {
    this.requireAuth(authorization);

    if (!Array.isArray(body) || body.some(language => typeof language?.iso !== 'string' || typeof language?.name !== 'string')) {
      throw new BadRequestException('Invalid languages');
    }
    this.settingsService.setLanguages(body);

    return true;
  }

  @Put('/biography/:iso')
  @UseGuards(AdminGuard)
  async UploadBiography(@Headers('authorization') authorization: string, @Param('iso') iso: string, @Body() body) {
    this.requireAuth(authorization);

    if (!body || typeof body !== 'object' || body.iso !== iso) {
      throw new BadRequestException('Invalid biography');
    }
    this.settingsService.setBiography(iso, body);

    return true;
  }

  @Put('/projects/:iso')
  @UseGuards(AdminGuard)
  async UploadProjects(@Headers('authorization') authorization: string, @Param('iso') iso: string, @Body() body) {
    this.requireAuth(authorization);

    if (!body || !Array.isArray(body.items)) {
      throw new BadRequestException('Invalid projects');
    }
    this.settingsService.setProjects(iso, body.items, body.archive);

    return true;
  }
}