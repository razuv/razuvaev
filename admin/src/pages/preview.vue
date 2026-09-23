<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { pageWidthForViewport } from '../../../ui/src/utils/page-width'
import WorksDetailsView from '../../../ui/src/views/WorksDetailsView.vue'
import { resolveMediaUrl, type SettingsType } from '@/api'
const width=ref(pageWidthForViewport(innerWidth))
const resize=()=>{width.value=pageWidthForViewport(innerWidth)}
const project=ref<SettingsType['projects'][number]['items'][number]>(),language=ref('en')
function receive(event:MessageEvent) {
  if(event.origin!==location.origin||event.source!==window.parent||event.data?.type!=='case-preview')return
  const data=event.data.project
  if(!data?.info||!data?.details)return
  // Resolve local/remote media with the admin deployment's configuration.
  const copy=JSON.parse(JSON.stringify(data))
  if(copy.info.logo)copy.info.logo=resolveMediaUrl(copy.info.logo)
  copy.info.images=copy.info.images.map((image:{link:string})=>({...image,link:resolveMediaUrl(image.link)}))
  for(const block of copy.details.blocks||[]) {
    block.images=(block.images||[]).map((image:string)=>resolveMediaUrl(image))
    if(block.video)block.video=resolveMediaUrl(block.video)
    if(block.poster)block.poster=resolveMediaUrl(block.poster)
    for(const item of block.items||[])if(item.image)item.image=resolveMediaUrl(item.image)
  }
  project.value=copy;language.value=event.data.language
}
function selectBlock(id:string){window.parent.postMessage({type:'case-preview-select',id},location.origin)}
function preventNavigation(event:MouseEvent){if((event.target as Element).closest('a'))event.preventDefault()}
onMounted(()=>{window.addEventListener('resize',resize);window.addEventListener('message',receive);window.parent.postMessage({type:'case-preview-ready'},location.origin)})
onBeforeUnmount(()=>{window.removeEventListener('message',receive);window.removeEventListener('resize',resize)})
</script>
<template><div class="preview-page" :style="{width:width+'px',marginInline:'auto'}" @click.capture="preventNavigation"><WorksDetailsView v-if="project" :preview-project="project" :preview-language="language" @select-block="selectBlock"/><p v-else>Ожидаю данные редактора…</p></div></template>
<style>
body:has(.preview-page),body:has(.preview-page) #app{width:100%;max-width:100%;margin:0;padding:0}.preview-page{container:page / inline-size;width:100%;font-family:Suisse,Arial,sans-serif}.preview-page p{margin:0}.preview-page .case-hero,.preview-page .case-block-slot{cursor:pointer}.preview-page .case-hero:hover,.preview-page .case-block-slot:hover{outline:2px dashed #8e8eff;outline-offset:-2px}.preview-page .case{padding-top:32px}
</style>
