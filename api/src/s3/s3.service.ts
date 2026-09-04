import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { Bot } from 'node-telegram-bot-api';

interface UploadedMediaFile {
  buffer: Buffer;
  mimetype?: string;
  originalname: string;
}

const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const hmac = (key: string | Buffer, value: string): Buffer => createHmac('sha256', key).update(value).digest();

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

  constructor() { }

  private async uploadToS3(body: Buffer, key: string, contentType: string): Promise<string | false> {
    const accessKeyId = process.env.S3_ACCESS_KEY_ID;
    const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
    const bucket = process.env.S3_BUCKET;

    if(!accessKeyId || !secretAccessKey || !bucket) {
      return false;
    }

    const endpoint = (process.env.S3_ENDPOINT || 'https://storage.yandexcloud.net').replace(/\/$/, '');
    const region = process.env.S3_REGION || 'ru-central1';
    const service = 's3';
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);
    const canonicalUri = `/${encodeURIComponent(bucket)}/${key.split('/').map(encodeURIComponent).join('/')}`;
    const host = new URL(endpoint).host;
    const payloadHash = sha256(body);
    const signedHeaders = 'host;x-amz-content-sha256;x-amz-date';
    const canonicalHeaders = `host:${host}\nx-amz-content-sha256:${payloadHash}\nx-amz-date:${amzDate}\n`;
    const canonicalRequest = `PUT\n${canonicalUri}\n\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = `AWS4-HMAC-SHA256\n${amzDate}\n${credentialScope}\n${sha256(canonicalRequest)}`;
    const signingKey = hmac(
      hmac(hmac(hmac(`AWS4${secretAccessKey}`, dateStamp), region), service),
      'aws4_request',
    );
    const signature = createHmac('sha256', signingKey).update(stringToSign).digest('hex');
    const authorization = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    const response = await fetch(`${endpoint}${canonicalUri}`, {
      method: 'PUT',
      headers: {
        Authorization: authorization,
        'Content-Type': contentType,
        'x-amz-content-sha256': payloadHash,
        'x-amz-date': amzDate,
      },
      body: new Uint8Array(body),
    });

    if(!response.ok) {
      throw new Error(`S3 upload failed with status ${response.status}`);
    }

    const publicBaseUrl = (process.env.S3_PUBLIC_URL || `${endpoint}/${encodeURIComponent(bucket)}`).replace(/\/$/, '');
    return `${publicBaseUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  async UploadMedia(file: UploadedMediaFile): Promise<string> {
    const extension = path.extname(file.originalname).toLowerCase();
    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const mediaPath = path.join('media', filename);

    await mkdir('media', { recursive: true });
    await writeFile(mediaPath, file.buffer);

    try {
      const uploadLocation = await this.uploadToS3(file.buffer, `media/${filename}`, file.mimetype || 'application/octet-stream');

      if(uploadLocation) {
        return uploadLocation;
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

      await rm(settingsPath, { force: true });

      await mkdir('settings', { recursive: true });

      await writeFile(settingsPath, _content);

      messageConverter(_content).forEach(message => {
        void this.bot.api.sendMessage({
          chat_id: this.TelegramGroupID,
          text: message,
          parse_mode: 'HTML',
        })
      });

      const file = await readFile(settingsPath);
      const uploadStatus = await this.uploadToS3(file, settingsFilename, 'application/json');

      return !!uploadStatus;
    } catch {
      return false;
    }
  }
}
