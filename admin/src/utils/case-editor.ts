import type { CaseBlock, CaseBlockType, SettingsType } from '../api'
export type Project = SettingsType['projects'][number]['items'][number]
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value))
export const types:{type:CaseBlockType;label:string}[]=[{type:'heading',label:'Подзаголовок'},{type:'carousel',label:'Карусель изображений'},{type:'video',label:'Видео'},{type:'image',label:'Одно изображение'},{type:'slides',label:'Слайды'},{type:'gallery',label:'Галерея'},{type:'text-image',label:'Текст + изображение'},{type:'numbers',label:'Числа'},{type:'mentions',label:'Упоминания в СМИ'},{type:'text-text',label:'Текст + текст'},{type:'text',label:'Текст'},{type:'iframe',label:'IFrame (эмбед)'},{type:'team-thanks',label:'Команда и благодарность'},{type:'team',label:'Команда'},{type:'thanks',label:'Благодарность'}]
export const relapImages=['/media/201ae73f06-AxPUbHM.png','/media/e451bafff3-4jxEpQm.png','/media/9f122975ca-8c6ULR0.png','/media/9089d85d80-XgEdQ4u.png','/media/85ac7ea324-wAyClRG.png']
export const relapNumbers=[{value:'#1',text:'Native Advertising network in Russian Internet (2018)'},{value:'>600',text:'Creative promos and special projects designed'},{value:'12',text:"New advertising formats invented, 4 of them made it to production and formed most of Relap’s revenue"},{value:'3',text:'Designers developed from entry-level to senior level'}]
export const newBlock=(type:CaseBlockType):CaseBlock=>({id:crypto.randomUUID(),type,title:hasTextFields(type)?types.find(item=>item.type===type)?.label||'':'',text:'',secondaryTitle:'',secondaryText:'',images:[],video:'',iframe:'',items:[],syncMedia:true})
export const legacyBlocks=(item:Project):CaseBlock[]=>{const blocks:CaseBlock[]=[];const isRelap=(item.info.link||'').includes('relap.io')||/^(relap|релап)(\.io)?$/i.test(item.info.title);if(isRelap){['Brandbook','Website','AdRoom'].forEach(title=>blocks.push({...newBlock('carousel'),title,images:[...relapImages]}));blocks.push({...newBlock('numbers'),title:'Numbers',items:relapNumbers.map(number=>({...number}))})}else{const media=item.info.images.slice(1).map(image=>image.link);if(media.length)blocks.push({...newBlock('carousel'),title:'',images:media})}const copyBlocks=item.details.content.slice(1);for(let index=0;index<copyBlocks.length;index++){const content=copyBlocks[index],title=content.title.toLowerCase(),next=copyBlocks[index+1],isTeam=title.includes('team')||title.includes('команд');if(isTeam&&next&&(next.title.toLowerCase().includes('thank')||next.title.toLowerCase().includes('благодар'))){blocks.push({...newBlock('team-thanks'),title:content.title,text:content.text,secondaryTitle:next.title,secondaryText:next.text});index++;continue}blocks.push({...newBlock(title.includes('thank')||title.includes('благодар')?'thanks':isTeam?'team':'text'),title:content.title,text:content.text})}return blocks}
export const normalize=(item:Project)=>{item.rules={...item.rules,nda:item.rules.nda??false,details:item.rules.details??true,showTitle:item.rules.showTitle??Boolean(item.info.logo)};item.info.images ||= [];if(!item.info.images.length)item.info.images.push({link:''});item.details.theme={...item.details.theme,background:item.details.theme.background||'#000000',textColor:item.details.theme.textColor||'#FFFFFF',accentColor:item.details.theme.accentColor||'#2FC1CB'};item.details.content ||= [];item.details.content[0] ||= {title:'',text:''};const isRelap=(item.info.link||'').includes('relap.io')||/^(relap|релап)(\.io)?$/i.test(item.info.title);item.details.industry ??= isRelap?'AdTech':item.details.content[0].title.split(',')[0]?.trim()||'';item.details.tags ||= isRelap?['Branding','Web','Product']:item.details.content[0].title.split(',').slice(1).map(tag=>tag.trim()).filter(Boolean);if(!item.details.blocks)item.details.blocks=legacyBlocks(item);for(const block of item.details.blocks){block.id ||= crypto.randomUUID();block.images ||= [];block.items ||= [];block.syncMedia ??= true}return item}
export const createProject=():Project=>normalize({rules:{nda:false,ndaPassword:'',details:true,showTitle:false,syncMedia:true},info:{title:'',year:'',link:'',images:[{link:''}]},details:{industry:'',tags:[],theme:{background:'#000',textColor:'#fff',accentColor:'#2fc1cb'},content:[{title:'',text:''}],blocks:[]}})
export const usesImages=(type:CaseBlockType)=>['carousel','image','slides','gallery','text-image'].includes(type)
export const previewHasMedia=(type:CaseBlockType)=>['carousel','video','image','slides','gallery','text-image','iframe','mentions'].includes(type)
export const hasTextFields=(type:CaseBlockType)=>['heading','text-image','numbers','mentions','text-text','text','team-thanks','team','thanks'].includes(type)

