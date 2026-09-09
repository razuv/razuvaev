import { Injectable } from '@nestjs/common';
import { createHash, createHmac, randomUUID } from 'node:crypto';
import { mkdir, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { getSettingsPath } from '../storage-paths.js';

interface UploadedMediaFile {
  buffer: Buffer;
  mimetype?: string;
  originalname: string;
}

const sha256 = (value: string | Buffer): string => createHash('sha256').update(value).digest('hex');
const hmac = (key: string | Buffer, value: string): Buffer => createHmac('sha256', key).update(value).digest();

@Injectable()
export class S3Service {
  constructor() { }

  private async uploadToS3(body: Buffer, key: string, contentType: string): Promise<string | false> {
    if (process.env.LOCAL_ONLY === 'true') return false;
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
    const extension = ({ 'image/png': '.png', 'image/jpeg': '.jpg', 'image/gif': '.gif', 'image/webp': '.webp', 'image/avif': '.avif', 'video/mp4': '.mp4', 'video/webm': '.webm', 'video/quicktime': '.mov' } as Record<string, string>)[file.mimetype || ''];
    if (!extension) throw new Error('Unsupported media type');
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


  async UploadSettings(content: Record<string, unknown>) {
    const serialized = JSON.stringify(content);
    const settingsPath = getSettingsPath();
    const settingsDirectory = path.dirname(settingsPath);
    const temporaryPath = path.join(settingsDirectory, `.settings-${randomUUID()}.tmp`);
    // Publish first: a failed remote write must not report a successful save.
    const remoteSaved = await this.uploadToS3(Buffer.from(serialized), 'settings.json', 'application/json');
    if (process.env.LOCAL_ONLY !== 'true' && !remoteSaved) throw new Error('Settings upload is not configured');
    try {
      await mkdir(settingsDirectory, { recursive: true });
      await writeFile(temporaryPath, serialized);
      await rename(temporaryPath, settingsPath);
    } catch (error) {
      if (!remoteSaved) throw error;
      console.warn('Settings were published remotely, but the local container copy could not be updated', error);
    }
    return true;
  }
}
