<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { onBeforeRouteLeave, onBeforeRouteUpdate, useRoute } from 'vue-router'
import { getSettings, resolveMediaUrl, saveBiography, type HeroProofGroup, type SettingsType } from '@/api'
import MediaInput from '@/components/MediaInput.vue'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

type Biography=SettingsType['biography'][number]
const savedSnapshot=ref(''),savedAt=ref(''),leaveOpen=ref(false)
let resolveLeave:((value:boolean)=>void)|undefined
const dirty=computed(()=>!!current.value&&JSON.stringify(current.value)!==savedSnapshot.value)
const route=useRoute(),settings=ref<SettingsType>(),current=ref<Biography>(),loading=ref(true),saving=ref(false),error=ref('')
const dragged=ref<{group:'worked'|'featured';index:number}|null>(null)
const confirmation=ref<{title:string;description:string;action:()=>void}|null>(null)
const categoryDefaults:Record<string,string[]>={
  en:['Product','Communication','Web','Event','Art Direction','Branding','Pet Project'],
  ru:['Продукт','Коммуникация','Веб','Ивент','Арт-дирекшн','Брендинг','Личный проект'],
  sr:['Производ','Комуникациjа','Веб','Догађај','Арт дирекциjа','Брендинг','Лични проjекат'],
}
const copy=(iso:string)=>iso==='ru'?{title:'Привет,\nменя зовут Алексей.',subtitle:'Я мультидисциплинарный дизайнер и тимлид с опытом работы более десяти лет.',worked:'Работал с',featured:'Упомянут в'}:iso==='sr'?{title:'Здраво,\nзовем се Алексеј.',subtitle:'Мултидисциплинарни сам дизајнер и тим лидер са више од десет година искуства.',worked:'Радио са',featured:'Објављено у'}:{title:'Hello,\nmy name is Alexey.',subtitle:'I am a multidisciplinary designer and a team lead with over ten years of experience.',worked:'Worked with',featured:'Featured at'}
const emptyGroup=(label:string,type:'worked'|'featured'):HeroProofGroup=>type==='worked'?{label,tooltip:'',link:'https://team.vk.company/',items:[{image:'/assets/logos/vk.png',alt:'VK'},{image:'/assets/logos/strelka.png',alt:'STRELKA'},{image:'/assets/logos/relap.png',alt:'Relap'},{image:'/assets/logos/kion.png',alt:'KION'}]}:{label,tooltip:'',link:'https://t.me/cyrillicdesign',items:[{image:'/assets/logos/hitech.png',alt:'Hi-Tech Mail'},{image:'/assets/logos/vcru.png',alt:'vc.ru'},{image:'/assets/logos/tj.png',alt:'TJournal'},{image:'/assets/logos/cyrillic.png',alt:'Cyrillic'},{image:'/assets/logos/enter.png',alt:'Enter'},{image:'/assets/logos/blank.png',alt:'Blank Poster'}]}
const normalize=(bio:Biography):Biography=>{const c=copy(bio.iso),worked=emptyGroup(c.worked,'worked'),featured=emptyGroup(c.featured,'featured');return{...bio,categories:bio.categories||categoryDefaults[bio.iso]||categoryDefaults.en,contacts:bio.contacts||[],feed:bio.feed||[],hero:{title:bio.hero?.title||c.title,subtitle:bio.hero?.subtitle||c.subtitle,video:bio.hero?.video||'/assets/hero-video.mp4',worked:{...worked,...bio.hero?.worked,items:bio.hero?.worked?.items?.length?bio.hero.worked.items:worked.items},featured:{...featured,...bio.hero?.featured,items:bio.hero?.featured?.items?.length?bio.hero.featured.items:featured.items}}}}
const languages=computed(()=>settings.value?.languages||[])
const activeIso=computed(()=>String(route.query.lang||languages.value[0]?.iso||'en'))
const open=(iso:string)=>{if(!settings.value)return;let bio=settings.value.biography.find(item=>item.iso===iso);if(!bio){bio={iso,text:'',contacts:[],feed:[]};settings.value.biography.push(bio)}current.value=normalize(JSON.parse(JSON.stringify(bio)));savedSnapshot.value=JSON.stringify(current.value)}
const load=async()=>{try{settings.value=await getSettings(true);open(settings.value.languages.some(item=>item.iso===activeIso.value)?activeIso.value:settings.value.languages[0]?.iso||'en')}catch(e){error.value=e instanceof Error?e.message:'Ошибка загрузки'}finally{loading.value=false}}
watch(activeIso,iso=>{if(settings.value)open(iso)})
const save=async()=>{
  if(!settings.value||!current.value)return false
  const payload=JSON.parse(JSON.stringify(current.value)),sent=JSON.stringify(payload)
  saving.value=true;error.value=''
  try{
    await saveBiography(payload)
    const index=settings.value.biography.findIndex(item=>item.iso===payload.iso)
    if(index<0)settings.value.biography.push(payload);else settings.value.biography[index]=payload
    savedSnapshot.value=sent;savedAt.value=new Date().toLocaleTimeString('ru',{hour:'2-digit',minute:'2-digit'})
    return true
  }catch(e){error.value=e instanceof Error?e.message:'Ошибка сохранения';return false}finally{saving.value=false}
}
const guard=()=>{if(!dirty.value)return true;leaveOpen.value=true;return new Promise<boolean>(resolve=>resolveLeave=resolve)}
onBeforeRouteLeave(guard)
onBeforeRouteUpdate((to,from)=>to.query.lang!==from.query.lang?guard():true)
const finishLeave=(allowed:boolean)=>{leaveOpen.value=false;resolveLeave?.(allowed)}
const beforeUnload=(event:BeforeUnloadEvent)=>{if(dirty.value){event.preventDefault();event.returnValue=''}}
onMounted(()=>window.addEventListener('beforeunload',beforeUnload))
onBeforeUnmount(()=>window.removeEventListener('beforeunload',beforeUnload))

