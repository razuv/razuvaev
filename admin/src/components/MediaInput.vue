<script setup lang="ts">
import { computed, ref } from 'vue'
import { resolveMediaUrl, uploadMedia } from '@/api'
const props=withDefaults(defineProps<{modelValue?:string;label?:string;accept?:string;preview?:boolean;library?:string[]}>(),{modelValue:'',label:'Файл',accept:'image/*,video/*',preview:false})
const emit=defineEmits<{(event:'update:modelValue',value:string):void}>()
const file=ref<HTMLInputElement>(),loading=ref(false),error=ref(''),progress=ref(0),libraryOpen=ref(false),pathOpen=ref(false)
const previewUrl=computed(()=>props.modelValue?resolveMediaUrl(props.modelValue):'')
const isVideo=computed(()=>/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(props.modelValue))
const isExternalVideo=computed(()=>/vimeo\.com|youtube\.com|youtu\.be/.test(props.modelValue))
const handle=async(selected?:File)=>{if(!selected||loading.value)return;const accepted=props.accept.split(',').map(value=>value.trim());if(!accepted.some(value=>value===selected.type||(value.endsWith('/*')&&selected.type.startsWith(value.slice(0,-1))))){error.value='Выберите файл в указанном формате: '+props.accept;return}loading.value=true;error.value='';progress.value=0;try{emit('update:modelValue',await uploadMedia(selected,value=>progress.value=value))}catch(e){error.value=e instanceof Error?e.message:'Ошибка загрузки'}finally{loading.value=false}}
</script>
<template>
  <div class="media-input" @dragover.prevent @drop.prevent="handle($event.dataTransfer?.files[0])">
    <div v-if="preview&&previewUrl&&!isExternalVideo" class="media-preview"><video v-if="isVideo" :src="previewUrl" muted controls/><img v-else :src="previewUrl" :alt="label" @error="error='Не удалось показать файл. Проверьте ссылку или замените его.'"></div>
    <div class="media-buttons"><button type="button" class="pill" :disabled="loading" @click="file?.click()">{{loading?'Загрузка · '+progress+'%':modelValue?'Заменить файл':'Загрузить файл'}}</button><button v-if="library?.length&&accept.includes('image')" type="button" class="text-button" @click="libraryOpen=!libraryOpen">Из библиотеки</button><button type="button" class="text-button" @click="pathOpen=!pathOpen">По ссылке</button></div>
    <label v-if="pathOpen||isExternalVideo" class="path-field"><span>{{label}}</span><input class="control" :value="modelValue" placeholder="https://… или /media/…" @input="error='';emit('update:modelValue',($event.target as HTMLInputElement).value)"></label>
    <input ref="file" hidden type="file" :accept="accept" @change="handle(($event.target as HTMLInputElement).files?.[0]);($event.target as HTMLInputElement).value=''">
    <div v-if="libraryOpen" class="media-library"><button v-for="url in library" :key="url" type="button" :title="url" @click="emit('update:modelValue',url);libraryOpen=false;error=''"><img :src="resolveMediaUrl(url)" alt="Выбрать изображение" loading="lazy"></button></div>
    <span v-if="error" class="media-error" role="alert">{{error}}</span>
  </div>
</template>
<style scoped>
.media-input{display:grid;gap:12px;min-width:0}.media-buttons{display:flex;gap:12px;flex-wrap:wrap;align-items:center}.media-preview{max-width:100%;overflow:hidden;border-radius:8px;background:#242428}.media-preview img,.media-preview video{display:block;width:100%;max-height:320px;object-fit:contain}.media-error{color:#ffaaa0;font-size:12px;line-height:20px}.path-field{display:grid;gap:6px;font-size:12px;color:#aaa}.media-library{display:grid;grid-template-columns:repeat(auto-fill,minmax(70px,1fr));max-height:260px;overflow:auto;gap:8px;padding:8px;background:#242428;border-radius:8px}.media-library button{border:1px solid #555;background:#111;aspect-ratio:1;padding:0;border-radius:6px;overflow:hidden}.media-library img{width:100%;height:100%;object-fit:contain}
</style>
