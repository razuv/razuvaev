import { Injectable, Logger } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { getSettingsDbPath, getSettingsPath } from '../storage-paths.js';

interface LanguageRow {
  iso: string;
  name: string;
}

interface BiographyRow {
  iso: string;
  data: string;
}

interface ProjectsRow {
  iso: string;
  items: string;
  archive: string;
}

interface Biography {
  iso: string;
}

interface Projects {
  iso: string;
  items?: unknown[];
  archive?: unknown[];
}

const SCHEMA = `
CREATE TABLE IF NOT EXISTS languages (
  iso TEXT PRIMARY KEY,
  name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS biography (
  iso TEXT PRIMARY KEY,
  data TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS projects (
  iso TEXT PRIMARY KEY,
  items TEXT NOT NULL DEFAULT '[]',
  archive TEXT NOT NULL DEFAULT '[]'
);
`;

@Injectable()
export class SettingsService {
  private readonly db: DatabaseSync;
  private readonly logger = new Logger(SettingsService.name);

  constructor() {
    const dbPath = getSettingsDbPath();
    mkdirSync(dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec(SCHEMA);
    this.seedFromJsonIfEmpty();
  }

  private seedFromJsonIfEmpty(): void {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM languages').get() as { count: number };
    if (row.count > 0) return;

    const settingsPath = getSettingsPath();
    if (!existsSync(settingsPath)) return;

    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf8')) as {
        languages?: LanguageRow[];
        biography?: Biography[];
        projects?: Projects[];
      };

      if (Array.isArray(settings.languages)) {
        this.setLanguages(settings.languages);
      }
      for (const bio of settings.biography ?? []) {
        this.setBiography(bio.iso, bio);
      }
      for (const project of settings.projects ?? []) {
        this.setProjects(project.iso, project.items);
      }

      this.logger.log(`Seeded settings.db from ${settingsPath}`);
    } catch (error) {
      this.logger.error(`Failed to seed settings.db from ${settingsPath}`, error);
    }
  }

  getLanguages(): LanguageRow[] {
    return this.db.prepare('SELECT iso, name FROM languages ORDER BY rowid').all() as unknown as LanguageRow[];
  }

  setLanguages(languages: LanguageRow[]): void {
    this.db.exec('BEGIN');
    try {
      this.db.prepare('DELETE FROM languages').run();
      const insert = this.db.prepare('INSERT INTO languages (iso, name) VALUES (?, ?)');
      for (const language of languages) {
        insert.run(language.iso, language.name);
      }
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  getBiography(iso: string): unknown {
    const row = this.db.prepare('SELECT data FROM biography WHERE iso = ?').get(iso) as { data: string } | undefined;
    return row ? JSON.parse(row.data) : undefined;
  }

  setBiography(iso: string, data: unknown): void {
    this.db
      .prepare('INSERT INTO biography (iso, data) VALUES (?, ?) ON CONFLICT(iso) DO UPDATE SET data = excluded.data')
      .run(iso, JSON.stringify(data));
  }

  getProjects(iso: string): unknown {
    const row = this.db.prepare('SELECT items, archive FROM projects WHERE iso = ?').get(iso) as
      | { items: string; archive: string }
      | undefined;
    if (!row) return undefined;
    return this.deserializeProjects(iso, row.items, row.archive);
  }

  setProjects(iso: string, items: unknown, archive?: unknown): void {
    this.db
      .prepare(
        'INSERT INTO projects (iso, items, archive) VALUES (?, ?, ?) ON CONFLICT(iso) DO UPDATE SET items = excluded.items, archive = excluded.archive',
      )
      .run(iso, JSON.stringify(items ?? []), JSON.stringify(archive ?? []));
  }

  getAll(): Record<string, unknown> {
    const languages = this.getLanguages();

    const biography = (this.db.prepare('SELECT iso, data FROM biography ORDER BY rowid').all() as unknown as BiographyRow[]).map(
      (row) => JSON.parse(row.data),
    );

    const projects = (
      this.db.prepare('SELECT iso, items, archive FROM projects ORDER BY rowid').all() as unknown as ProjectsRow[]
    ).map((row) => this.deserializeProjects(row.iso, row.items, row.archive));

    return { languages, biography, projects };
  }

  getForLanguage(iso: string): Record<string, unknown> {
    const languages = this.getLanguages();
    const biography = this.getBiography(iso);
    const projects = this.getProjects(iso);

    return {
      languages,
      biography: biography !== undefined ? [biography] : [],
      projects: projects !== undefined ? [projects] : [],
    };
  }

  private deserializeProjects(iso: string, items: string, archive: string): Record<string, unknown> {
    const parsedItems = JSON.parse(items) as unknown[];
    const parsedArchive = JSON.parse(archive) as unknown[];
    return {
      iso,
      items: parsedItems,
      ...(parsedArchive.length > 0 ? { archive: parsedArchive } : {}),
    };
  }
}