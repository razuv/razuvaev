import { Injectable } from '@nestjs/common';
import crypto from 'node:crypto';
import path from 'node:path';
import easyYandexS3Package from 'easy-yandex-s3';
import fs from 'fs-extra';
import { Bot } from 'node-telegram-bot-api';

interface S3UploadResult {
  Location?: string;
}

interface EasyYandexS3Client {
  Upload(file: { buffer: Buffer; name: string }, route: string): Promise<S3UploadResult | S3UploadResult[] | false>;
}

const EasyYandexS3 = (easyYandexS3Package as unknown as {
  default: new (config: Record<string, unknown>) => EasyYandexS3Client;
}).default;

interface UploadedMediaFile {
  buffer: Buffer;
  originalname: string;
}

const messageConverter = (m: string): string[] => { 
  const max_size = 4096;

  const amount_sliced = m.length / max_size;
  let start = 0;
  let end = max_size;
  let message;
  const messagesArray = [];
  for (let i = 0; i < amount_sliced; i++) {
    message = m.slice(start, end);
    messagesArray.push(message);
    start = start + max_size;
    end = end + max_size;
  }

  return messagesArray;
}

@Injectable()
export class S3Service {
  private readonly TelegramToken = process.env.TG_BOT_ID
  private readonly TelegramGroupID = process.env.TG_GROUP_ID || '-4008140725'
  private readonly bot = new Bot(this.TelegramToken)
  private readonly s3 = new EasyYandexS3({
    auth: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
    Bucket: process.env.S3_BUCKET
  })

  constructor() { }

  async UploadMedia(file: UploadedMediaFile): Promise<string> {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${crypto.randomUUID()}${extension}`;
    const mediaPath = path.join('media', filename);

    await fs.ensureDir('media');
    await fs.writeFile(mediaPath, file.buffer);

    try {
      const uploadStatus = await this.s3.Upload({
        buffer: file.buffer,
        name: filename,
      }, '/media/');

      if(uploadStatus && !Array.isArray(uploadStatus) && uploadStatus.Location) {
        return uploadStatus.Location;
      }
    } catch (error) {
      console.error('S3 media upload failed, using local media file', error);
    }

    return `/media/${filename}`;
  }


  async UploadSettings(content: Record<string, string>) {
    try {
      const settingsFilename = 'settings.json';
      const settingsPath = `settings/${settingsFilename}`;
      const _content = JSON.stringify(content);

      console.log(_content, content);

      await fs.remove(settingsPath);

      await fs.ensureDir('settings')

      await fs.writeFile(settingsPath, _content);

      messageConverter(_content).forEach(message => {
        void this.bot.api.sendMessage({
          chat_id: this.TelegramGroupID,
          text: message,
          parse_mode: 'HTML',
        })
      });

      const file = await fs.readFile(settingsPath);
      
      const uploadStatus = await this.s3.Upload({
        buffer: file,
        name: settingsFilename
      }, '');

      return !!uploadStatus;
    } catch {
      return false;
    }
  }
}
