<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { fetchData } from './utils/api';
import UiHeader from './components/ui/ui-header/UiHeader.vue';

const isLoading = ref<boolean>(true);
const loadError = ref<string>('');

const reloadApplication = () => {
  isLoading.value = true;
  setTimeout(() => {
    isLoading.value = false;
  }, 0)
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
  width: 100%;
  max-width: 1440px;
  container: page / inline-size;
  margin: 0 auto;
}

.load-error {
  min-height: 100vh;
  margin: 0;
  padding: 32px;
  color: #fff;
  background: #000;
}
</style>
