import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const settingsPath = join(root, 'api/settings/settings.json');
const mediaDirectory = join(root, 'api/media');
const settings = JSON.parse(await readFile(settingsPath, 'utf8'));

const mediaLinks = [
  ...settings.projects.flatMap(project => project.items.flatMap(item => item.info.images.map(image => image.link))),
  ...settings.biography.flatMap(biography => biography.feed.map(item => item.image)),
];

const isExternalImage = link => /^https?:\/\//i.test(link) && !/player\.vimeo\.com\/video/i.test(link);
const links = [...new Set(mediaLinks.map(link => link.trim()).filter(isExternalImage))];
const replacements = new Map();
const failures = [];

await mkdir(mediaDirectory, { recursive: true });

const extensionByContentType = contentType => ({
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
  'image/avif': '.avif',
  'image/svg+xml': '.svg',
}[contentType?.split(';')[0]] || '');

const download = async link => {
  try {
    const response = await fetch(link, {
      redirect: 'follow',
      headers: { 'user-agent': 'RazuvaevPortfolioMediaMigration/1.0' },
    });

    if(!response.ok) throw new Error(`HTTP ${response.status}`);

    const url = new URL(link);
    const originalName = basename(url.pathname).replace(/[^a-zA-Z0-9._-]/g, '-');
    const extension = extname(originalName) || extensionByContentType(response.headers.get('content-type')) || '.bin';
    const stem = basename(originalName, extname(originalName)) || 'media';
    const hash = createHash('sha256').update(link).digest('hex').slice(0, 10);
    const filename = `${hash}-${stem}${extension.toLowerCase()}`;
    const buffer = Buffer.from(await response.arrayBuffer());

    await writeFile(join(mediaDirectory, filename), buffer);
    replacements.set(link, `/media/${filename}`);
  } catch (error) {
    failures.push(`${link}: ${error instanceof Error ? error.message : String(error)}`);
  }
};

for(let index = 0; index < links.length; index += 8) {
  await Promise.all(links.slice(index, index + 8).map(download));
}

for(const project of settings.projects) {
  for(const item of project.items) {
    for(const image of item.info.images) {
      image.link = replacements.get(image.link.trim()) || image.link.trim();
    }
  }
}

for(const biography of settings.biography) {
  for(const item of biography.feed) {
    item.image = replacements.get(item.image.trim()) || item.image.trim();
  }
}

await writeFile(settingsPath, `${JSON.stringify(settings)}\n`);

console.log(`Downloaded ${replacements.size} media files.`);
if(failures.length) {
  console.error(`Failed to download ${failures.length} files:`);
  failures.forEach(failure => console.error(failure));
  process.exitCode = 1;
}