const addCategory=()=>current.value?.categories?.push('Новая категорию')
const addProof=(group:HeroProofGroup)=>group.items.push({image:'',alt:'',link:''})
const askDelete=(title:string,description:string,action:()=>void)=>{confirmation.value={title,description,action}}
const confirmDelete=()=>{confirmation.value?.action();confirmation.value=null}
const dropProof=(group:'worked'|'featured',target:number)=>{if(!current.value?.hero||dragged.value?.group!==group)return;const list=current.value.hero[group].items;const[item]=list.splice(dragged.value.index,1);list.splice(target,0,item);dragged.value=null}
onMounted(load)
</script>
<template>
  <p v-if="loading" class="status">Загрузка…</p><p v-else-if="error&&!current" class="status status--error">{{error}}</p>
  <form v-else-if="current&&current.hero" class="home-grid" @submit.prevent="save">
    <section class="panel panel--hero"><h2 class="section-title">Первый экран</h2><label class="field"><span>Заголовок H1</span><textarea v-model="current.hero.title" class="control" rows="2"/></label><label class="field"><span>Подзаголовок</span><textarea v-model="current.hero.subtitle" class="control" rows="3"/></label><label class="field"><span>Видео</span><MediaInput v-model="current.hero.video!" label="/assets/hero-video.mp4" accept="video/*"/></label></section>
    <section class="panel panel--categories"><h2 class="section-title">Категории работ</h2><div class="chips"><label v-for="(_,index) in current.categories" :key="index" class="chip"><input v-model="current.categories![index]"><button type="button" aria-label="Удалить категорию" @click="askDelete('Удалить категорию?',`«${current.categories![index]}» будет удалена из списка.`,()=>current!.categories!.splice(index,1))"><img :src="'/assets/icons/icon-cross.svg'" alt=""></button></label></div><button type="button" class="pill pill--outline" @click="addCategory"><img class="admin-icon" src="/assets/icons/icon-plus.svg" alt="" aria-hidden="true"> Добавить</button></section>
    <section v-for="groupKey in (['worked','featured'] as const)" :key="groupKey" class="panel" :class="'panel--'+groupKey"><h2 class="section-title">{{groupKey==='worked'?'Работал с':'Упомянут в'}}</h2><div class="proof-list"><article v-for="(item,index) in current.hero[groupKey].items" :key="index" class="proof" draggable="true" @dragstart="dragged={group:groupKey,index}" @dragover.prevent @drop.prevent="dropProof(groupKey,index)"><div class="proof-row"><img v-if="item.image" :src="resolveMediaUrl(item.image)" alt=""><span v-else class="proof-placeholder"><img class="admin-icon" src="/assets/icons/icon-plus.svg" alt="" aria-hidden="true"></span><MediaInput v-model="item.image" label="/assets/logo.png" accept="image/*"/><button type="button" class="proof-delete" @click="askDelete('Удалить логотип?','Логотип и связанная с ним ссылка будут удалены.',()=>current!.hero![groupKey].items.splice(index,1))">Удалить <img :src="'/assets/icons/icon-cross.svg'" alt=""></button></div><input v-model="item.link" class="control" placeholder="https://company.com"></article></div><button type="button" class="pill pill--outline" @click="addProof(current.hero[groupKey])"><img class="admin-icon" src="/assets/icons/icon-plus.svg" alt="" aria-hidden="true"> Добавить</button></section>
    <div class="save-bar"><span role="status">{{error||(dirty?'Есть несохранённые изменения':savedAt?'Сохранено · '+savedAt:'Все изменения сохранены')}}</span><button class="pill pill--light" :disabled="saving||!dirty">{{saving?'Сохраняю…':'Сохранить'}}</button></div>
    <ConfirmDialog :open="leaveOpen" title="Сохранить изменения главной?" description="Текущий текст ещё не сохранён. Смена языка без сохранения отменит правки." confirm-label="Сохранить" secondary-label="Не сохранять" @confirm="async()=>{if(await save())finishLeave(true)}" @secondary="finishLeave(true)" @cancel="finishLeave(false)"/>
    <ConfirmDialog :open="!!confirmation" :title="confirmation?.title||''" :description="confirmation?.description" @cancel="confirmation=null" @confirm="confirmDelete"/>
  </form>
