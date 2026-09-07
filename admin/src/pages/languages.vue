<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getSettings, type SettingsType } from '@/api'
const settings=ref<SettingsType>(),loading=ref(true),error=ref('')
const projectCount=computed(()=>settings.value?.projects[0]?.items.length||0)
const openCount=computed(()=>settings.value?.projects[0]?.items.filter(item=>item.rules.details).length||0)
const ndaCount=computed(()=>settings.value?.projects[0]?.items.filter(item=>item.rules.nda).length||0)
onMounted(async()=>{try{settings.value=await getSettings(true)}catch(e){error.value=e instanceof Error?e.message:'Ошибка загрузки'}finally{loading.value=false}})
</script>
<template><p v-if="loading" class="status">Загрузка…</p><p v-else-if="error" class="status status--error">{{error}}</p><div v-else class="statistics"><article><strong>{{projectCount}}</strong><span>Всего проектов</span></article><article><strong>{{openCount}}</strong><span>Кейсов опубликовано</span></article><article><strong>{{ndaCount}}</strong><span>Проектов с NDA</span></article></div></template>
<style scoped>.statistics{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.statistics article{display:grid;gap:8px;padding:16px;border-radius:8px;background:#1d1d1d}.statistics strong{font-size:56px;line-height:56px;font-weight:400}.status{color:#888}.status--error{color:#ff8a80}@media(max-width:719px){.statistics{grid-template-columns:1fr}}</style>
