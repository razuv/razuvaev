import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeGroups, syncProject, moveProject } from '../admin/src/utils/case-editor.ts';
const project = (id, title, text) => ({id,rules:{details:true,nda:false},info:{title,year:'2026',link:'',images:[{link:'/media/cover.png'}]},details:{content:[{title:'',text}],theme:{background:'#000',textColor:'#fff'},tags:[],blocks:[{id:'block-'+id,type:'text',title,text}]}});
const fixture = () => ({languages:[{iso:'en',name:'English'},{iso:'ru',name:'Русский'}],biography:[{iso:'en',categories:[]},{iso:'ru',categories:[]}],projects:[{iso:'en',items:[project('a','Alpha','English A'),project('b','Beta','English B')],archive:[]},{iso:'ru',items:[project('a','Альфа','Русский A'),project('b','Бета','Русский B')],archive:[]}]});
test('reorder is shared and later edits follow identity, retaining translated copy',()=>{
  const data=fixture(); normalizeGroups(data.projects);
  moveProject(data.projects,'b','a');
  assert.deepEqual(data.projects.map(group=>group.items.map(p=>p.id)),[['b','a'],['b','a']]);
  const source=data.projects[0].items[0];source.details.theme.background='#123456';source.details.blocks[0].text='Updated English';
  syncProject(data.projects,'en',source,data);
  assert.equal(data.projects[1].items[0].details.theme.background,'#123456');
  assert.equal(data.projects[1].items[0].details.blocks[0].text,'Русский B');
  assert.equal(data.projects[1].items[1].details.theme.background,'#000');
});
test('block reorder, removal and locale media overrides do not destroy translations',()=>{
  const data=fixture(),source=data.projects[0].items[0],target=data.projects[1].items[0];
  source.details.blocks.push({id:'image',type:'image',images:['english.png'],syncMedia:false});
  target.details.blocks.push({id:'image',type:'image',images:['russian.png'],caption:'Подпись'});
  source.details.blocks.reverse();syncProject(data.projects,'en',source,data);
  assert.equal(target.details.blocks[0].images[0],'russian.png');
  assert.equal(target.details.blocks[0].caption,'Подпись');
  assert.equal(target.details.blocks[1].text,'Русский A');
  source.details.blocks=source.details.blocks.slice(0,1);syncProject(data.projects,'en',source,data);
  assert.equal(target.details.blocks.length,1);
});
