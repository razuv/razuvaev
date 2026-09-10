import { DatabaseSync } from 'node:sqlite';
import { dirname, join } from 'node:path';
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const selfDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(selfDir, '..');
const dbPath = join(repoRoot, 'api', 'settings', 'settings.db');
const settingsPath = join(repoRoot, 'api', 'settings', 'settings.json');

if (!existsSync(settingsPath)) {
  console.log('No settings.json found, skipping migration');
  process.exit(0);
}

console.log(`Migrating ${settingsPath} → ${dbPath}`);

mkdirSync(dirname(dbPath), { recursive: true });

const db = new DatabaseSync(dbPath);

db.exec(`
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
`);

const row = db.prepare('SELECT COUNT(*) AS count FROM languages').get();
if (row.count > 0) {
  console.log('Database already contains data, skipping import');
  process.exit(0);
}

const settings = JSON.parse(readFileSync(settingsPath, 'utf8'));

if (Array.isArray(settings.languages)) {
  const insert = db.prepare('INSERT INTO languages (iso, name) VALUES (?, ?)');
  for (const language of settings.languages) {
    insert.run(language.iso, language.name);
  }
  console.log(`Imported ${settings.languages.length} languages`);
}

if (Array.isArray(settings.biography)) {
  const insert = db.prepare('INSERT INTO biography (iso, data) VALUES (?, ?)');
  for (const bio of settings.biography) {
    insert.run(bio.iso, JSON.stringify(bio));
  }
  console.log(`Imported ${settings.biography.length} biography entries`);
}

if (Array.isArray(settings.projects)) {
  const insert = db.prepare('INSERT INTO projects (iso, items, archive) VALUES (?, ?, ?)');
  for (const project of settings.projects) {
    insert.run(project.iso, JSON.stringify(project.items ?? []), JSON.stringify(project.archive ?? []));
  }
  console.log(`Imported ${settings.projects.length} project groups`);
}

console.log('Migration complete');