import { BadRequestException, Body, Controller, Get, Inject, NotFoundException, Param, Post, Put, Query, Res, UploadedFile, UseInterceptors, Headers, UnauthorizedException, UseGuards } from '@nestjs/common';
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
    @Inject(SettingsService) private readonly settingsService: SettingsService,
    @Inject(MediaService) private readonly mediaService: MediaService
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

  @Get('/tv/metadata')
  @UseGuards(AdminGuard)
  async GetTvMetadata(@Headers('authorization') authorization: string, @Query('url') url: string) {
    this.requireAuth(authorization);
    let parsed: URL;
    try { parsed = new URL(url); } catch { throw new BadRequestException('Некорректная ссылка YouTube'); }
    const host = parsed.hostname.toLowerCase();
    if (parsed.protocol !== 'https:' || !['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtu.be'].includes(host)) {
      throw new BadRequestException('Нужна ссылка YouTube');
    }
    const id = host === 'youtu.be' ? parsed.pathname.slice(1) : parsed.searchParams.get('v') || parsed.pathname.match(/^\/(?:embed|shorts)\/([^/]+)/)?.[1];
    if (!id || !/^[\w-]{11}$/.test(id)) throw new BadRequestException('Не удалось определить видео YouTube');
    const canonical = `https://www.youtube.com/watch?v=${id}`;
    const response = await fetch(`https://www.youtube.com/oembed?url=${encodeURIComponent(canonical)}&format=json`, { signal: AbortSignal.timeout(7000) }).catch(() => null);
    if (!response?.ok) throw new BadRequestException('YouTube не вернул данные видео');
    const data = await response.json() as { title?: string; author_name?: string; thumbnail_url?: string };
    const parts = (data.title || '').split(/\s+[-–—]\s+/, 2);
    return {
      video: canonical,
      youtube: canonical,
      artist: parts.length === 2 ? parts[0] : data.author_name || '',
      title: parts.length === 2 ? parts[1] : data.title || '',
      cover: data.thumbnail_url || `https://i.ytimg.com/vi/${id}/hqdefault.jpg`,
    };
  }

  @Put('/tv')
  @UseGuards(AdminGuard)
  async SaveTv(@Headers('authorization') authorization: string, @Body() tracks: unknown) {
    this.requireAuth(authorization);
    if (!Array.isArray(tracks) || tracks.length > 200 || tracks.some(track => {
      if (!track || typeof track !== 'object') return true;
      const fields = ['id', 'video', 'cover', 'artist', 'album', 'title', 'youtube', 'spotify', 'yandex', 'apple'];
      if (fields.some(field => track[field] !== undefined && (typeof track[field] !== 'string' || track[field].length > 2048))) return true;
      if (!track.id || !track.video || !track.artist || !track.title) return true;
      return ['video', 'cover', 'youtube', 'spotify', 'yandex', 'apple'].some(field => {
        const value = track[field];
        if (!value) return false;
        if (value.startsWith('/media/')) return field !== 'video' && field !== 'cover' || !/^\/media\/[\w.-]+$/.test(value);
        try { const url = new URL(value); return url.protocol !== 'https:'; } catch { return true; }
      });
    })) throw new BadRequestException('Некорректный список TV');
    if (new Set(tracks.map(track => track.id)).size !== tracks.length) throw new BadRequestException('Повторяющиеся композиции');
    this.settingsService.saveTv(tracks);
    return true;
  }

  @Get('/change-history')
  @UseGuards(AdminGuard)
  async GetChangeHistory(@Headers('authorization') authorization: string) {
    this.requireAuth(authorization);
    return this.settingsService.getChangeHistory();
  }

  @Post('/change-history/:id/restore')
  @UseGuards(AdminGuard)
  async RestoreChange(@Headers('authorization') authorization: string, @Param('id') id: string) {
    this.requireAuth(authorization);
    if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) throw new BadRequestException('Некорректная версия');
    try { return this.settingsService.restoreChange(Number(id)); }
    catch (error) {
      if (error instanceof Error && error.message === 'History entry not found') throw new NotFoundException('Версия не найдена');
      throw error;
    }
  }

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

    if(!file || ! /^(image\/(png|jpeg|gif|webp|avif|svg\+xml)|video\/(mp4|webm|quicktime))$/.test(file.mimetype)) {
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
    this.settingsService.saveLanguages(body);

    return true;
  }

  @Put('/biography/:iso')
  @UseGuards(AdminGuard)
  async UploadBiography(@Headers('authorization') authorization: string, @Param('iso') iso: string, @Body() body) {
    this.requireAuth(authorization);

    if (!body || typeof body !== 'object' || body.iso !== iso) {
      throw new BadRequestException('Invalid biography');
    }
    this.settingsService.saveBiography(iso, body);

    return true;
  }

  @Get('/project-workspace')
  @UseGuards(AdminGuard)
  async GetProjectWorkspace(@Headers('authorization') authorization: string) {
    this.requireAuth(authorization);
    return this.settingsService.getProjectWorkspace();
  }

  @Put('/project-workspace')
  @UseGuards(AdminGuard)
  async SaveProjectWorkspace(@Headers('authorization') authorization: string, @Body() body) {
    this.requireAuth(authorization);
    const groups = body?.groups;
    if (!Number.isInteger(body?.revision) || body.revision < 0 || typeof body.publish !== 'boolean' || !Array.isArray(groups) || !groups.length ||
      groups.some(group => typeof group?.iso !== 'string' || !Array.isArray(group.items) || !Array.isArray(group.archive) ||
        [...group.items, ...group.archive].some(project => typeof project?.id !== 'string' || !project.id || !project.info || !project.details || !project.rules))) {
      throw new BadRequestException('Некорректный черновик');
    }
    const languages = this.settingsService.getLanguages().map(language => language.iso);
    if (new Set(groups.map(group => group.iso)).size !== groups.length || groups.length !== languages.length || groups.some(group => !languages.includes(group.iso))) {
      throw new BadRequestException('Состав языков изменился. Обновите редактор.');
    }
    const ids = (group, key) => group[key].map(project => project.id);
    for (const group of groups) {
      const all = [...ids(group, 'items'), ...ids(group, 'archive')];
      if (new Set(all).size !== all.length || ['items', 'archive'].some(key => JSON.stringify(ids(group, key)) !== JSON.stringify(ids(groups[0], key)))) {
        throw new BadRequestException('Порядок и состав кейсов должны совпадать во всех языках');
      }
    }
    if (body.publish && groups.some(group => group.items.some(project => !project.info.title?.trim() || !project.info.images?.[0]?.link || (project.rules.nda && !project.rules.ndaPassword?.trim())))) {
      throw new BadRequestException('Для публикации заполните названия, обложки и пароли закрытых кейсов во всех языках');
    }
    return this.settingsService.saveProjectWorkspace(groups, body.revision, body.publish);
  }

  @Put('/projects/:iso')
  @UseGuards(AdminGuard)
  async UploadProjects(@Headers('authorization') authorization: string, @Param('iso') iso: string, @Body() body) {
    this.requireAuth(authorization);

    if (!body || !Array.isArray(body.items)) {
      throw new BadRequestException('Invalid projects');
    }
    this.settingsService.saveProjects(iso, body.items, body.archive);

    return true;
  }
}
