<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, useRoute } from 'vue-router'
import { getSettings, getProjectWorkspace, saveProjectWorkspace, type CaseBlock, type CaseBlockType, type SettingsType } from '@/api'
import { clone, changeMediaLayout, normalizeGroups, newBlock, createProject, syncProject, moveProject, blockLabel, blockGroups, descriptions, types, templates, templateEnglish, usesImages, previewHasMedia, hasTextFields } from '@/utils/case-editor'
import MediaInput from '@/components/MediaInput.vue'
import MediaBatch from '@/components/MediaBatch.vue'
import ColorInput from '@/components/ColorInput.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const route = useRoute()
const settings = ref<SettingsType>(), published = ref<SettingsType['projects']>([])
const loading = ref(true), saving = ref(false), error = ref(''), savedSnapshot = ref(''), revision = ref(0), savedAt = ref('')
const selectedId = ref(''), selectedBlock = ref('hero'), search = ref(''), archiveOpen = ref(false)
const createOpen = ref(false), templateId = ref('blank'), newTitle = ref('')
const pickerAt = ref<number | null>(null), publishOpen = ref(false), previewOpen = ref(false), previewWidth = ref(390)
const logoFormat=ref('image/svg+xml')
const frame = ref<HTMLIFrameElement>(), dragged = ref(''), draggedBlock = ref('')
const past = ref<string[]>([]), future = ref<string[]>([])
let autosave: ReturnType<typeof setTimeout> | undefined, historyTimer: ReturnType<typeof setTimeout> | undefined
let restoring = false, syncing = false, activeSave: Promise<boolean> | undefined
const activeIso = computed(() => String(route.query.lang || settings.value?.languages[0]?.iso || 'en'))
const groups = computed(() => settings.value?.projects || [])
const locale = computed(() => groups.value.find(group => group.iso === activeIso.value) || groups.value[0])
const project = computed(() => locale.value?.items.find(item => item.id === selectedId.value))
const blocks = computed(() => project.value?.details.blocks || [])
const block = computed(() => blocks.value.find(item => item.id === selectedBlock.value))
const availableTags = computed(() => settings.value?.biography.find(item => item.iso === activeIso.value)?.categories || [])
const filtered = computed(() => (locale.value?.items || []).filter(item => item.info.title.toLowerCase().includes(search.value.toLowerCase())))
const snapshot = computed(() => JSON.stringify(groups.value))
const dirty = computed(() => !!savedSnapshot.value && snapshot.value !== savedSnapshot.value)
const publishedSnapshot = computed(() => JSON.stringify(published.value))
const unpublished = computed(() => !!settings.value && snapshot.value !== publishedSnapshot.value)
const status = computed(() => saving.value ? 'Сохраняется…' : error.value ? 'Не удалось сохранить' : dirty.value ? 'Есть несохранённые изменения' : savedAt.value ? `Черновик сохранён · ${new Date(savedAt.value).toLocaleTimeString('ru', {hour:'2-digit',minute:'2-digit'})}` : 'Черновик сохранён')
const projectStatus = (id?: string) => {
  const existing = published.value.some(group => group.items.some(item => item.id === id))
  if (!existing) return 'Черновик'
  return groups.value.some(group => JSON.stringify(group.items.find(item => item.id === id)) !== JSON.stringify(published.value.find(old => old.iso === group.iso)?.items.find(item => item.id === id))) ? 'Есть изменения' : 'Опубликован'
}
const changes = computed(() => {
  const result: string[] = []
  for (const item of locale.value?.items || []) if (projectStatus(item.id) !== 'Опубликован') result.push(`${item.info.title || 'Без названия'} — ${projectStatus(item.id).toLowerCase()}`)
  for (const item of published.value.find(group => group.iso === activeIso.value)?.items || []) if (!locale.value?.items.some(current => current.id === item.id)) result.push(`${item.info.title} — снять с публикации`)
  if (JSON.stringify(locale.value?.items.map(item => item.id)) !== JSON.stringify(published.value.find(group => group.iso === activeIso.value)?.items.map(item => item.id))) result.push('Обновить порядок карточек во всех языках')
  if (!result.length && unpublished.value) result.push('Обновить архив')
  return result
})
const issues = computed(() => groups.value.flatMap(group => group.items.flatMap(item => [
  ...(!item.info.title.trim() ? [`${group.iso.toUpperCase()}: заполните название кейса`] : []),
  ...(!item.info.images[0]?.link ? [`${group.iso.toUpperCase()} · ${item.info.title || 'Кейс'}: добавьте обложку`] : []),
  ...(item.rules.nda && !item.rules.ndaPassword?.trim() ? [`${group.iso.toUpperCase()} · ${item.info.title}: задайте пароль NDA`] : []),
])))
const mediaLibrary = computed(() => [...new Set(groups.value.flatMap(group => [...group.items, ...(group.archive || [])].flatMap(item => [...item.info.images.map(image => image.link), ...(item.details.blocks || []).flatMap(block => block.images || [])])))].filter(Boolean))
const archive = computed(() => locale.value?.archive || [])
const confirmation = ref<{title:string;description:string;action:()=>void} | null>(null)
const ask = (title:string, description:string, action:()=>void) => { confirmation.value = {title,description,action} }
const confirm = () => { confirmation.value?.action(); confirmation.value = null }
const select = (id:string) => { selectedId.value = id; selectedBlock.value = 'hero' }
const jump = (id:string) => { selectedBlock.value = id; nextTick(() => document.querySelector('.editor-panel')?.scrollIntoView({behavior:'smooth',block:'start'})) }

