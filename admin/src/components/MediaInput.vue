<script setup lang="ts">
import { computed, ref } from 'vue'
import { resolveMediaUrl, uploadMedia } from '@/api'
const props=withDefaults(defineProps<{modelValue:string;label?:string;accept?:string;preview?:boolean}>(),{label:'Путь к файлу',accept:'image/*,video/*',preview:false})
const emit=defineEmits<{(event:'update:modelValue',value:string):void}>()
const file=ref<HTMLInputElement>(),dragging=ref(false),loading=ref(false),error=ref('')
const previewUrl=computed(()=>props.modelValue?resolveMediaUrl(props.modelValue):'')
const isVideo=computed(()=>/\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(props.modelValue))
const handle=async(selected?:File)=>{if(!selected||loading.value)return;loading.value=true;error.value='';try{emit('update:modelValue',await uploadMedia(selected))}catch(e){error.value=e instanceof Error?e.message:'Ошибка загрузки'}finally{loading.value=false}}
const updatePath=(value:string)=>{error.value='';emit('update:modelValue',value)}
</script>
<template>
  <div class="media-input" :class="{'media-input--dragging':dragging}" @dragenter.prevent="dragging=true" @dragover.prevent="dragging=true" @dragleave.prevent="dragging=false" @drop.prevent="dragging=false;handle($event.dataTransfer?.files[0])">
    <input class="control" :value="modelValue" :placeholder="label" @input="updatePath(($event.target as HTMLInputElement).value)">
    <button type="button" class="media-upload" :aria-label="'Загрузить '+label" @click="file?.click()"><span v-if="loading">…</span><img v-else :src="'/assets/icons/icon-download.svg'" alt=""></button>
    <input ref="file" hidden type="file" :accept="accept" @change="handle(($event.target as HTMLInputElement).files?.[0])">
    <div v-if="preview&&previewUrl" class="media-preview"><video v-if="isVideo" :src="previewUrl" muted controls/><img v-else :src="previewUrl" alt=""></div>
    <span v-if="error" class="media-error">{{error}}</span>
  </div>
</template>
<style scoped>
.media-input{display:grid;grid-template-columns:minmax(0,1fr) 40px;gap:8px}.media-input--dragging{outline:1px dashed #fff;outline-offset:4px}.media-upload{display:grid;width:40px;height:40px;padding:10px;place-items:center;border:0;border-radius:8px;background:#fff;color:#000;font-size:18px;transition:background-color .16s ease,transform .16s ease}.media-upload:hover{background:#d8d8d8}.media-upload:active{transform:scale(.96)}.media-upload img{width:20px;height:20px;filter:invert(1)}.media-preview,.media-error{grid-column:1/-1}.media-preview{max-width:220px;overflow:hidden;border-radius:8px}.media-preview img,.media-preview video{display:block;width:100%}.media-error{color:#ff8a80;font-size:12px;line-height:20px}
</style>
