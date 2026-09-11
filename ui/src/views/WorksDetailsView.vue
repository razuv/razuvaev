<script setup lang="ts">
import { projectIndex, projectPath } from '../utils/project-links';
import { richText, embedSource } from "../utils/content";
import { computed, onUnmounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getData, getLanguageIso, resolveMediaUrl } from '../utils/api'
import { type CaseBlock, type SettingsType } from '../types/api.types'
import UiImage from '../components/ui/ui-image/UiImage.vue'
import CaseCarousel from '../components/ui/CaseCarousel.vue'
import LogoIcon from '../components/icons/LogoIcon.vue'
import { caseLayouts } from '../data/case-layouts'

const route=useRoute(),router=useRouter(),projects=ref<SettingsType['projects'][number]>(),currentProject=ref<SettingsType['projects'][number]['items'][number]>(),currentIndex=ref(-1)
const editorial=computed(()=>{const p=currentProject.value;return caseLayouts[(p?.info.link||'').includes('relap.io')||/^(relap|релап)(\.io)?$/i.test(p?.info.title||'')?'relap':'']})
const isVideoSource=(value:string)=>/\.(mp4|webm|mov|m4v)(?:[?#]|$)/i.test(value)||/vimeo\.com|youtube\.com|youtu\.be/i.test(value)
const legacyBlocks=computed<CaseBlock[]>(()=>{const p=currentProject.value;if(!p)return[];const result:CaseBlock[]=[];if(editorial.value){editorial.value.sections.forEach((section,index)=>result.push({id:'legacy-carousel-'+index,type:'carousel',title:section.title,images:section.images}));result.push({id:'legacy-numbers',type:'numbers',title:'Numbers',items:editorial.value.numbers})}else{const media=p.info.images.slice(1).map(image=>image.link),images=media.filter(image=>!isVideoSource(image)),videos=media.filter(image=>isVideoSource(image));if(images.length)result.push({id:'legacy-carousel',type:'carousel',images});videos.forEach((video,index)=>result.push({id:'legacy-video-'+index,type:'video',video}))}const copyBlocks=p.details.content.slice(1);for(let index=0;index<copyBlocks.length;index++){const content=copyBlocks[index],title=content.title.toLowerCase(),next=copyBlocks[index+1],isTeam=title.includes('team')||title.includes('команд');if(isTeam&&next&&(next.title.toLowerCase().includes('thank')||next.title.toLowerCase().includes('благодар'))){result.push({id:'legacy-credits-'+index,type:'team-thanks',title:content.title,text:content.text,secondaryTitle:next.title,secondaryText:next.text});index++;continue}result.push({id:'legacy-copy-'+index,type:title.includes('thank')||title.includes('благодар')?'thanks':isTeam?'team':'text',title:content.title,text:content.text})}return result})
const normalizeBlocks=(items:CaseBlock[])=>items.flatMap(block=>{if(block.type!=='carousel'||!block.images?.length)return[block];const images=block.images.filter(image=>!isVideoSource(image)),videos=block.images.filter(image=>isVideoSource(image));return[...(images.length?[{...block,images}]:[]),...videos.map((video,index)=>({id:`${block.id}-video-${index}`,type:'video' as const,title:'',video}))]})
const blocks=computed(()=>normalizeBlocks(currentProject.value?.details.blocks ?? legacyBlocks.value))
const caseTags=computed(()=>{
  const details=currentProject.value?.details
  const configured=[details?.industry||'',...(details?.tags||[])]
  const labels=configured.some(label=>label.trim())?configured:(editorial.value?.tags||[])
  const seen=new Set<string>()
  return labels.flatMap(label=>label.split(/[,;\n]/)).map(label=>label.trim()).filter(label=>{
    const key=label.normalize('NFKC').replace(/\s+/g,' ').toLowerCase()
    if(!key||seen.has(key))return false
    seen.add(key)
    return true
  })
})
const videoEmbedUrl=(value:string)=>{if(/player\.vimeo\.com\/video\//i.test(value))return value;const vimeo=value.match(/(?:vimeo\.com\/|vimeo\.com\/video\/)(\d+)/i);if(vimeo)return`https://player.vimeo.com/video/${vimeo[1]}`;const youtube=value.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/i);return youtube?`https://www.youtube.com/embed/${youtube[1]}`:''}
const isVideoEmbed=(value:string)=>!!videoEmbedUrl(value)
const changeAppColor=(background='inherit',color='inherit')=>{const app=document.querySelector('#app') as HTMLElement|null;if(app){app.style.backgroundColor=background;app.style.color=color}}
const adjacent=(direction:-1|1)=>{if(!projects.value)return;for(let i=currentIndex.value+direction;i>=0&&i<projects.value.items.length;i+=direction){if(projects.value.items[i].rules.details&&!projects.value.items[i].rules.nda)return{project:projects.value.items[i],index:i}}}
const previousProject=computed(()=>adjacent(-1)),nextProject=computed(()=>adjacent(1))
const isLightBackground=computed(()=>{const hex=currentProject.value?.details.theme.background||'#000000';const normalized=hex.replace('#','');if(!/^[0-9a-f]{6}$/i.test(normalized))return false;const [r,g,b]=[0,2,4].map(offset=>parseInt(normalized.slice(offset,offset+2),16)/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);return .2126*r+.7152*g+.0722*b>.45})
const load=()=>{projects.value=getData('projects') as SettingsType['projects'][number];const id=projectIndex(String(route.params.id)),project=projects.value.items[id],hasNdaAccess=!project?.rules.nda||sessionStorage.getItem(`nda-access:${getLanguageIso()}:${id}`)==='granted';if(Number.isInteger(id)&&project?.rules.details&&hasNdaAccess){currentIndex.value=id;currentProject.value=project;if(route.path!==projectPath(id))router.replace(projectPath(id));changeAppColor(project.details.theme.background||'#000',project.details.theme.textColor||'#fff')}else{currentProject.value=undefined;router.replace('/works')}}
watch(()=>route.params.id,load,{immediate:true});onUnmounted(()=>changeAppColor())
</script>
<template>
  <main v-if="currentProject" class="case" :class="{'case--light-background':isLightBackground}" :style="{backgroundColor:currentProject.details.theme.background||'#000',color:currentProject.details.theme.textColor||'#fff','--accent':currentProject.details.theme.accentColor||editorial?.accent||'#777'}">
    <section class="case-hero contained"><div class="case-intro"><h1>{{currentProject.info.title}}</h1><p v-if="currentProject.details.content[0]" v-html="richText(currentProject.details.content[0].text)"/><div v-if="caseTags.length" class="case-tags"><span v-for="tag in caseTags" :key="tag">{{tag}}</span></div></div><div class="case-cover"><UiImage :images="currentProject.info.images.slice(0,1).map(image=>image.link)" :gallery="false" :always-on="true"/></div></section>
    <div v-for="block in blocks" :key="block.id" class="case-block-slot" :style="block.spacing===undefined?undefined:{marginBottom:block.spacing+'px'}">
      <section v-if="block.type==='heading'" :data-block-type="block.type" class="case-block contained"><h2>{{block.title}}</h2></section>
      <section v-else-if="block.type==='carousel'" :data-block-type="block.type" class="case-block case-block--full"><h2 v-if="block.title" class="contained">{{block.title}}</h2><CaseCarousel v-if="block.images?.length" :images="block.images" :label="block.title||currentProject.info.title"/></section>
      <section v-else-if="block.type==='video'" :data-block-type="block.type" class="case-block contained"><h2 v-if="block.title">{{block.title}}</h2><iframe v-if="block.video&&isVideoEmbed(block.video)" class="video-embed" :src="videoEmbedUrl(block.video)" :title="block.title||'Video'" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen/><video v-else class="single-media" :src="resolveMediaUrl(block.video||'')" controls playsinline/></section>
      <section v-else-if="block.type==='image'" :data-block-type="block.type" class="case-block contained"><img class="single-media" :src="resolveMediaUrl(block.images?.[0]||'')" :alt="block.title||''"></section>
      <section v-else-if="block.type==='slides'" :data-block-type="block.type" class="case-block contained"><h2 v-if="block.title">{{block.title}}</h2><UiImage :images="block.images||[]" :gallery="true" :always-on="true"/></section>
      <section v-else-if="block.type==='gallery'" :data-block-type="block.type" class="case-block contained"><h2 v-if="block.title">{{block.title}}</h2><div class="gallery"><img v-for="image in block.images" :key="image" :src="resolveMediaUrl(image)" :alt="block.title||''"></div></section>
      <section v-else-if="block.type==='text-image'" :data-block-type="block.type" class="case-block contained split"><div><h2 v-if="block.title">{{block.title}}</h2><p v-html="richText((block.text||''))"/></div><img class="single-media" :src="resolveMediaUrl(block.images?.[0]||'')" :alt="block.title||''"></section>
      <section v-else-if="block.type==='numbers'" :data-block-type="block.type" class="case-block numbers contained"><h2 v-if="block.title">{{block.title}}</h2><div class="numbers-grid" :class="'numbers-grid--'+Math.min(block.items?.length||1,4)"><article v-for="item in block.items" :key="item.value"><strong>{{item.value}}</strong><p>{{item.text}}</p></article></div></section>
      <section v-else-if="block.type==='mentions'" :data-block-type="block.type" class="case-block mentions contained"><h2>{{block.title||(getLanguageIso()==='ru'?'Упоминания в СМИ':'Mentions in the media')}}</h2><div class="mentions__list"><a v-for="(item,index) in block.items" :key="item.link||index" class="mentions__item" :href="item.link||undefined" target="_blank" rel="noopener noreferrer"><img v-if="item.image" class="mentions__logo" :src="resolveMediaUrl(item.image)" alt=""><span>{{item.text}}</span><i class="mentions__arrow" aria-hidden="true"/></a></div></section>
      <section v-else-if="block.type==='text-text'||block.type==='team-thanks'" :data-block-type="block.type" class="case-block credits contained" :class="{'credits--thanks':block.type==='team-thanks'}"><div><h2>{{block.title||(getLanguageIso()==='ru'?'Команда':'Team')}}</h2><p v-html="richText((block.text||''))"/></div><div><h2>{{block.secondaryTitle||(getLanguageIso()==='ru'?'Спасибо':'Thank you')}}</h2><p v-html="richText((block.secondaryText||''))"/></div></section>
      <section v-else-if="block.type==='text'||block.type==='team'||block.type==='thanks'" :data-block-type="block.type" class="case-block contained copy"><h2 v-if="block.title">{{block.title}}</h2><p v-html="richText((block.text||''))"/></section>
      <section v-else-if="block.type==='iframe'" :data-block-type="block.type" class="case-block contained"><h2 v-if="block.title">{{block.title}}</h2><iframe v-if="embedSource(block.iframe)" class="embed" :src="embedSource(block.iframe)" sandbox="allow-scripts allow-popups allow-same-origin" referrerpolicy="no-referrer" :title="block.title||'Embedded content'" loading="lazy"/></section>
    </div>
    <nav class="case-navigation"><button v-if="previousProject" class="case-navigation__previous" @click="router.push(projectPath(previousProject.index))"><i class="case-navigation__arrow case-navigation__arrow--left"/><span>{{previousProject.project.info.title}}</span></button><button class="case-home" aria-label="На главную" @click="router.push('/works')"><LogoIcon/></button><button v-if="nextProject" class="case-navigation__next" @click="router.push(projectPath(nextProject.index))"><span>{{nextProject.project.info.title}}</span><i class="case-navigation__arrow case-navigation__arrow--right"/></button></nav>
  </main>
</template>
<style scoped lang="scss">
.case{--case-grid-gutter:118px;min-height:100vh;padding:67px 0 20px}.case :is(h1,h2,p,span){color:inherit}.contained{margin-left:var(--case-grid-gutter);margin-right:var(--case-grid-gutter)}.case-hero{display:grid;grid-template-columns:minmax(0,1fr) 474px;gap:36px;align-items:center;margin-bottom:72px}.case-intro h1{overflow-wrap:anywhere;margin:0 0 24px;font-size:80px;line-height:80px;font-weight:400;letter-spacing:0}.case-intro p,.copy p,.split p,.credits p{font-size:16px;line-height:24px}.case-cover{aspect-ratio:3/2;overflow:hidden;border-radius:8px}.case-cover :deep(.ui-image){width:100%;height:100%}.case-tags{display:flex;flex-wrap:wrap;gap:8px;margin-top:16px}.case-tags span{padding:4px 8px;border-radius:100px;background:rgba(0,0,0,.2);color:#fff;font-size:16px;line-height:24px}.case-tags span:first-child{background:var(--accent)}.case-block{margin-bottom:72px}.case-block h2{margin:0 0 24px;font-size:32px;line-height:40px;font-weight:400;letter-spacing:0}.single-media,.embed{display:block;width:100%;border:0;border-radius:8px}.embed{min-height:60vh}.gallery{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px}.gallery img{display:block;width:100%;border-radius:8px}.split,.credits{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:20px;align-items:start}.numbers{margin-top:104px}.numbers-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:20px;align-items:start}.numbers article{padding:16px;border-radius:8px;background:var(--accent);color:#fff}.numbers strong{display:block;margin-bottom:8px;font-size:56px;line-height:56px;font-weight:400}.numbers p{font-size:16px;line-height:24px;opacity:.8}.case-navigation{display:flex;justify-content:center;gap:8px;margin:48px 20px 0}.case-navigation button{display:flex;align-items:center;justify-content:center;gap:4px;height:32px;padding:0 8px;border:0;border-radius:100px;background:rgba(0,0,0,.3);color:#fff;backdrop-filter:blur(8px);font-size:16px;line-height:24px}.case-navigation svg{width:12px;height:12px;color:inherit}.previous{transform:rotate(-90deg)}.next{transform:rotate(90deg)}.grid-icon{display:grid;grid-template-columns:repeat(2,5px);gap:3px;padding:2px}.grid-icon i{width:5px;height:5px;border:1px solid currentColor}
@container page (width < 1440px){.case{--case-grid-gutter:20px;padding-top:0}.case-hero{grid-template-columns:minmax(0,1fr) 428px;gap:28px;margin-right:44px}.case-intro h1{margin-bottom:16px;font-size:56px;line-height:56px}}
@container page (width < 1080px){.case{padding-top:12px}.case-hero{display:flex;flex-direction:column-reverse;gap:32px;align-items:stretch;margin-right:20px;margin-bottom:40px}.case-block{margin-bottom:48px}.numbers-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.numbers{margin-top:80px}}
@container page (width < 720px){.case{--case-grid-gutter:16px;padding-top:0;padding-bottom:12px}.case-hero{gap:20px;margin-bottom:32px}.case-intro h1{margin-bottom:8px;font-size:32px;line-height:40px}.case-intro p,.copy p,.split p,.credits p,.numbers p{font-size:12px;line-height:20px}.case-tags span{padding:2px 8px;font-size:12px;line-height:20px}.case-block{margin-bottom:32px}.case-block h2{margin-bottom:16px;font-size:24px;line-height:32px}.gallery,.split,.credits{grid-template-columns:1fr}.numbers{margin-top:48px}.numbers-grid{gap:20px}.numbers strong{font-size:32px;line-height:32px}.case-navigation{margin-top:24px}.case-navigation button{white-space:nowrap}}
.video-embed{display:block;width:100%;aspect-ratio:16/9;border:0;border-radius:8px;background:#000}
.case-block--full > h2.contained{margin-left:0;margin-right:0;padding-left:var(--case-grid-gutter);padding-right:var(--case-grid-gutter)}
.case-navigation .case-home{width:32px;padding:4px}
.case-navigation .case-home svg{width:24px;height:24px}

/* Case references use fixed editorial grids at each breakpoint. */
@container page (width >= 1440px) {
  .case { width:100%; margin-inline:auto; --case-grid-gutter:40px; }
  .contained { margin-inline:40px; }
  .case-hero {
    grid-template-columns:repeat(12, minmax(0, 1fr));
    gap:20px;
  }
  .case-intro { grid-column:1 / span 6; }
  .case-cover { grid-column:8 / span 5; }
  .copy { width:670px; margin-left:auto; margin-right:auto; }
}

@container page (width >= 1080px) and (width < 1440px) {
  .case { width:100%; margin-inline:auto; --case-grid-gutter:40px; }
  .contained { margin-inline:40px; }
  .case-hero {
    grid-template-columns:repeat(9, minmax(0, 1fr));
    gap:20px;
  }
  .case-intro { grid-column:1 / span 5; }
  .case-cover { grid-column:6 / span 4; }
  .copy { width:546.6667px; margin-left:auto; margin-right:auto; }
}
.case-navigation button { background:rgba(255,255,255,.15); color:#fff; cursor:pointer; transition:background-color .18s ease,color .18s ease,transform .18s ease; }
.case--light-background .case-navigation button { background:rgba(0,0,0,.15); }
.case-navigation button:hover { background:#fff; color:#000; }
.case-navigation button:focus-visible { outline: 2px solid currentColor; outline-offset: 2px; }
.case-navigation button:active { transform: scale(.96); }
.case-navigation .previous,.case-navigation .next { transform: none; }
.case-navigation__arrow { display:block; width:20px; height:20px; flex:none; background:currentColor; -webkit-mask:center / contain no-repeat; mask:center / contain no-repeat; }
.case-navigation__arrow--left { -webkit-mask-image:url('/assets/icons/arrow-left-white.svg'); mask-image:url('/assets/icons/arrow-left-white.svg'); }
.case-navigation__arrow--right { -webkit-mask-image:url('/assets/icons/arrow-right-white.svg'); mask-image:url('/assets/icons/arrow-right-white.svg'); }
.case-block-slot{margin-bottom:72px}.case-block-slot>.case-block{margin-bottom:0}.case-navigation{display:grid;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);align-items:center;width:auto}.case-navigation__previous{grid-column:1;justify-self:end}.case-navigation .case-home{grid-column:2}.case-navigation__next{grid-column:3;justify-self:start}.mentions{max-width:670px;margin-inline:auto}.mentions__list{display:grid;gap:16px}.mentions__item{display:grid;grid-template-columns:48px minmax(0,1fr) 24px;gap:12px;align-items:center;color:inherit;text-decoration:none}.mentions__logo{width:48px;height:48px;border-radius:8px;object-fit:contain}.mentions__arrow{width:24px;height:24px;border-radius:50%;background:rgba(255,255,255,.15);backdrop-filter:blur(8px)}
@container page (width >= 1080px){.credits--thanks{margin-inline:230px}}
@container page (width >= 1080px){.numbers-grid--1{grid-template-columns:1fr}.numbers-grid--2{grid-template-columns:repeat(2,minmax(0,1fr))}.numbers-grid--3{grid-template-columns:repeat(3,minmax(0,1fr))}}
@container page (width < 1080px){.case-block-slot{margin-bottom:48px}}
@container page (width < 720px){.case-block-slot{margin-bottom:32px}.mentions{margin-inline:16px}.mentions__item{grid-template-columns:40px minmax(0,1fr) 24px}.mentions__logo{width:40px;height:40px}}
.mentions__arrow{position:relative}.mentions__arrow::after{content:'';position:absolute;inset:2px;background:url('/assets/icons/icon-ext-white.svg') center/20px 20px no-repeat}.case--light-background .mentions__arrow::after{background-image:url('/assets/icons/icon-ext-black.svg')}

.case { width:100%; min-width:0; }
.case-intro,.case-cover,.case-block-slot,.numbers-grid,.numbers-grid article { min-width:0; }
.numbers-grid article { max-width:100%; overflow-wrap:anywhere; }
.numbers-grid--1 { grid-template-columns:minmax(0,1fr); }
</style>