async function load() {
  loading.value = true
  try {
    const [data, workspace] = await Promise.all([getSettings(true), getProjectWorkspace()])
    normalizeGroups(workspace.groups); normalizeGroups(workspace.published)
    settings.value = {...data, projects: workspace.groups}
    published.value = workspace.published
    revision.value = workspace.revision; savedAt.value = workspace.updatedAt
    savedSnapshot.value = JSON.stringify(workspace.groups)
    past.value = [savedSnapshot.value]
    selectedId.value = workspace.groups[0]?.items[0]?.id || ''
  } catch (e) { error.value = e instanceof Error ? e.message : 'Ошибка загрузки' }
  finally { loading.value = false }
}
function remember() {
  clearTimeout(historyTimer)
  if (past.value.at(-1) !== snapshot.value) { past.value.push(snapshot.value); if (past.value.length > 40) past.value.shift() }
}
function undo() {
  remember()
  if (past.value.length < 2 || !settings.value) return
  restoring = true; future.value.push(past.value.pop()!); settings.value.projects = JSON.parse(past.value.at(-1)!); restoring = false
}
function redo() {
  if (!future.value.length || !settings.value) return
  restoring = true; const value = future.value.pop()!; past.value.push(value); settings.value.projects = JSON.parse(value); restoring = false
}
watch(project, (value, previous) => {
  if (!settings.value || !value || value !== previous || syncing || restoring || loading.value) return
  syncing = true
  try { syncProject(groups.value, activeIso.value, value, settings.value) } finally { syncing = false }
}, { deep:true, flush:'sync' })
watch(snapshot, () => {
  if (loading.value) return
  clearTimeout(autosave)
  if (!restoring) { future.value = []; clearTimeout(historyTimer); historyTimer = setTimeout(remember, 500) }
  if (dirty.value) autosave = setTimeout(() => save(), 1500)
  nextTick(sendPreview)
}, {flush:'sync'})
watch(activeIso, () => nextTick(sendPreview))
watch(selectedId, () => nextTick(sendPreview))
watch(blocks, () => { if (selectedBlock.value !== 'hero' && !blocks.value.some(item => item.id === selectedBlock.value)) selectedBlock.value = 'hero' })
async function save(publish = false): Promise<boolean> {
  clearTimeout(autosave)
  if (activeSave) { await activeSave; if (publish || dirty.value) return save(publish); return !error.value }
  if (!settings.value) return false
  const payload = clone(groups.value), sent = JSON.stringify(payload)
  saving.value = true; error.value = ''
  activeSave = (async () => {
    try {
      const result = await saveProjectWorkspace(payload, revision.value, publish)
      revision.value = result.revision; savedAt.value = result.updatedAt; savedSnapshot.value = sent
      if (publish) { published.value = payload; publishOpen.value = false }
      return true
    } catch (e) { error.value = e instanceof Error ? e.message : 'Ошибка сохранения'; return false }
    finally { saving.value = false; activeSave = undefined }
  })()
  return activeSave
}
function addProject() {
  if (!settings.value) return
  remember()
  const id = crypto.randomUUID(), template = templates.find(item => item.id === templateId.value)!
  const ids = template.sections.map(() => crypto.randomUUID())
  for (const group of groups.value) {
    const item = createProject(); item.id = id; item.info.title = group.iso === activeIso.value ? newTitle.value.trim() : ''
    item.details.blocks = template.sections.map((title,index) => ({...newBlock('text'),id:ids[index],title:group.iso==='ru'?title:group.iso==='en'?templateEnglish[title]:''}))
    group.items.unshift(item)
  }
  select(id); createOpen.value = false; newTitle.value = ''
}
function archiveProject() {
  if (!project.value) return
  const id = project.value.id
  ask('Переместить кейс в архив?', 'Посетители перестанут видеть кейс после публикации изменений. Переводы сохранятся.', () => {
    for (const group of groups.value) { const index = group.items.findIndex(item => item.id === id); if (index >= 0) (group.archive ||= []).push(...group.items.splice(index,1)) }
    select(locale.value?.items[0]?.id || '')
  })
}
function restore(id?:string) {
  for (const group of groups.value) { const index = group.archive?.findIndex(item => item.id === id) ?? -1; if (index >= 0) group.items.push(...group.archive!.splice(index,1)) }
  select(id || ''); archiveOpen.value = false
}
function deleteArchived(id?:string) {
  ask('Удалить из архива?', 'Удаление сохранится в черновике. До закрытия редактора его можно отменить.', () => {
    for (const group of groups.value) group.archive = (group.archive || []).filter(item => item.id !== id)
  })
}
function addBlock(type:CaseBlockType) {
  if (!project.value) return
  const item = newBlock(type); item.title = ''; item.items = []
  if (type === 'team') item.title = activeIso.value === 'ru' ? 'Команда' : 'Team'
  project.value.details.blocks!.splice(pickerAt.value ?? blocks.value.length, 0, item)
  pickerAt.value = null; selectedBlock.value = item.id
}
function moveBlock(id:string, offset:number) {
  const index = blocks.value.findIndex(item => item.id === id), to = index + offset
  if (index < 0 || to < 0 || to >= blocks.value.length) return
  // Assign once so translation synchronization never sees a transient deletion.
  const next = clone(blocks.value), [item] = next.splice(index,1); next.splice(to,0,item); project.value!.details.blocks = next
}
function dropBlock(targetId:string) { const from=blocks.value.findIndex(item=>item.id===draggedBlock.value), to=blocks.value.findIndex(item=>item.id===targetId); if(from>=0&&to>=0)moveBlock(draggedBlock.value,to-from); draggedBlock.value='' }
function duplicate() { if (!block.value) return; const copy=clone(block.value); copy.id=crypto.randomUUID(); project.value!.details.blocks!.splice(blocks.value.findIndex(item=>item.id===block.value!.id)+1,0,copy); selectedBlock.value=copy.id }
function setSpacing(value:string) { if(block.value)block.value.spacing=value===''?undefined:Math.max(0,Math.min(240,Number(value)||0)) }
function addItem() { block.value?.items?.push({id:crypto.randomUUID(),value:'',text:''}) }
function removeBlock() { if (!block.value) return; project.value!.details.blocks=blocks.value.filter(item=>item.id!==selectedBlock.value); selectedBlock.value='hero' }
function exportBackup() {
  const url=URL.createObjectURL(new Blob([JSON.stringify(groups.value,null,2)],{type:'application/json'}))
  const link=document.createElement('a'); link.href=url; link.download='portfolio-draft.json'; link.click(); URL.revokeObjectURL(url)
}
const previewUrl = `${location.pathname}#/preview`
function sendPreview() { if (project.value) frame.value?.contentWindow?.postMessage({type:'case-preview',project:clone(project.value),language:activeIso.value},location.origin) }
function receivePreview(event:MessageEvent) {
  if (event.origin !== location.origin || event.source !== frame.value?.contentWindow) return
  if (event.data?.type === 'case-preview-ready') sendPreview()
  if (event.data?.type === 'case-preview-select') { selectedBlock.value=event.data.id; previewOpen.value=false }
}
function keyboard(event:KeyboardEvent) { if ((event.ctrlKey||event.metaKey)&&event.key==='s') {event.preventDefault();save()} if(event.key==='Escape'){pickerAt.value=null;createOpen.value=false;previewOpen.value=false;publishOpen.value=false} }
const leaveOpen=ref(false)
let leaveResolve:((value:boolean)=>void)|undefined
onBeforeRouteLeave(async () => { if (!dirty.value) return true; leaveOpen.value=true; return new Promise<boolean>(resolve=>{leaveResolve=resolve}) })
function discardLeave() { clearTimeout(autosave); finishLeave(true) }
function finishLeave(value:boolean) {leaveOpen.value=false;leaveResolve?.(value)}
const beforeUnload=(event:BeforeUnloadEvent)=>{if(dirty.value){event.preventDefault();event.returnValue=''}}
onMounted(()=>{load();window.addEventListener('beforeunload',beforeUnload);window.addEventListener('message',receivePreview);window.addEventListener('keydown',keyboard)})
onBeforeUnmount(()=>{clearTimeout(autosave);clearTimeout(historyTimer);window.removeEventListener('beforeunload',beforeUnload);window.removeEventListener('message',receivePreview);window.removeEventListener('keydown',keyboard)})
</script>

