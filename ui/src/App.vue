<script setup lang="ts">
import { ref, onMounted, nextTick } from 'vue';
import { fetchData, getLanguageIso } from './utils/api';
import UiHeader from './components/ui/ui-header/UiHeader.vue';
import LogoIcon from './components/icons/LogoIcon.vue';

const isLoading = ref(true);
const hasContent = ref(false);
const revision = ref(0);
const loadError = ref('');

const reloadApplication = async () => {
  isLoading.value = true;
  loadError.value = '';
  try {
    await fetchData();
    hasContent.value = true;
    revision.value++;
    await nextTick();
  } catch(error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load website';
  } finally {
    isLoading.value = false;
  }
};

onMounted(reloadApplication);
</script>

<template>
  <div v-if="hasContent" :key="revision" class="layout" :inert="isLoading || !!loadError" :aria-busy="isLoading">
    <UiHeader @on-change-language="reloadApplication" />
    <RouterView v-slot="{ Component, route }">
      <Transition name="page" mode="out-in">
        <component :is="Component" :key="route.path" />
      </Transition>
    </RouterView>
  </div>
  <Transition name="loading" appear>
    <div v-if="isLoading || loadError" class="loading-overlay">
      <div v-if="loadError" class="loading-error" role="alert">
        <p>{{loadError}}</p>
        <button type="button" @click="reloadApplication">{{getLanguageIso() === 'ru' ? 'Повторить' : 'Try again'}}</button>
      </div>
      <div v-else class="loading-status" role="status" aria-live="polite">
        <LogoIcon class="loading-logo" aria-hidden="true" />
        <span class="visually-hidden">{{getLanguageIso() === 'ru' ? 'Загрузка' : 'Loading'}}</span>
      </div>
    </div>
  </Transition>
</template>

<style scoped lang="scss">
@import './assets/styles/main.scss';

.layout {
  width: 360px;
  max-width: 100%;
  container: page / inline-size;
  margin: 0 auto;
}

@media (min-width: 720px) { .layout { width:720px; } }
@media (min-width: 1080px) { .layout { width:1080px; } }
@media (min-width: 1440px) { .layout { width:1440px; } }

.loading-error {
  min-height: 100vh;
  margin: 0;
  padding: 32px;
  color: #fff;
  background: #000;
}
</style>

<style scoped>
.loading-overlay{position:fixed;inset:0;z-index:1000;display:grid;place-items:center;background:rgba(0,0,0,.32);backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);color:#fff}
.loading-status{display:grid;place-items:center;width:80px;height:80px}
.loading-logo{width:40px;height:40px;animation:loader-pulse 1.4s ease-in-out infinite}
.loading-enter-active,.loading-leave-active{transition:opacity .22s ease}
.loading-enter-from,.loading-leave-to{opacity:0}
.loading-leave-active{pointer-events:none}
.page-enter-active,.page-leave-active{transition:opacity .12s ease}
.page-enter-from,.page-leave-to{opacity:0}
.visually-hidden{position:absolute;width:1px;height:1px;padding:0;overflow:hidden;clip-path:inset(50%);white-space:nowrap}
.loading-error{min-height:0;max-width:min(420px,calc(100vw - 32px));padding:24px;border-radius:16px;overflow-wrap:anywhere;text-align:center;background:rgba(0,0,0,.75)}
.loading-error button{margin-top:16px;padding:8px 16px;border:0;border-radius:24px;background:#fff;color:#000;font:inherit;cursor:pointer}
@keyframes loader-pulse{0%,100%{opacity:.45}50%{opacity:1}}
@media(prefers-reduced-motion:reduce){.loading-logo{animation:none}.loading-enter-active,.loading-leave-active,.page-enter-active,.page-leave-active{transition:none}}
</style>
