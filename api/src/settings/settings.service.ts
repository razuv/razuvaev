import { ConflictException, Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
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
CREATE TABLE IF NOT EXISTS project_workspace (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  data TEXT NOT NULL,
  revision INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS change_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  scope TEXT NOT NULL,
  action TEXT NOT NULL,
  snapshot TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS change_history_scope_id ON change_history (scope, id DESC);

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
CREATE TABLE IF NOT EXISTS tv (
  id INTEGER PRIMARY KEY CHECK(id = 1),
  tracks TEXT NOT NULL DEFAULT '[]'
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
        tv?: unknown[];
      };

      if (Array.isArray(settings.languages)) {
        this.setLanguages(settings.languages);
      }
      for (const bio of settings.biography ?? []) {
        this.setBiography(bio.iso, bio);
      }
      for (const project of settings.projects ?? []) {
        this.setProjects(project.iso, project.items, project.archive);
      }
      if (Array.isArray(settings.tv)) this.setTv(settings.tv);

      this.logger.log(`Seeded settings.db from ${settingsPath}`);
    } catch (error) {
      this.logger.error(`Failed to seed settings.db from ${settingsPath}`, error);
    }
  }


  // The legacy site already paired translations by index. Migrate that pairing once,
  // then persist IDs independently of ordering. Do not infer identity from translated titles.
  private ensureProjectIds(): void {
    const groups = (this.getAll().projects as any[]);
    for (const key of ['items', 'archive']) {
      const count = Math.max(0, ...groups.map(group => (group[key] || []).length));
      for (let i = 0; i < count; i++) {
        const id = groups.map(group => group[key]?.[i]?.id).find(Boolean) || randomUUID();
        for (const group of groups) if (group[key]?.[i] && !group[key][i].id) group[key][i].id = id;
      }
    }
    this.db.exec('BEGIN');
    try {
      for (const group of groups) this.setProjects(group.iso, group.items, group.archive);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  getProjectWorkspace() {
    const row = this.db.prepare('SELECT data, revision, updated_at FROM project_workspace WHERE id = 1').get() as any;
    if (!row) {
      this.ensureProjectIds();
      const groups = (this.getAll().projects as any[]).map(group => ({...group, archive: group.archive || []}));
      const now = new Date().toISOString();
      this.db.prepare('INSERT INTO project_workspace (id, data, revision, updated_at) VALUES (1, ?, 0, ?)').run(JSON.stringify(groups), now);
      return { groups, published: groups, revision: 0, updatedAt: now };
    }
    return { groups: JSON.parse(row.data), published: this.getAll().projects, revision: row.revision, updatedAt: row.updated_at };
  }

  saveProjectWorkspace(groups: any[], revision: number, publish = false) {
    this.getProjectWorkspace();
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const current = this.db.prepare('SELECT revision FROM project_workspace WHERE id = 1').get() as any;
      if (current.revision !== revision) throw new ConflictException('Кейсы изменены в другой вкладке. Скачайте резервную копию и обновите редактор.');
      this.recordInitialHistory('project-workspace');
      const now = new Date().toISOString();
      if (publish) for (const group of groups) this.setProjects(group.iso, group.items, group.archive);
      this.db.prepare('UPDATE project_workspace SET data = ?, revision = ?, updated_at = ? WHERE id = 1').run(JSON.stringify(groups), revision + 1, now);
      this.recordHistory('project-workspace', publish ? 'Кейсы опубликованы' : 'Черновик кейсов сохранён');
      this.db.exec('COMMIT');
      return { revision: revision + 1, updatedAt: now };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  getLanguages(): LanguageRow[] {
    return this.db.prepare('SELECT iso, name FROM languages ORDER BY rowid').all() as unknown as LanguageRow[];
  }

  setLanguages(languages: LanguageRow[]): void {
    this.db.exec('BEGIN');
    try {
      this.writeLanguages(languages);
      this.db.exec('COMMIT');
    } catch (error) {
      this.db.exec('ROLLBACK');
      throw error;
    }
  }

  private writeLanguages(languages: LanguageRow[]): void {
    this.db.prepare('DELETE FROM languages').run();
    const insert = this.db.prepare('INSERT INTO languages (iso, name) VALUES (?, ?)');
    for (const language of languages) insert.run(language.iso, language.name);
  }

  private snapshotFor(scope: string): unknown {
    if (scope === 'languages') return this.getLanguages();
    if (scope === 'project-workspace') {
      const row = this.db.prepare('SELECT data FROM project_workspace WHERE id = 1').get() as { data: string };
      return { groups: JSON.parse(row.data), published: this.getAll().projects };
    }
    if (scope === 'tv') return this.getTv();
    if (scope.startsWith('biography:')) return this.getBiography(scope.slice('biography:'.length)) ?? null;
    if (scope.startsWith('projects:')) return this.getProjects(scope.slice('projects:'.length)) ?? null;
    throw new Error('Unknown history scope');
  }

  private recordHistory(scope: string, action: string): void {
    this.db.prepare('INSERT INTO change_history (scope, action, snapshot, created_at) VALUES (?, ?, ?, ?)')
      .run(scope, action, JSON.stringify(this.snapshotFor(scope)), new Date().toISOString());
  }

  private recordInitialHistory(scope: string): void {
    const row = this.db.prepare('SELECT id FROM change_history WHERE scope = ? LIMIT 1').get(scope);
    if (!row) this.recordHistory(scope, 'Исходная версия');
  }

  private saveWithHistory(scope: string, action: string, write: () => void): void {
    this.db.exec('BEGIN IMMEDIATE');
    try {
      this.recordInitialHistory(scope);
      write();
      this.recordHistory(scope, action);
      this.db.exec('COMMIT');
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
  }

  saveLanguages(languages: LanguageRow[]): void {
    this.saveWithHistory('languages', 'Языки сохранены', () => this.writeLanguages(languages));
  }

  saveBiography(iso: string, data: unknown): void {
    this.saveWithHistory(`biography:${iso}`, 'Контент сохранён', () => this.setBiography(iso, data));
  }

  saveProjects(iso: string, items: unknown[], archive?: unknown[]): void {
    this.saveWithHistory(`projects:${iso}`, 'Кейсы сохранены', () => this.setProjects(iso, items, archive));
  }

  saveTv(tracks: unknown[]): void {
    this.saveWithHistory('tv', 'TV сохранено', () => this.setTv(tracks));
  }

  getChangeHistory(): { id: number; scope: string; action: string; createdAt: string }[] {
    return (this.db.prepare('SELECT id, scope, action, created_at FROM change_history ORDER BY id DESC').all() as
      { id: number; scope: string; action: string; created_at: string }[])
      .map(row => ({ id: row.id, scope: row.scope, action: row.action, createdAt: row.created_at }));
  }

  restoreChange(id: number): { id: number; scope: string } {
    const row = this.db.prepare('SELECT scope, snapshot FROM change_history WHERE id = ?').get(id) as
      { scope: string; snapshot: string } | undefined;
    if (!row) throw new Error('History entry not found');
    const snapshot = JSON.parse(row.snapshot);
    this.db.exec('BEGIN IMMEDIATE');
    try {
      if (row.scope === 'languages') this.writeLanguages(snapshot);
      else if (row.scope === 'project-workspace') {
        const languages = this.getLanguages().map(language => language.iso).sort();
        const restoredLanguages = snapshot.groups.map((group: Projects) => group.iso).sort();
        if (JSON.stringify(languages) !== JSON.stringify(restoredLanguages)) {
          throw new ConflictException('Состав языков изменился. Сначала восстановите языки.');
        }
        for (const group of snapshot.published) this.setProjects(group.iso, group.items, group.archive);
        this.db.prepare('UPDATE project_workspace SET data = ?, revision = revision + 1, updated_at = ? WHERE id = 1')
          .run(JSON.stringify(snapshot.groups), new Date().toISOString());
      } else if (row.scope === 'tv') this.setTv(snapshot);
      else if (row.scope.startsWith('biography:')) {
        const iso = row.scope.slice('biography:'.length);
        if (snapshot === null) this.db.prepare('DELETE FROM biography WHERE iso = ?').run(iso);
        else this.setBiography(iso, snapshot);
      }
      else if (row.scope.startsWith('projects:')) {
        const iso = row.scope.slice('projects:'.length);
        if (snapshot === null) this.db.prepare('DELETE FROM projects WHERE iso = ?').run(iso);
        else this.setProjects(iso, snapshot.items, snapshot.archive);
      } else throw new Error('Unknown history scope');
      this.recordHistory(row.scope, `Восстановлена версия #${id}`);
      this.db.exec('COMMIT');
      return { id, scope: row.scope };
    } catch (error) { this.db.exec('ROLLBACK'); throw error; }
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

  getTv(): unknown[] {
    const row = this.db.prepare('SELECT tracks FROM tv WHERE id = 1').get() as { tracks: string } | undefined;
    return row ? JSON.parse(row.tracks) : [];
  }

  setTv(tracks: unknown[]): void {
    this.db.prepare('INSERT INTO tv (id, tracks) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET tracks = excluded.tracks').run(JSON.stringify(tracks));
  }

  getAll(): Record<string, unknown> {
    const languages = this.getLanguages();

    const biography = (this.db.prepare('SELECT iso, data FROM biography ORDER BY rowid').all() as unknown as BiographyRow[]).map(
      (row) => JSON.parse(row.data),
    );

    const projects = (
      this.db.prepare('SELECT iso, items, archive FROM projects ORDER BY rowid').all() as unknown as ProjectsRow[]
    ).map((row) => this.deserializeProjects(row.iso, row.items, row.archive));

    return { languages, biography, projects, tv: this.getTv() };
  }

  getForLanguage(iso: string): Record<string, unknown> {
    const languages = this.getLanguages();
    const biography = this.getBiography(iso);
    const projects = this.getProjects(iso);

    return {
      languages,
      biography: biography !== undefined ? [biography] : [],
      projects: projects !== undefined ? [projects] : [],
      tv: this.getTv(),
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
