import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AppController } from '../dist/app.controller.js';
import { S3Service } from '../dist/s3/s3.service.js';
import { authorized } from '../dist/admin.guard.js';

test('authorization fails closed without a configured token', () => {
  const previous = process.env.ADMIN_TOKEN;
  delete process.env.ADMIN_TOKEN;
  assert.equal(authorized(undefined), false);
  assert.equal(authorized('Bearer undefined'), false);
  if (previous !== undefined) process.env.ADMIN_TOKEN = previous;
});
test('writes reject missing/wrong credentials and malformed settings', async () => {
  process.env.ADMIN_TOKEN = 'test-only';
  const controller = new AppController({ UploadSettings: () => { throw Error('must not save'); } });
  await assert.rejects(controller.UploadSettings(undefined, {}), /Unauthorized/);
  await assert.rejects(controller.UploadSettings('Bearer wrong', {}), /Unauthorized/);
  await assert.rejects(controller.UploadSettings('Bearer test-only', {}), /Invalid settings/);
  await assert.rejects(controller.UploadMedia('Bearer test-only', { mimetype: 'image/svg+xml' }), /Only image/);
});
test('local settings save survives a fresh read and retains block order', async () => {
  const root = await mkdtemp(join(tmpdir(), 'razuvaev-settings-'));
  const original = process.cwd();
  process.env.LOCAL_ONLY = 'true';
  try {
    process.chdir(root);
    const service = new S3Service();
    const content = { languages: [], biography: [], projects: [{ items: [{ details: { blocks: [{ id: 'b', type: 'text' }, { id: 'a', type: 'heading' }] } }] }] };
    assert.equal(await service.UploadSettings(content), true);
    assert.deepEqual(JSON.parse(await readFile('settings/settings.json', 'utf8')), content);
    content.projects[0].items[0].details.blocks = [];
    await service.UploadSettings(content);
    assert.deepEqual(JSON.parse(await readFile('settings/settings.json', 'utf8')), content);
  } finally { process.chdir(original); await rm(root, {recursive:true, force:true}); }
});
