import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SettingsService } from '../dist/settings/settings.service.js';
import { AppController } from '../dist/app.controller.js';
import { workspaceChanges } from '../../admin/src/utils/workspace-changes.ts';

const auth = 'Bearer patch-test-only';
const clone = value => JSON.parse(JSON.stringify(value));
const project = (id, title = id) => ({ id, info: { title, images: [{ link: '/media/cover.png' }] }, details: { content: [], theme: {} }, rules: { details: true } });
async function fixture(run) {
  const root = mkdtempSync(join(tmpdir(), 'portfolio-patch-'));
  const previous = { SETTINGS_DB_PATH: process.env.SETTINGS_DB_PATH, SETTINGS_PATH: process.env.SETTINGS_PATH, ADMIN_TOKEN: process.env.ADMIN_TOKEN };
  Object.assign(process.env, { SETTINGS_DB_PATH: join(root, 'settings.db'), SETTINGS_PATH: join(root, 'absent.json'), ADMIN_TOKEN: 'patch-test-only' });
  try {
    const service = new SettingsService();
    service.setLanguages([{ iso: 'en', name: 'English' }, { iso: 'ru', name: 'Русский' }]);
    for (const iso of ['en', 'ru']) service.setProjects(iso, [project('a'), project('b')], [project('c')]);
    await run(service, new AppController(service, {}));
  } finally {
    for (const [key, value] of Object.entries(previous)) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    rmSync(root, { recursive: true, force: true });
  }
}

test('only edited cases are sent; drafts, publication and stale revisions remain safe', () => fixture(async (service, controller) => {
  const before = service.getProjectWorkspace();
  const after = clone(before.groups);
  after[0].items[0].info.summary = 'One small edit';
  const changes = workspaceChanges(before.groups, after);
  assert.deepEqual(changes, [{ iso: 'en', upserts: [after[0].items[0]] }]);
  const saved = await controller.PatchProjectWorkspace(auth, { changes, revision: before.revision, publish: false });
  assert.deepEqual(service.getProjectWorkspace().groups, after);
  assert.equal(service.getAll().projects[0].items[0].info.summary, undefined);
  await assert.rejects(controller.PatchProjectWorkspace(auth, { changes, revision: before.revision, publish: false }), /другой вкладке/);
  assert.deepEqual(workspaceChanges(after, clone(after)), []);
  await controller.PatchProjectWorkspace(auth, { changes: [], revision: saved.revision, publish: true });
  assert.deepEqual(service.getAll().projects, after);
  const initial = service.getChangeHistory().find(entry => entry.action === 'Исходная версия');
  service.restoreChange(initial.id);
  assert.deepEqual(service.getProjectWorkspace().groups, before.groups);
}));

test('reordering, archive, restore, creation and deletion send only IDs and new cases', () => fixture(async (service, controller) => {
  let before = service.getProjectWorkspace();
  let after = clone(before.groups);
  for (const group of after) { group.archive.push(group.items.shift()); group.items.unshift(project('new')); }
  let changes = workspaceChanges(before.groups, after);
  assert.ok(changes.every(change => change.upserts.length === 1 && change.upserts[0].id === 'new'));
  assert.deepEqual(changes[0].order, { items: ['new', 'b'], archive: ['c', 'a'] });
  await controller.PatchProjectWorkspace(auth, { changes, revision: before.revision, publish: false });
  assert.deepEqual(service.getProjectWorkspace().groups, after);
  before = service.getProjectWorkspace(); after = clone(before.groups);
  for (const group of after) { group.items = [group.items[1], group.archive[1]]; group.archive = [group.archive[0]]; }
  changes = workspaceChanges(before.groups, after);
  assert.ok(changes.every(change => change.upserts.length === 0));
  await controller.PatchProjectWorkspace(auth, { changes, revision: before.revision, publish: true });
  assert.deepEqual(service.getAll().projects, after);
}));

test('malformed changes and invalid publication cannot partially save data', () => fixture(async (service, controller) => {
  const before = service.getProjectWorkspace();
  const cases = [
    null,
    [{ iso: 'unknown', upserts: [] }],
    [{ iso: 'en', upserts: [] }, { iso: 'en', upserts: [] }],
    [{ iso: 'en', upserts: [project('a'), project('a')] }],
    [{ iso: 'en', upserts: [], order: { items: ['missing'], archive: [] } }],
    [{ iso: 'en', upserts: [], order: { items: ['a', 'a'], archive: ['c'] } }],
    [{ iso: 'en', upserts: [project('orphan')] }],
    [{ iso: 'en', upserts: [], order: { items: ['b', 'a'], archive: ['c'] } }],
    [{ iso: 'en', upserts: [{ id: 'a' }] }],
  ];
  for (const changes of cases) {
    await assert.rejects(controller.PatchProjectWorkspace(auth, { changes, revision: before.revision, publish: false }));
    assert.deepEqual(service.getProjectWorkspace(), before);
  }
  const after = clone(before.groups); after[0].items[0].info.title = '';
  await assert.rejects(controller.PatchProjectWorkspace(auth, { changes: workspaceChanges(before.groups, after), revision: before.revision, publish: true }), /заполните/);
  assert.deepEqual(service.getProjectWorkspace(), before);
  await assert.rejects(controller.PatchProjectWorkspace(undefined, { changes: [], revision: 0, publish: true }), /Unauthorized/);
}));