</template>
<style scoped>
.home-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:16px 20px;align-items:start}.panel{min-width:0}.panel--hero{grid-column:1;grid-row:1}.panel--categories{grid-column:2;grid-row:1}.panel--worked{grid-column:3;grid-row:1}.panel--featured{grid-column:4;grid-row:1}.field{margin-bottom:16px}.chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:8px}.chip{display:flex;height:32px;border-radius:100px;background:#fff;color:#000;overflow:hidden}.chip input{width:auto;max-width:150px;border:0;background:transparent;padding:0 0 0 10px;color:#000}.chip button{display:grid;padding:0 6px 0 2px;place-items:center;border:0;background:none}.chip button:hover{background:#ddd}.chip button img{width:20px;height:20px;filter:invert(1)}.proof{margin-bottom:24px}.proof-row{display:grid;grid-template-columns:40px minmax(0,1fr);gap:8px;align-items:start}.proof-row>img,.proof-placeholder{display:grid;width:40px;height:40px;place-items:center;border-radius:50%;background:#0787ff;object-fit:contain}.proof-delete{display:inline-flex;grid-column:1/-1;width:max-content;align-items:center;gap:2px;border:0;background:none;color:#fff;padding:0;font-size:14px;line-height:20px}.proof-delete img{width:20px;height:20px}.save-bar{position:fixed;right:20px;bottom:20px;z-index:10;display:flex;align-items:center;gap:12px}.status{color:#888}.status--error{color:#ff8a80}
@media(max-width:1279px){.home-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.panel--hero{grid-column:1}.panel--categories{grid-column:3}.panel--worked{grid-column:1;grid-row:2}.panel--featured{grid-column:2;grid-row:2}}
@media(max-width:899px){.home-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.panel--hero{grid-column:1;grid-row:1}.panel--categories{grid-column:1;grid-row:2}.panel--worked{grid-column:2;grid-row:2}.panel--featured{grid-column:1;grid-row:3}}
@media(max-width:719px){.home-grid{display:flex;flex-direction:column;gap:32px}.panel{width:100%}.save-bar{right:16px;bottom:16px}}
</style>
