<script setup lang="ts">
import { computed } from 'vue';

interface Props {
  src: string;
}

const props = defineProps<Props>();
const isVideoFile = computed(() => /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(props.src));
</script>

<template>
  <div class="ui-video">
    <video
      v-if="isVideoFile"
      :src="src"
      controls
      playsinline
    />
    <iframe
      v-else
      :src="`${src}?pip=0`"
      allow="fullscreen;"
    />
  </div>
</template>

<style scoped lang="scss">
@import '../../../assets/styles/main.scss';

.ui-video {
  width: 100%;

  position: relative;
  height: 0;
  padding-bottom: 56.25%;

  border-radius: 8px;
  overflow: hidden;

  & iframe,
  & video {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }
}
</style>