export const blockLabel = (type: CaseBlockType) => types.find(item => item.type === type)?.label || type
export const blockGroups = [
  { title: 'Текст', types: ['heading', 'text', 'text-text', 'text-image'] },
  { title: 'Медиа', types: ['image', 'gallery', 'carousel', 'slides', 'video', 'iframe'] },
  { title: 'Доказательства', types: ['numbers', 'mentions', 'team', 'team-thanks', 'thanks'] },
]
export const descriptions: Record<string, string> = {
  heading: 'Раздел истории', text: 'Абзацы и пояснения', 'text-text': 'Две текстовые колонки', 'text-image': 'Решение рядом с иллюстрацией',
  image: 'Один крупный кадр', gallery: 'Сетка изображений', carousel: 'Горизонтальная лента', slides: 'Один кадр со сменой слайдов',
  video: 'Файл или YouTube / Vimeo', iframe: 'Интерактивный прототип', numbers: 'Результаты с периодом и источником',
  mentions: 'Ссылки на публикации', team: 'Люди и их роли', 'team-thanks': 'Команда и благодарности', thanks: 'Благодарности',
}
export function normalizeGroups(groups: SettingsType['projects']) {
  for (const group of groups) {
    group.archive ||= []
    for (const project of [...group.items, ...group.archive]) {
      const legacy = !project.details.blocks
      normalize(project)
      project.details.blocks?.forEach(block => block.items?.forEach((item, index) => { item.id ||= `${block.id}-item-${index}` }))
      if (legacy) project.details.blocks?.forEach((block, index) => { block.id = `${project.id}-${index}-${block.type}` })
    }
  }
  // Existing explicit blocks may have locale-specific IDs. Align legacy positional
  // counterparts once in the loaded snapshot; all editing thereafter uses identity.
  const base = groups.find(group => group.iso === 'en') || groups[0]
  for (const key of ['items', 'archive'] as const) for (const source of base?.[key] || []) {
    for (const group of groups) {
      const target = group[key]?.find(project => project.id === source.id)
      if (!target || target === source) continue
      target.details.blocks?.forEach((block, index) => {
        const other = source.details.blocks?.[index]
        if (other?.type === block.type && !source.details.blocks?.some(item => item.id === block.id)) block.id = other.id
      })
    }
  }
}
export function syncProject(groups: SettingsType['projects'], iso: string, source: Project, settings: SettingsType) {
  for (const group of groups) {
    if (group.iso === iso) continue
    const target = group.items.find(project => project.id === source.id)
    if (!target) continue
    target.rules = clone(source.rules)
    target.info.logo = source.info.logo
    target.info.year = source.info.year
    target.info.link = source.info.link
    target.info.images = clone(source.info.images)
    target.details.theme = clone(source.details.theme)
    const categories = settings.biography.find(bio => bio.iso === iso)?.categories || []
    const translated = settings.biography.find(bio => bio.iso === group.iso)?.categories || []
    target.details.tags = (source.details.tags || []).map(tag => translated[categories.indexOf(tag)] || tag)
    target.details.blocks = (source.details.blocks || []).map(block => {
      const existing = target.details.blocks?.find(item => item.id === block.id)
      const next = existing ? clone(existing) : { ...newBlock(block.type), id: block.id, title: '', text: '' }
      next.type = block.type
      next.spacing = block.spacing
      next.hidden = block.hidden
      next.syncMedia = block.syncMedia
      if (block.syncMedia !== false) {
        next.images = clone(block.images || [])
        next.video = block.video
        next.iframe = block.iframe
        next.poster = block.poster
      }
      if (['numbers', 'mentions', 'team'].includes(block.type)) {
        next.items = (block.items || []).map((item, index) => {
          const translated = existing?.items?.find(entry => entry.id === item.id) || (!existing?.items?.[index]?.id ? existing?.items?.[index] : undefined)
          const row = translated ? clone(translated) : {value:'',text:''}
          row.id = item.id
          if (block.type === 'numbers') row.value = item.value
          if (block.type === 'mentions') { row.link = item.link; if (block.syncMedia !== false) row.image = item.image }
          return row
        })
      }
      return next
    })
  }
}
export function moveProject(groups: SettingsType['projects'], id: string, targetId: string) {
  for (const group of groups) {
    const from = group.items.findIndex(project => project.id === id)
    const to = group.items.findIndex(project => project.id === targetId)
    if (from < 0 || to < 0) continue
    const [project] = group.items.splice(from, 1)
    group.items.splice(to, 0, project)
  }
}
export const templates = [
  { id: 'blank', label: 'Пустой кейс', sections: [] },
  { id: 'product', label: 'Продукт', sections: ['Контекст и задача', 'Моя роль', 'Проблема', 'Ключевые решения', 'Проверка и результат'] },
  { id: 'brand', label: 'Брендинг', sections: ['Задача', 'Моя роль', 'Концепция', 'Визуальная система', 'Применение и результат'] },
  { id: 'direction', label: 'Арт-дирекшн', sections: ['Масштаб и ограничения', 'Моя ответственность', 'Организация работы', 'Реализация', 'Результат'] },
  { id: 'personal', label: 'Личный проект', sections: ['Идея', 'Работающий результат', 'Ключевые решения', 'Развитие'] },
]
export const templateEnglish: Record<string, string> = {
  'Контекст и задача': 'Context and challenge', 'Моя роль': 'My role', 'Проблема': 'Problem', 'Ключевые решения': 'Key decisions',
  'Проверка и результат': 'Validation and results', 'Задача': 'Challenge', 'Концепция': 'Concept', 'Визуальная система': 'Visual system',
  'Применение и результат': 'Applications and results', 'Масштаб и ограничения': 'Scope and constraints', 'Моя ответственность': 'My responsibilities',
  'Организация работы': 'Team and process', 'Реализация': 'Implementation', 'Результат': 'Results', 'Идея': 'Idea', 'Работающий результат': 'Working product', 'Развитие': 'Next steps',
}

// Presentation is independent of content: changing the layout never rebuilds a block.
export function changeMediaLayout(block: CaseBlock, type: CaseBlockType) {
  const layouts: CaseBlockType[] = ['carousel', 'slides', 'gallery']
  if (layouts.includes(block.type) && layouts.includes(type)) block.type = type
}
