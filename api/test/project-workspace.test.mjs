import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { SettingsService } from '../dist/settings/settings.service.js';
import { AppController } from '../dist/app.controller.js';
const root=mkdtempSync(join(tmpdir(),'portfolio-workspace-test-'));
process.env.SETTINGS_DB_PATH=join(root,'settings.db');
process.env.SETTINGS_PATH=join(root,'absent.json');
process.env.ADMIN_TOKEN='workspace-test-only';
const service=new SettingsService();
service.setLanguages([{iso:'en',name:'English'},{iso:'ru',name:'Русский'}]);
for(const iso of ['en','ru'])service.setProjects(iso,[{info:{title:iso,images:[{link:'cover.png'}]},rules:{details:true},details:{content:[],theme:{}}}],[]);
const controller=new AppController(service,{});
test('drafts remain private, publish is atomic and stale revisions are rejected',async()=>{
  const workspace=service.getProjectWorkspace();
  assert.equal(workspace.groups[0].items[0].id,workspace.groups[1].items[0].id);
  workspace.groups[0].items[0].info.title='Draft title';
  const saved=service.saveProjectWorkspace(workspace.groups,workspace.revision);
  assert.equal(service.getAll().projects[0].items[0].info.title,'en');
  assert.equal(new SettingsService().getProjectWorkspace().groups[0].items[0].info.title,'Draft title');
  assert.throws(()=>service.saveProjectWorkspace(workspace.groups,workspace.revision,true),/другой вкладке/);
  assert.equal(service.getAll().projects[0].items[0].info.title,'en');
  service.saveProjectWorkspace(workspace.groups,saved.revision,true);
  assert.equal(service.getAll().projects[0].items[0].info.title,'Draft title');
  assert.equal(service.getAll().projects[1].items[0].info.title,'ru');
});
test('private draft endpoints require authorization and reject inconsistent translations',async()=>{
  await assert.rejects(controller.GetProjectWorkspace(undefined),/Unauthorized/);
  await assert.rejects(controller.SaveProjectWorkspace('Bearer wrong',{}),/Unauthorized/);
  await assert.rejects(controller.GetChangeHistory(undefined),/Unauthorized/);
  await assert.rejects(controller.RestoreChange('Bearer wrong','1'),/Unauthorized/);
  const workspace=service.getProjectWorkspace();
  workspace.groups[1].items[0].id='wrong';
  await assert.rejects(controller.SaveProjectWorkspace('Bearer workspace-test-only',{...workspace,publish:false}),/Порядок и состав/);
});
test('publication validates missing titles before touching the public site',async()=>{
  const workspace=service.getProjectWorkspace();workspace.groups[0].items[0].info.title='';
  await assert.rejects(controller.SaveProjectWorkspace('Bearer workspace-test-only',{...workspace,publish:true}),/заполните/);
  assert.equal(service.getAll().projects[0].items[0].info.title,'Draft title');
});
test('JSON migration keeps existing archived cases',()=>{
  const seedRoot=mkdtempSync(join(tmpdir(),'portfolio-archive-seed-'));
  const previousDb=process.env.SETTINGS_DB_PATH;
  const previousPath=process.env.SETTINGS_PATH;
  try {
    process.env.SETTINGS_DB_PATH=join(seedRoot,'settings.db');
    process.env.SETTINGS_PATH=join(seedRoot,'settings.json');
    writeFileSync(process.env.SETTINGS_PATH,JSON.stringify({
      languages:[{iso:'en',name:'English'}],biography:[],
      projects:[{iso:'en',items:[],archive:[{id:'archived-case',info:{title:'Kept case'}}]}],
    }));
    const seeded=new SettingsService();
    assert.deepEqual(seeded.getAll().projects[0].archive,[{id:'archived-case',info:{title:'Kept case'}}]);
    assert.deepEqual(new SettingsService().getAll().projects[0].archive,[{id:'archived-case',info:{title:'Kept case'}}]);
  } finally {
    process.env.SETTINGS_DB_PATH=previousDb;
    process.env.SETTINGS_PATH=previousPath;
    rmSync(seedRoot,{recursive:true,force:true});
  }
});
test('dated history restores published cases, drafts and archived cases without deleting later versions',()=>{
  const historyRoot=mkdtempSync(join(tmpdir(),'portfolio-history-test-'));
  const previousDb=process.env.SETTINGS_DB_PATH;
  const previousPath=process.env.SETTINGS_PATH;
  try {
    process.env.SETTINGS_DB_PATH=join(historyRoot,'settings.db');
    process.env.SETTINGS_PATH=join(historyRoot,'absent.json');
    const historyService=new SettingsService();
    historyService.setLanguages([{iso:'en',name:'English'}]);
    const original={id:'case-1',info:{title:'Original',images:[{link:'cover.png'}]},rules:{details:true},details:{content:[],theme:{}}};
    const archived={...original,id:'archived-1',info:{...original.info,title:'Archived'}};
    historyService.setProjects('en',[original],[archived]);
    const workspace=historyService.getProjectWorkspace();
    workspace.groups[0].items[0].info.title='Updated';
    const draft=historyService.saveProjectWorkspace(workspace.groups,workspace.revision);
    historyService.saveProjectWorkspace(workspace.groups,draft.revision,true);
    const versions=historyService.getChangeHistory().filter(entry=>entry.scope==='project-workspace');
    assert.equal(versions.length,3);
    assert.ok(versions.every(entry=>!Number.isNaN(Date.parse(entry.createdAt))));
    assert.equal(historyService.getAll().projects[0].items[0].info.title,'Updated');
    historyService.restoreChange(versions.at(-1).id);
    assert.equal(historyService.getAll().projects[0].items[0].info.title,'Original');
    assert.equal(historyService.getAll().projects[0].archive[0].info.title,'Archived');
    assert.equal(historyService.getProjectWorkspace().groups[0].items[0].info.title,'Original');
    assert.equal(historyService.getChangeHistory().filter(entry=>entry.scope==='project-workspace').length,4);
    historyService.setBiography('en',{iso:'en',text:'Before'});
    historyService.saveBiography('en',{iso:'en',text:'After'});
    const originalBio=historyService.getChangeHistory().find(entry=>entry.scope==='biography:en'&&entry.action==='Исходная версия');
    historyService.restoreChange(originalBio.id);
    assert.equal(historyService.getBiography('en').text,'Before');
  } finally {
    process.env.SETTINGS_DB_PATH=previousDb;
    process.env.SETTINGS_PATH=previousPath;
    rmSync(historyRoot,{recursive:true,force:true});
  }
});
process.on('exit',()=>rmSync(root,{recursive:true,force:true}));
