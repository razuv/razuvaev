import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

interface UploadedMediaFile {
  buffer: Buffer;
  mimetype?: string;
}

const MEDIA_EXTENSIONS: Record<string, string> = {
  'image/png': '.png',
  'image/jpeg': '.jpg',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'video/mp4': '.mp4',
  'video/webm': '.webm',
  'video/quicktime': '.mov',
};

@Injectable()
export class MediaService {
  async save(file: UploadedMediaFile): Promise<string> {
    const extension = MEDIA_EXTENSIONS[file.mimetype || ''];
    if (!extension) throw new Error('Unsupported media type');

    const filename = `${Date.now()}-${randomUUID()}${extension}`;
    const mediaDirectory = join(process.cwd(), 'media');
    const mediaPath = join(mediaDirectory, filename);

    await mkdir(mediaDirectory, { recursive: true });
    await writeFile(mediaPath, file.buffer);

    return `/media/${filename}`;
  }
}