<template>
  <p v-if="loading" class="status" role="status">Загружаю кейсы…</p>
  <div v-else-if="!settings" class="empty"><h1>Не удалось открыть редактор</h1><p role="alert">{{error}}</p><button class="pill" @click="load">Повторить</button></div>
  <div v-else class="workspace">
    <header class="workspace-toolbar">
      <div><h1>Кейсы</h1><p role="status" :class="{'error-text':error}">{{status}}</p></div>
      <div class="toolbar-actions">
        <button class="pill" :disabled="past.length<2 && !dirty" @click="undo" title="Отменить изменение"><span class="history-icon"><img :src="'/assets/icons/icon-undo-white.svg'" class="icon-white" alt=""><img :src="'/assets/icons/icon-undo-black.svg'" class="icon-black" alt=""></span>Отменить</button>
        <button class="pill" :disabled="!future.length" @click="redo" title="Повторить изменение" aria-label="Повторить изменение"><span class="history-icon"><img :src="'/assets/icons/icon-redo-white.svg'" class="icon-white" alt=""><img :src="'/assets/icons/icon-redo-black.svg'" class="icon-black" alt=""></span></button>
        <button class="pill" :disabled="saving||!dirty" @click="save()">Сохранить черновик</button>
        <button class="pill pill--light" :disabled="!unpublished||saving" @click="publishOpen=true">Опубликовать изменения</button>
      </div>
    </header>
    <div v-if="error" class="error-banner" role="alert">{{error}} <button class="text-button" @click="save()">Повторить</button> <button class="text-button" @click="exportBackup">Скачать резервную копию</button></div>
    <div class="editor-layout">
      <aside class="project-sidebar">
        <label class="field"><span>Найти кейс</span><input v-model="search" class="control" type="search" placeholder="Название проекта"></label>
        <button class="pill pill--outline add-case" @click="createOpen=true"><img class="admin-icon" src="/assets/icons/icon-plus.svg" alt="" aria-hidden="true"> Создать кейс</button>
        <div class="project-list">
          <button v-for="item in filtered" :key="item.id" class="project-row" :class="{'is-active':selectedId===item.id}" draggable="true" @dragstart="dragged=item.id!" @dragover.prevent @drop.prevent="moveProject(groups,dragged,item.id!);dragged=''" @click="select(item.id!)">
            <span>{{item.info.title||'Без названия'}}</span><small>{{projectStatus(item.id)}}<span v-if="item.rules.nda"> · NDA</span></small>
          </button>
          <p v-if="!filtered.length" class="muted">{{search?'Ничего не найдено':'Кейсов пока нет'}}</p>
        </div>
        <button class="text-button archive-button" @click="archiveOpen=!archiveOpen">Архив · {{archive.length}}</button>
        <div v-if="archiveOpen" class="archive-list"><p v-if="!archive.length" class="muted">Архив пуст</p><article v-for="item in archive" :key="item.id"><strong>{{item.info.title||'Без названия'}}</strong><button class="text-button" @click="restore(item.id)">Восстановить</button><button class="text-button danger" @click="deleteArchived(item.id)">Удалить</button></article></div>
      </aside>
      <main v-if="project" class="case-workspace">
        <div class="case-heading"><div><p class="eyebrow">{{projectStatus(project.id)}} · {{activeIso.toUpperCase()}}</p><h2>{{project.info.title||'Новый кейс'}}</h2></div><button class="pill pill--outline" @click="previewOpen=true">Предпросмотр <img class="admin-icon" src="/assets/icons/icon-ext-white.svg" alt="" aria-hidden="true"></button></div>
        <div class="translation-bar" aria-label="Переводы"><span v-for="group in groups" :key="group.iso">{{group.iso.toUpperCase()}} · {{group.items.find(item=>item.id===selectedId)?.info.title.trim() ? 'название заполнено' : 'нужен перевод'}}</span></div>
        <div class="case-columns">
          <nav class="outline" aria-label="Структура кейса">
            <h3>Структура кейса</h3>
            <button :class="{'is-active':selectedBlock==='hero'}" @click="jump('hero')">Первый экран</button>
            <button class="insert-button" @click="pickerAt=0"><img class="admin-icon" src="/assets/icons/icon-plus.svg" alt="" aria-hidden="true"> Добавить блок</button>
            <template v-for="(item,index) in blocks" :key="item.id">
              <button class="outline-block" :class="{'is-active':selectedBlock===item.id,'is-hidden':item.hidden}" draggable="true" @dragstart="draggedBlock=item.id" @dragover.prevent @drop.prevent="dropBlock(item.id)" @click="jump(item.id)"><small>{{index+1}} · {{blockLabel(item.type)}}{{item.hidden?' · скрыт':''}}</small><span>{{item.title||descriptions[item.type]}}</span></button>
              <button class="insert-button" :aria-label="'Добавить блок после '+(index+1)" @click="pickerAt=index+1"><img class="admin-icon" src="/assets/icons/icon-plus.svg" alt="" aria-hidden="true"></button>
            </template>
            <p v-if="!blocks.length" class="muted">Расскажите о задаче, своей роли и результате.</p>
          </nav>
          <section :key="activeIso+selectedId+selectedBlock" class="editor-panel">
            <template v-if="selectedBlock==='hero'">
              <div class="panel-heading"><h3>Первый экран</h3><button class="text-button danger" @click="archiveProject">В архив</button></div>
              <p class="hint">Название и описание относятся к {{activeIso.toUpperCase()}}. Логотип, обложка, год, цвета и доступ общие для всех переводов.</p>
              <div class="identity-grid"><label class="field"><span>Название</span><input v-model="project.info.title" class="control" placeholder="Название проекта"></label><label class="field"><span>Год</span><input v-model="project.info.year" class="control" placeholder="2026"></label></div>
              <label class="toggle"><input v-model="project.rules.showTitle" type="checkbox"> Показывать заголовок в начале кейса</label>
              <label class="field"><span>Краткое описание</span><textarea v-model="project.details.content[0].text" class="control" rows="6" placeholder="Что это за проект, какую задачу решали и за что отвечали вы?"></textarea></label>
              <label class="field"><span>Отрасль</span><input v-model="project.details.industry" class="control" placeholder="Например, EdTech"></label>
              <fieldset class="tag-options"><legend>Категории работ</legend><label v-for="tag in availableTags" :key="tag"><input v-model="project.details.tags" type="checkbox" :value="tag">{{tag}}</label></fieldset>
              <label class="field"><span>Сайт проекта</span><input v-model="project.info.link" class="control" type="url" placeholder="https://"></label>
              <label class="field"><span>Короткая подпись карточки · {{activeIso.toUpperCase()}}</span><input v-model="project.info.summary" class="control" placeholder="Задача и ваша роль в одном предложении"></label>
              <div class="field"><span>Логотип в начале кейса</span><select v-model="logoFormat" class="control" aria-label="Формат логотипа"><option value="image/svg+xml">SVG · векторный логотип</option><option value="image/png">PNG · с прозрачным фоном</option></select><MediaInput v-model="project.info.logo" label="Логотип SVG или PNG" :accept="logoFormat" preview/><small class="hint">Перетащите файл или выберите его. Без логотипа показывается название проекта. Обложка ниже остаётся только в списке работ.</small><button v-if="project.info.logo" class="text-button" @click="project.info.logo=''">Убрать логотип</button></div>
              <label class="field"><span>Размещение на главной</span><select v-model="project.rules.listing" class="control"><option :value="undefined">Автоматически · по дате</option><option value="default">Основной список</option><option value="featured">Избранный проект</option><option value="archive">Архив ранних работ</option></select></label>
              <div class="field"><span>Обложка карточки на главной</span><MediaInput v-model="project.info.images[0].link" label="Обложка" accept="image/*" preview :library="mediaLibrary"/></div>
              <details class="settings-section"><summary>Оформление</summary><div class="colors"><label class="field"><span>Фон</span><ColorInput v-model="project.details.theme.background"/></label><label class="field"><span>Текст</span><ColorInput v-model="project.details.theme.textColor"/></label><label class="field"><span>Акцент</span><ColorInput v-model="project.details.theme.accentColor!"/></label></div></details>
              <details class="settings-section"><summary>Доступ и порядок</summary><label class="toggle"><input v-model="project.rules.details" type="checkbox">Открывать страницу кейса</label><label class="toggle"><input v-model="project.rules.nda" type="checkbox">Защитить паролем (NDA)</label><label v-if="project.rules.nda" class="field"><span>Пароль</span><input v-model="project.rules.ndaPassword" type="password" autocomplete="new-password" class="control"></label><div class="inline-actions"><button class="pill" :disabled="locale.items[0]?.id===project.id" @click="moveProject(groups,project.id!,locale.items[locale.items.indexOf(project)-1].id!)">Выше в списке</button><button class="pill" :disabled="locale.items.at(-1)?.id===project.id" @click="moveProject(groups,project.id!,locale.items[locale.items.indexOf(project)+1].id!)">Ниже в списке</button></div></details>
            </template>
            <template v-else-if="block">
              <div class="panel-heading"><h3>{{blockLabel(block.type)}}</h3><div class="inline-actions"><button class="pill" :disabled="blocks[0].id===block.id" @click="moveBlock(block.id,-1)" aria-label="Блок выше"><img class="admin-icon" src="/assets/icons/arrow-up-white.svg" alt="" aria-hidden="true"></button><button class="pill" :disabled="blocks.at(-1)?.id===block.id" @click="moveBlock(block.id,1)" aria-label="Блок ниже"><img class="admin-icon" src="/assets/icons/arrow-down-white.svg" alt="" aria-hidden="true"></button></div></div>
              <div class="inline-actions block-actions"><button class="text-button" @click="duplicate">Дублировать</button><button class="text-button" @click="block.hidden=!block.hidden">{{block.hidden?'Показать на сайте':'Скрыть на сайте'}}</button><button class="text-button danger" @click="removeBlock">Удалить</button></div>
              <p v-if="block.hidden" class="hint">Блок сохранён, но не показывается посетителям.</p>
              <label v-if="hasTextFields(block.type)||['carousel','gallery','slides','video','iframe'].includes(block.type)" class="field"><span>Заголовок</span><input v-model="block.title" class="control"></label>
              <label v-if="['text','text-image','text-text','thanks','team-thanks'].includes(block.type) || (block.type==='team' && block.text)" class="field"><span>Текст</span><textarea v-model="block.text" class="control" rows="8" placeholder="Объясните решение, свою роль или результат. Пустая строка разделяет абзацы."></textarea></label>
              <template v-if="['text-text','team-thanks'].includes(block.type)"><label class="field"><span>Второй заголовок</span><input v-model="block.secondaryTitle" class="control"></label><label class="field"><span>Второй текст</span><textarea v-model="block.secondaryText" class="control" rows="6"></textarea></label></template>
              <div v-if="previewHasMedia(block.type)" class="media-sync"><label class="toggle"><input v-model="block.syncMedia" type="checkbox">Одинаковые медиа во всех языках</label><small>Тексты и подписи остаются отдельными. Отключите для локализованных изображений.</small></div>
              <div v-if="usesImages(block.type)">
                <label v-if="['gallery','carousel','slides'].includes(block.type)" class="field"><span>Способ показа</span><select :value="block.type" class="control" @change="changeMediaLayout(block,($event.target as HTMLSelectElement).value as CaseBlockType)"><option value="gallery">Сетка</option><option value="carousel">Горизонтальная лента</option><option value="slides">Слайд-шоу</option></select></label>
                <MediaBatch v-if="!['image','text-image'].includes(block.type)" @uploaded="block.images!.push(...$event)"/>
                <div v-for="(image,index) in block.images" :key="block.id+'-'+index" class="media-item"><MediaInput v-model="block.images![index]" label="Изображение" accept="image/*" preview :library="mediaLibrary"/><div class="inline-actions"><button class="text-button" :disabled="index===0" @click="block.images!.splice(index-1,0,...block.images!.splice(index,1))"><img class="admin-icon" src="/assets/icons/arrow-left-white.svg" alt="" aria-hidden="true"> Выше</button><button class="text-button" :disabled="index===block.images!.length-1" @click="block.images!.splice(index+1,0,...block.images!.splice(index,1))">Ниже <img class="admin-icon" src="/assets/icons/arrow-right-white.svg" alt="" aria-hidden="true"></button><button class="text-button danger" @click="block.images!.splice(index,1)">Убрать</button></div></div>
                <button v-if="!['image','text-image'].includes(block.type)||!block.images?.length" class="pill" @click="block.images!.push('')"><img class="admin-icon" src="/assets/icons/icon-plus.svg" alt="" aria-hidden="true"> Изображение по ссылке / из библиотеки</button>
                <label class="field"><span>Подпись под блоком</span><input v-model="block.caption" class="control" placeholder="Что важно заметить на этих изображениях?"></label><label class="field"><span>Описание изображения для доступности</span><input v-model="block.alt" class="control"></label>
              </div>
              <template v-if="block.type==='video'"><MediaInput v-model="block.video!" label="Видео или ссылка YouTube / Vimeo" accept="video/*" preview/><div class="field"><span>Постер для видеофайла</span><MediaInput v-model="block.poster!" label="Постер" accept="image/*" preview :library="mediaLibrary"/></div></template>
              <label v-if="block.type==='iframe'" class="field"><span>Ссылка или код вставки</span><textarea v-model="block.iframe" class="control" placeholder="https://… или <iframe …>"></textarea></label>
              <template v-if="['numbers','mentions','team'].includes(block.type)">
                <article v-for="(item,index) in block.items" :key="index" class="item-card">
                  <template v-if="block.type==='numbers'"><label class="field"><span>Значение</span><input v-model="item.value" class="control" placeholder="+25%"></label><label class="field"><span>Что измеряли</span><textarea v-model="item.text" class="control" placeholder="Рост завершённых регистраций"></textarea></label><label class="field"><span>Период / база сравнения</span><input v-model="item.period" class="control" placeholder="Май — июнь 2026, относительно…"></label><label class="field"><span>Источник и ограничения</span><input v-model="item.source" class="control" placeholder="Аналитика команды; результат всего перезапуска"></label></template>
                  <template v-else-if="block.type==='team'"><label class="field"><span>Имя</span><input v-model="item.text" class="control"></label><label class="field"><span>Роль и ответственность</span><input v-model="item.role" class="control" placeholder="Арт-директор — концепция и ревью"></label></template>
                  <template v-else><MediaInput v-model="item.image!" label="Логотип издания" accept="image/*" preview :library="mediaLibrary"/><label class="field"><span>Название публикации</span><input v-model="item.text" class="control"></label><label class="field"><span>Ссылка</span><input v-model="item.link" class="control" type="url"></label></template>
                  <button class="text-button danger" @click="block.items!.splice(index,1)">Удалить строку</button>
                </article>
                <button class="pill" @click="addItem"><img class="admin-icon" src="/assets/icons/icon-plus.svg" alt="" aria-hidden="true"> {{block.type==='team'?'Участник':block.type==='numbers'?'Результат':'Публикация'}}</button>
              </template>
              <details class="settings-section"><summary>Отступ после блока</summary><select class="control" :value="block.spacing===undefined?'default':String(block.spacing)" @change="block.spacing=($event.target as HTMLSelectElement).value==='default'?undefined:Number(($event.target as HTMLSelectElement).value)"><option value="default">Обычный · адаптивный</option><option value="24">Компактный · 24 px</option><option value="104">Большой · 104 px</option><option v-if="block.spacing!==undefined&&![24,104].includes(block.spacing)" :value="block.spacing">Свой · {{block.spacing}} px</option></select><label class="field"><span>Точное значение, px (необязательно)</span><input :value="block.spacing" class="control" type="number" min="0" max="240" @change="setSpacing(($event.target as HTMLInputElement).value)"></label></details>
            </template>
          </section>
        </div>
      </main>
      <main v-else class="empty"><h2>Начните с первого кейса</h2><p>Выберите структуру или создайте пустой кейс. Работа сохранится в черновике.</p><button class="pill pill--light" @click="createOpen=true">Создать кейс</button><button v-if="archive.length" class="text-button" @click="archiveOpen=true">Восстановить из архива</button></main>
    </div>
    <div v-if="createOpen" class="modal-backdrop" @click.self="createOpen=false"><section class="modal" role="dialog" aria-modal="true" aria-label="Новый кейс"><div class="panel-heading"><h2>Новый кейс</h2><button class="pill" @click="createOpen=false" aria-label="Закрыть"><img class="admin-icon" src="/assets/icons/icon-cross.svg" alt="" aria-hidden="true"></button></div><label class="field"><span>Название · {{activeIso.toUpperCase()}}</span><input v-model="newTitle" class="control" autofocus></label><label class="field"><span>Начальная структура</span><select v-model="templateId" class="control"><option v-for="item in templates" :key="item.id" :value="item.id">{{item.label}}</option></select></label><p class="hint">{{templates.find(item=>item.id===templateId)?.sections.join(' · ')||'Свободная структура — добавляйте любые блоки.'}}</p><p class="hint">Шаблон можно менять. Переводы создаются отдельно; публикация потребует названий и обложек.</p><button class="pill pill--light" @click="addProject">Создать черновик</button></section></div>
    <div v-if="pickerAt!==null" class="modal-backdrop" @click.self="pickerAt=null"><section class="modal block-library" role="dialog" aria-modal="true" aria-label="Добавить блок"><div class="panel-heading"><h2>Добавить блок</h2><button class="pill" @click="pickerAt=null" aria-label="Закрыть"><img class="admin-icon" src="/assets/icons/icon-cross.svg" alt="" aria-hidden="true"></button></div><section v-for="group in blockGroups" :key="group.title"><h3>{{group.title}}</h3><div class="block-options"><button v-for="type in types.filter(item=>group.types.includes(item.type))" :key="type.type" @click="addBlock(type.type)"><strong>{{type.label}}</strong><small>{{descriptions[type.type]}}</small></button></div></section></section></div>
    <div v-if="publishOpen" class="modal-backdrop" @click.self="publishOpen=false"><section class="modal" role="dialog" aria-modal="true" aria-label="Публикация изменений"><div class="panel-heading"><h2>Публикация</h2><button class="pill" @click="publishOpen=false" aria-label="Закрыть"><img class="admin-icon" src="/assets/icons/icon-cross.svg" alt="" aria-hidden="true"></button></div><p>На сайт попадут все сохранённые и текущие изменения кейсов во всех языках.</p><ul><li v-for="change in changes" :key="change">{{change}}</li></ul><div v-if="issues.length" class="error-banner"><strong>Перед публикацией</strong><ul><li v-for="issue in issues" :key="issue">{{issue}}</li></ul></div><button class="pill pill--light" :disabled="!!issues.length||saving" @click="save(true)">{{saving?'Публикую…':'Опубликовать все изменения'}}</button></section></div>
    <div v-if="previewOpen" class="preview-overlay" role="dialog" aria-modal="true" aria-label="Предпросмотр кейса"><header><strong>Предпросмотр · {{activeIso.toUpperCase()}}</strong><div class="inline-actions"><button class="pill" :class="{'pill--light':previewWidth===390}" @click="previewWidth=390">Телефон</button><button class="pill" :class="{'pill--light':previewWidth===1280}" @click="previewWidth=1280">Компьютер</button><button class="pill" @click="previewOpen=false">К редактированию <img class="admin-icon" src="/assets/icons/icon-cross.svg" alt="" aria-hidden="true"></button></div></header><p>Нажмите на блок страницы, чтобы перейти к его настройкам. Скрытые блоки не отображаются.</p><div class="preview-scroll"><iframe ref="frame" :src="previewUrl" :style="{width:previewWidth+'px'}" title="Предпросмотр страницы" @load="sendPreview"/></div></div>
    <ConfirmDialog :open="!!confirmation" :title="confirmation?.title||''" :description="confirmation?.description" @cancel="confirmation=null" @confirm="confirm"/>
    <ConfirmDialog :open="leaveOpen" title="Сохранить черновик перед выходом?" description="Есть изменения, которые ещё не записаны на сервер." confirm-label="Сохранить и выйти" secondary-label="Выйти без сохранения" @confirm="async()=>{if(await save())finishLeave(true)}" @secondary="discardLeave" @cancel="finishLeave(false)"/>
  </div>
