<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchData } from './utils/api';
import UiHeader from './components/ui/ui-header/UiHeader.vue';

const isLoading = ref<boolean>(true);
const loadError = ref<string>('');

const reloadApplication = async () => {
  isLoading.value = true;
  loadError.value = '';
  try {
    await fetchData();
  } catch(error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load website';
  } finally {
    isLoading.value = false;
  }
};

onMounted(async () => {
  try {
    await fetchData();
  } catch(error) {
    loadError.value = error instanceof Error ? error.message : 'Failed to load website';
  } finally {
    isLoading.value = false;
  }
});
</script>

<template>
  <p v-if="loadError" class="load-error">{{loadError}}</p>
  <div class="layout" v-else-if="!isLoading">
    <UiHeader
      @on-change-language="reloadApplication"
    />
    <RouterView />
  </div>
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

.load-error {
  min-height: 100vh;
  margin: 0;
  padding: 32px;
  color: #fff;
  background: #000;
}
</style>
