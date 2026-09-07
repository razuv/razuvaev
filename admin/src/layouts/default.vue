<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { getSettings, type SettingsType } from '@/api'
import PortfolioLogo from '@/components/PortfolioLogo.vue'

const route=useRoute(),router=useRouter()
const menuOpen=ref(false)
const languages=ref<SettingsType['languages']>([])
const activeLanguage=computed(()=>String(route.query.lang||languages.value[0]?.iso||'en'))
const flags:Record<string,string>={ru:'🇷🇺',en:'🇬🇧',sr:'🇷🇸'}
const selectLanguage=(iso:string)=>{router.replace({query:{...route.query,lang:iso}});menuOpen.value=false}
onMounted(async()=>{try{const data=await getSettings();languages.value=Array.from(new Map(data.languages.map(item=>[item.iso,item])).values())}catch{languages.value=[]}})
</script>
<template>
  <div class="admin-shell">
    <header class="admin-header">
      <RouterLink class="admin-brand" to="/"><PortfolioLogo/><span>Админка</span></RouterLink>
      <button class="admin-menu pill" type="button" @click="menuOpen=!menuOpen">{{menuOpen?'Закрыть':'Меню'}}</button>
      <div class="admin-nav" :class="{'admin-nav--open':menuOpen}">
        <nav class="admin-links">
          <RouterLink class="pill" exact-active-class="pill--active" to="/" @click="menuOpen=false">Главная</RouterLink>
          <RouterLink class="pill" active-class="pill--active" to="/cases" @click="menuOpen=false">Кейсы</RouterLink>
          <RouterLink class="pill" active-class="pill--active" to="/statistics" @click="menuOpen=false">Статистика</RouterLink>
        </nav>
        <div class="admin-languages">
          <button v-for="language in languages" :key="language.iso" class="pill admin-language" :class="{'pill--active':activeLanguage===language.iso}" :aria-label="language.name" @click="selectLanguage(language.iso)">{{flags[language.iso]||language.iso.toUpperCase()}}</button>
        </div>
      </div>
    </header>
    <main class="admin-content"><RouterView/></main>
  </div>
</template>
<style scoped>
.admin-shell{min-height:100vh;padding:20px}.admin-header{position:relative;z-index:20;display:flex;align-items:center;height:32px}.admin-brand{display:flex;align-items:center;gap:8px;color:#fff;text-decoration:none}.admin-brand :deep(svg){width:24px;height:24px}.admin-nav{display:flex;align-items:center;margin-left:auto}.admin-links,.admin-languages{display:flex;gap:8px}.admin-languages{position:absolute;left:50%;transform:translateX(-50%);gap:4px}.admin-language{width:32px;padding:0;font-size:12px}.admin-menu{display:none;margin-left:auto}.admin-content{margin-top:40px}.admin-links .router-link-active{background:#fff;color:#000}
@media(max-width:719px){.admin-shell{padding:16px}.admin-menu{display:flex}.admin-content{margin-top:32px}.admin-nav{position:fixed;inset:0;display:none;flex-direction:column;justify-content:center;background:#000}.admin-nav--open{display:flex}.admin-links{order:1}.admin-languages{position:static;order:2;margin-top:16px;transform:none}.admin-menu{position:relative;z-index:2}}
</style>