</template>

<style scoped>
.workspace h1,.workspace h2,.workspace h3{margin:0;font-weight:400}.workspace h1{font-size:24px}.workspace h2{font-size:28px;line-height:36px}.workspace h3{font-size:17px}.workspace-toolbar{position:sticky;top:0;z-index:15;display:flex;justify-content:space-between;gap:20px;padding:16px 0;background:#000;border-bottom:1px solid #303030}.workspace-toolbar p{font-size:12px;margin:4px 0 0;color:#a8a8af}.toolbar-actions,.inline-actions{display:flex;align-items:center;gap:8px;flex-wrap:wrap}.editor-layout{display:grid;grid-template-columns:210px minmax(0,1fr);gap:28px;margin-top:24px}.project-sidebar{min-width:0}.project-list{display:grid;gap:4px;max-height:62vh;overflow:auto}.project-row{display:grid;gap:4px;padding:12px;border:1px solid transparent;border-radius:10px;background:transparent;color:#ddd;text-align:left;width:100%}.project-row>span{overflow-wrap:anywhere}.project-row small{color:#999;font-size:11px}.is-active{background:#202024!important;border-color:#555!important;color:#fff!important}.add-case{margin:16px 0;width:100%}.archive-button{margin:24px 0}.archive-list article{display:grid;gap:10px;margin-bottom:20px}.case-heading{display:flex;align-items:center;justify-content:space-between;gap:20px}.case-heading h2{overflow-wrap:anywhere}.eyebrow{font-size:12px;color:#aaa;margin:0 0 4px}.translation-bar{display:flex;flex-wrap:wrap;gap:12px;padding:16px 0;color:#a6a6af;font-size:12px}.case-columns{display:grid;grid-template-columns:180px minmax(0,1fr);gap:24px}.outline{position:sticky;top:100px;align-self:start;max-height:calc(100vh - 130px);overflow:auto}.outline h3{font-size:13px;margin:8px 0 12px;color:#aaa}.outline>button{display:grid;gap:3px;width:100%;padding:10px;border:1px solid transparent;border-radius:8px;background:transparent;color:#ddd;text-align:left}.outline-block span{font-size:13px;line-height:18px;overflow-wrap:anywhere}.outline-block small{font-size:10px;color:#999}.outline .insert-button{padding:4px 10px;color:#aaa;font-size:12px}.outline button:hover{background:#18181c}.is-hidden{opacity:.5}.editor-panel{padding:24px;border:1px solid #303034;border-radius:14px;background:#101012;min-width:0;scroll-margin-top:110px}.panel-heading{display:flex;align-items:center;justify-content:space-between;gap:16px;margin-bottom:20px}.editor-panel .field,.modal .field{margin:16px 0}.field>span{font-size:13px;color:#b7b7c0}.identity-grid{display:grid;grid-template-columns:minmax(0,1fr) 90px;gap:16px}.hint,.muted{color:#a4a4ad;font-size:13px;line-height:20px}.tag-options{border:0;margin:16px 0;padding:0;display:flex;gap:8px;flex-wrap:wrap}.tag-options legend{font-size:13px;color:#b7b7c0;margin-bottom:8px}.tag-options label{display:flex;align-items:center;gap:5px;padding:5px 8px;border-radius:8px;background:#242428;font-size:12px}.colors{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.settings-section{border-top:1px solid #303034;margin-top:24px;padding-top:16px}.settings-section summary{cursor:pointer;font-size:14px}.toggle{display:flex;align-items:center;gap:8px;margin:12px 0;font-size:14px}.toggle input{width:18px;height:18px}.danger{color:#ffa49c}.block-actions{padding-bottom:16px;border-bottom:1px solid #303034;gap:18px}.media-sync{padding:12px;background:#202024;border-radius:8px;margin:20px 0}.media-sync small{color:#aaa}.media-item,.item-card{border:1px solid #34343a;border-radius:10px;padding:16px;margin:16px 0}.media-item>.inline-actions{margin-top:12px}.error-banner{margin:16px 0;padding:16px;border:1px solid #b75b51;border-radius:10px;background:#2e1917;color:#ffc4bd;overflow-wrap:anywhere}.error-banner button{margin:8px}.error-text{color:#ffc4bd!important}.empty{padding:40px;display:grid;justify-items:start;align-content:start;gap:16px}.empty p{color:#aaa;max-width:440px}.modal-backdrop{position:fixed;inset:0;z-index:50;background:#000b;backdrop-filter:blur(8px);display:grid;place-items:center;padding:20px}.modal{width:min(620px,100%);max-height:90vh;overflow:auto;background:#161618;border:1px solid #444;border-radius:18px;padding:28px}.modal ul{padding-left:20px;font-size:14px}.block-library{width:min(760px,100%)}.block-library section{margin-top:24px}.block-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:12px}.block-options button{display:grid;gap:6px;padding:16px;text-align:left;background:#242428;color:#fff;border:1px solid #39393e;border-radius:10px}.block-options button:hover{border-color:#fff}.block-options small{color:#aaa}.preview-overlay{position:fixed;inset:0;z-index:60;background:#202024;display:flex;flex-direction:column;padding:16px;gap:12px}.preview-overlay header{display:flex;align-items:center;justify-content:space-between;gap:16px}.preview-overlay>p{margin:0;color:#bbb;font-size:12px}.preview-scroll{overflow:auto;flex:1;min-height:0;text-align:center}.preview-scroll iframe{height:100%;min-height:400px;border:0;background:#000;max-width:none;flex-shrink:0}.workspace button:disabled{opacity:.4;cursor:default}.workspace :is(button,input,select,textarea):focus-visible{outline:2px solid #ddd;outline-offset:3px}
@media(max-width:1100px){.case-columns{grid-template-columns:140px minmax(0,1fr);gap:16px}.editor-layout{grid-template-columns:170px minmax(0,1fr);gap:20px}.toolbar-actions{justify-content:flex-end}.workspace-toolbar{align-items:flex-start}.editor-panel{padding:16px}}
@media(max-width:850px){.editor-layout{grid-template-columns:1fr}.project-list{grid-template-columns:repeat(auto-fit,minmax(145px,1fr));max-height:300px;overflow-y:auto;overflow-x:hidden;padding:4px;border:1px solid #343434;border-radius:12px;scrollbar-color:#555 #151515}.project-row{min-width:0;width:100%}.project-sidebar>.field{max-width:300px}.add-case{width:auto;margin:12px 0}.archive-button{margin:12px 0}.case-columns{display:block}.outline{position:static;max-height:240px;margin-bottom:20px}.workspace-toolbar{position:relative;flex-direction:column}.toolbar-actions{justify-content:flex-start}}
@media(max-width:580px){.case-columns{display:block}.outline{position:static;max-height:240px;margin-bottom:20px}.case-heading{align-items:flex-start;flex-direction:column}.colors{grid-template-columns:1fr}.block-options{grid-template-columns:1fr}.modal{padding:20px}.preview-overlay header{flex-direction:column;align-items:flex-start}.toolbar-actions .pill{font-size:12px}.editor-panel{scroll-margin-top:20px}}
.history-icon{position:relative;display:inline-flex;width:20px;height:20px;flex:none}.history-icon img{width:20px;height:20px}.history-icon .icon-black{display:none}.toolbar-actions .pill{gap:6px}.toolbar-actions .pill:has(.history-icon):hover:not(:disabled){background:#fff;color:#000}.toolbar-actions .pill:hover:not(:disabled) .icon-white{display:none}.toolbar-actions .pill:hover:not(:disabled) .icon-black{display:block}
</style>
