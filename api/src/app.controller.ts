import { BadRequestException, Body, Controller, Get, Param, Post, Put, Query, Res, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { readFile } from 'fs/promises';
import { basename, join } from 'path';
import { S3Service } from './s3/s3.service';

interface UploadedMediaFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Controller('')
export class AppController {
  private readonly authToken = process.env.ADMIN_TOKEN;

  constructor(
    private readonly s3Service: S3Service
  ) {};

  @Get('/token')
  async CheckTokenValidation(@Query() params) {
    return { isTokenValid: this.authToken === params.token };
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
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 100 * 1024 * 1024,
    },
  }))
  async UploadMedia(@Query() params, @UploadedFile() file: UploadedMediaFile) {
    if(params.token !== this.authToken) {
      return false;
    }

    if(!file || (!file.mimetype.startsWith('image/') && !file.mimetype.startsWith('video/'))) {
      throw new BadRequestException('Only image and video files are supported');
    }

    const link = await this.s3Service.UploadMedia(file);

    return { link };
  };

  @Put('/update') 
  async UploadSettings(@Query() params, @Body() body) {
    if(params.token !== this.authToken) {
      return false;
    }

    const status = await this.s3Service.UploadSettings(body);
    return status;
  }
}
