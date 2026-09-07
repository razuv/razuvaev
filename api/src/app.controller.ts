import { BadRequestException, Body, Controller, Get, Param, Post, Put, Res, UploadedFile, UseInterceptors, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { basename, join } from 'path';
import { AdminGuard, authorized } from './admin.guard.js';
import { S3Service } from './s3/s3.service.js';

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
    private readonly s3Service: S3Service
  ) {};

  @Get('/token')
  async CheckTokenValidation(@Headers('authorization') authorization: string) {
    return { isTokenValid: authorized(authorization) };
  };

  @Get('/settings')
  async GetSettings() {
    const settingsPath = join(process.cwd(), 'settings', 'settings.json');
    const settings = await readFile(settingsPath, 'utf8');

    return JSON.parse(settings);
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

    const link = await this.s3Service.UploadMedia(file);

    return { link };
  };

  @Put('/update')
  @UseGuards(AdminGuard) 
  async UploadSettings(@Headers('authorization') authorization: string, @Body() body) {
    this.requireAuth(authorization);

    if (!body || !Array.isArray(body.languages) || !Array.isArray(body.biography) || !Array.isArray(body.projects)) {
      throw new BadRequestException('Invalid settings');
    }
    const status = await this.s3Service.UploadSettings(body);
    return status;
  }
}
