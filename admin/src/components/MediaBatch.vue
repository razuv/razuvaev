<script setup lang="ts">
import { ref } from 'vue'
import { uploadMedia } from '@/api'
const emit=defineEmits<{uploaded:[links:string[]]}>()
const input=ref<HTMLInputElement>(),busy=ref(false)
const queue=ref<{file:File;status:string;progress:number;failed:boolean}[]>([])
async function run() {
  if(busy.value)return
  busy.value=true
  for(const entry of queue.value.filter(item=>item.status!=='Готово')) {
    entry.failed=false;entry.status='Загрузка';entry.progress=0
    try {const link=await uploadMedia(entry.file,progress=>entry.progress=progress);emit('uploaded',[link]);entry.status='Готово'}
    catch(e){entry.failed=true;entry.status=e instanceof Error?e.message:'Ошибка загрузки'}
  }
  busy.value=false
}
function add(files?:FileList|null) {if(!files||busy.value)return;queue.value=Array.from(files).map(file=>({file,status:'В очереди',progress:0,failed:false}));run()}
</script>
<template>
  <div class="upload-zone" @dragover.prevent @drop.prevent="add($event.dataTransfer?.files)"><button class="pill pill--outline" :disabled="busy" @click="input?.click()">{{busy?'Загружаю изображения…':'Выбрать несколько изображений'}}</button><p>Или перетащите файлы сюда. PNG, JPEG, WebP, AVIF, GIF · до 100 МБ на файл.</p><input ref="input" type="file" accept="image/png,image/jpeg,image/webp,image/avif,image/gif" multiple hidden @change="add(($event.target as HTMLInputElement).files);($event.target as HTMLInputElement).value=''"/><div v-for="(item,index) in queue" :key="index" class="queue-item"><span>{{item.file.name}}</span><small :class="{failed:item.failed}">{{item.status}} {{item.status==='Загрузка'?item.progress+'%':''}}</small></div><button v-if="!busy&&queue.some(item=>item.failed)" class="pill" @click="run">Повторить неудачные загрузки</button></div>
</template>
<style scoped>
.upload-zone{border:1px dashed #5a5a64;border-radius:10px;padding:20px;margin:16px 0}.upload-zone p{font-size:12px;color:#aaa;line-height:18px}.queue-item{display:flex;justify-content:space-between;gap:10px;margin-top:8px;font-size:12px;overflow-wrap:anywhere}.queue-item span{min-width:0}.failed{color:#ffaaa0}
</style>
