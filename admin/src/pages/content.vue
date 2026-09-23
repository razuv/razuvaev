<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getSettings, saveBiography, type SettingsType, type Social } from '@/api'
import { defaultCv, defaultFooter } from '../../../ui/src/data/profile'
import MediaInput from '@/components/MediaInput.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

type Biography = SettingsType['biography'][number]
const props = defineProps<{ section: 'cv' | 'footer' }>()
const route = useRoute()
const settings = ref<SettingsType>()
const current = ref<Biography>()
const loading = ref(true), saving = ref(false), error = ref(''), savedAt = ref('')
const snapshot = ref(''), leaveOpen = ref(false)
let resolveLeave: ((allowed: boolean) => void) | undefined
const activeIso = computed(() => String(route.query.lang || settings.value?.languages[0]?.iso || 'en'))
const dirty = computed(() => !!current.value && JSON.stringify(current.value) !== snapshot.value)
const contactTypes: Social[] = ['email', 'telegram', 'linkedin', 'dribble', 'medium', 'behance', 'facebook']
const newContactType = ref<Social>('email')
const open = (iso: string) => {
  if (!settings.value) return
  const existing = settings.value.biography.find(item => item.iso === iso)
  const bio: Biography = existing ? JSON.parse(JSON.stringify(existing)) : { iso, text: '', contacts: [], feed: [] }
  bio.cv = { ...defaultCv(iso), intro: (bio.text || '').replace(/You can contact me using the links below:|Связаться со мной можно по ссылкам ниже:/gi, '').trim() || defaultCv(iso).intro, ...bio.cv }
  bio.footer = { ...defaultFooter(iso), ...bio.footer }
  current.value = bio
  snapshot.value = JSON.stringify(bio)
  error.value = ''
  savedAt.value = ''
}
const load = async () => {
  try { settings.value = await getSettings(true); open(activeIso.value) }
  catch (e) { error.value = e instanceof Error ? e.message : 'Ошибка загрузки' }
  finally { loading.value = false }
}
watch(activeIso, iso => { if (settings.value) open(iso) })
const save = async () => {
  if (!current.value || !settings.value) return false
  const payload: Biography = JSON.parse(JSON.stringify(current.value))
  saving.value = true; error.value = ''
  try {
    await saveBiography(payload)
    const index = settings.value.biography.findIndex(item => item.iso === payload.iso)
    if (index >= 0) settings.value.biography[index] = payload
    else settings.value.biography.push(payload)
    snapshot.value = JSON.stringify(payload)
    savedAt.value = new Date().toLocaleTimeString('ru', { hour: '2-digit', minute: '2-digit' })
    return true
  } catch (e) { error.value = e instanceof Error ? e.message : 'Ошибка сохранения'; return false }
  finally { saving.value = false }
}
const guard = () => {
  if (!dirty.value) return true
  leaveOpen.value = true
  return new Promise<boolean>(resolve => { resolveLeave = resolve })
}
onBeforeRouteLeave(guard)
onBeforeRouteUpdate((to, from) => to.query.lang !== from.query.lang || to.path !== from.path ? guard() : true)
const finishLeave = (allowed: boolean) => { leaveOpen.value = false; resolveLeave?.(allowed) }
const beforeUnload = (event: BeforeUnloadEvent) => { if (dirty.value) { event.preventDefault(); event.returnValue = '' } }
onMounted(() => { window.addEventListener('beforeunload', beforeUnload); load() })
onBeforeUnmount(() => window.removeEventListener('beforeunload', beforeUnload))
const addContact = () => {
  if (!current.value || current.value.contacts.some(item => item.type === newContactType.value)) return
  current.value.contacts.push({ type: newContactType.value, link: '', visible: true })
}
</script>
<template>
  <p v-if="loading" class="status">Загрузка…</p>
  <p v-else-if="!current" class="status" role="alert">{{error}}</p>
  <form v-else class="content-editor" @submit.prevent="save">
    <template v-if="props.section === 'cv' && current.cv">
      <h1>CV · {{activeIso.toUpperCase()}}</h1>
      <section class="panel"><h2 class="section-title">Вступление</h2>
        <label class="field"><span>Заголовок</span><input v-model="current.cv.title" class="control"></label>
        <label class="field"><span>О себе</span><textarea v-model="current.cv.intro" class="control" rows="5"/></label>
        <label class="field"><span>Подход к работе</span><textarea v-model="current.cv.approach" class="control" rows="5"/></label>
      </section>
      <section class="panel"><h2 class="section-title">Пилюли</h2>
        <div v-for="(_,index) in current.cv.highlights" :key="index" class="row"><input v-model="current.cv.highlights[index]" class="control" :aria-label="'Пилюля '+(index+1)"><button type="button" class="text-button" @click="current.cv.highlights.splice(index,1)">Удалить</button></div>
        <button type="button" class="pill pill--outline" @click="current.cv.highlights.push('')">Добавить пилюлю</button>
      </section>
      <section class="panel"><h2 class="section-title">Опыт работы</h2><label class="field"><span>Заголовок раздела</span><input v-model="current.cv.history" class="control"></label>
        <article v-for="(job,index) in current.cv.roles" :key="index" class="entry"><div class="entry-heading"><strong>Место работы {{index+1}}</strong><button type="button" class="text-button" @click="current.cv.roles.splice(index,1)">Удалить</button></div><div class="pair"><label class="field"><span>Компания</span><input v-model="job.company" class="control"></label><label class="field"><span>Период</span><input v-model="job.period" class="control"></label></div><label class="field"><span>Должность</span><input v-model="job.role" class="control"></label><label class="field"><span>Описание</span><textarea v-model="job.text" class="control" rows="4"/></label><label class="field"><span>Сайт компании</span><input v-model="job.link" class="control" placeholder="https://"></label></article>
        <button type="button" class="pill pill--outline" @click="current.cv.roles.push({company:'',period:'',role:'',text:'',link:''})">Добавить место работы</button>
      </section>
      <section class="panel"><h2 class="section-title">Инструменты</h2><label class="field"><span>Заголовок раздела</span><input v-model="current.cv.toolsTitle" class="control"></label>
        <article v-for="(tool,index) in current.cv.tools" :key="index" class="tool-entry"><label class="field"><span>Название</span><input v-model="tool.name" class="control"></label><label class="field"><span>Иконка</span><MediaInput v-model="tool.icon" label="SVG, PNG или JPEG" accept="image/*" preview/></label><button type="button" class="text-button" @click="current.cv.tools.splice(index,1)">Удалить</button></article>
        <button type="button" class="pill pill--outline" @click="current.cv.tools.push({name:'',icon:''})">Добавить инструмент</button>
      </section>
    </template>
    <template v-else-if="props.section === 'footer' && current.footer">
      <h1>Футер · {{activeIso.toUpperCase()}}</h1>
      <section class="panel"><h2 class="section-title">Текст</h2><label class="field"><span>Заголовок</span><input v-model="current.footer.title" class="control"></label><label class="field"><span>Описание</span><textarea v-model="current.footer.text" class="control" rows="4"/></label><label class="field"><span>Подпись ссылки на CV</span><input v-model="current.footer.cvLabel" class="control"></label></section>
      <section class="panel"><h2 class="section-title">Контакты</h2><article v-for="contact in current.contacts" :key="contact.type" class="contact-entry"><div class="entry-heading"><strong>{{contact.type}}</strong><button type="button" class="text-button" @click="current.contacts=current.contacts.filter(item=>item!==contact)">Удалить</button></div><label class="field"><span>Ссылка или адрес</span><input v-model="contact.link" class="control"></label><label class="toggle"><input v-model="contact.visible" type="checkbox"> Показывать на сайте</label></article><div class="row"><select v-model="newContactType" class="control" aria-label="Новый контакт"><option v-for="type in contactTypes" :key="type" :value="type">{{type}}</option></select><button type="button" class="pill pill--outline" @click="addContact">Добавить</button></div></section>
    </template>
    <div class="save-bar"><span role="status">{{error || (dirty ? 'Есть несохранённые изменения' : savedAt ? 'Сохранено · '+savedAt : 'Все изменения сохранены')}}</span><button class="pill pill--light" :disabled="saving || !dirty">{{saving?'Сохраняю…':'Сохранить'}}</button></div>
    <ConfirmDialog :open="leaveOpen" title="Сохранить изменения?" description="Изменения ещё не сохранены." confirm-label="Сохранить" secondary-label="Не сохранять" @confirm="async()=>{if(await save())finishLeave(true)}" @secondary="finishLeave(true)" @cancel="finishLeave(false)"/>
  </form>
</template>
<style scoped>
.content-editor{max-width:900px;padding-bottom:100px}.content-editor h1{font-size:32px;font-weight:400;margin:0 0 32px}.panel{margin-bottom:40px}.field{margin-bottom:16px}.row,.entry-heading{display:flex;align-items:center;gap:12px;margin-bottom:12px}.row .control{flex:1}.entry,.contact-entry,.tool-entry{padding:20px 0;border-bottom:1px solid #343434}.entry-heading{justify-content:space-between}.entry-heading strong{font-weight:400}.pair{display:grid;grid-template-columns:1fr 1fr;gap:16px}.tool-entry{display:grid;grid-template-columns:minmax(180px,1fr) minmax(180px,1fr) auto;gap:16px;align-items:end}.contact-entry .toggle{display:flex;gap:8px;align-items:center}.save-bar{position:fixed;right:20px;bottom:20px;z-index:10;display:flex;align-items:center;gap:12px;background:#151515;padding:10px 12px;border-radius:12px}.status{color:#aaa}@media(max-width:719px){.pair,.tool-entry{display:block}.row{flex-wrap:wrap}.save-bar{right:16px;bottom:16px}}
</style>
