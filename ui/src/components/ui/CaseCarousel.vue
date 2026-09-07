<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { detectContentByLink, getLanguageIso, resolveMediaUrl } from '../../utils/api';
defineProps<{ images: string[]; label: string }>();
const track = ref<HTMLElement>();
const isGif = (src: string) => /\.gif(?:[?#]|$)/i.test(src);
const embedUrl = (src: string) => {
  if (/player\.vimeo\.com\/video\//i.test(src)) return src;
  const vimeo = src.match(/(?:vimeo\.com\/|vimeo\.com\/video\/)(\d+)/i);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;
  const youtube = src.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]+)/i);
  return youtube ? `https://www.youtube.com/embed/${youtube[1]}` : '';
};
const dragLabel = computed(() => ({ ru: 'Тяни', sr: 'Вући', en: 'Drag' }[getLanguageIso()] || 'Drag'));
const hovered = ref(false);
const dragging = ref(false);
const x = ref(0), y = ref(0), angle = ref(0);
let lastX = 0;
let resetTimer: ReturnType<typeof setTimeout>;
const tilt = (delta: number) => {
  angle.value = Math.max(-10, Math.min(10, delta * .3));
  clearTimeout(resetTimer);
  resetTimer = setTimeout(() => { angle.value = 0; }, 120);
};
const move = (event: PointerEvent) => {
  x.value = event.clientX; y.value = event.clientY;
  if (event.pointerType !== 'touch') hovered.value = true;
  if (dragging.value && track.value) {
    const delta = lastX - event.clientX;
    track.value.scrollLeft += delta;
    tilt(delta);
  }
  lastX = event.clientX;
};
const start = (event: PointerEvent) => {
  if(event.pointerType === 'touch' || event.button !== 0) return;
  dragging.value = true; lastX = event.clientX;
  track.value?.setPointerCapture(event.pointerId);
  event.preventDefault();
};
const stop = (event: PointerEvent) => {
  dragging.value = false;
  if(track.value?.hasPointerCapture(event.pointerId)) track.value.releasePointerCapture(event.pointerId);
};
const keyboard = (event: KeyboardEvent) => {
  if(!track.value || !['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
  event.preventDefault();
  const t = track.value;
  const left = event.key === 'Home' ? 0 : event.key === 'End' ? t.scrollWidth :
    t.scrollLeft + (event.key === 'ArrowRight' ? 1 : -1) * t.clientWidth * .7;
  t.scrollTo({ left, behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
};
onUnmounted(() => clearTimeout(resetTimer));
</script>
<template>
  <div ref="track" class="case-carousel" tabindex="0" role="region" :aria-label="label"
    @pointermove="move" @pointerdown="start" @pointerup="stop" @pointercancel="stop"
    @lostpointercapture="dragging = false" @pointerleave="hovered = false"
    @wheel.passive="tilt($event.deltaX)" @keydown="keyboard" @dragstart.prevent>
    <div v-for="(src, index) in images" :key="src + index" class="case-carousel__slide">
      <img v-if="detectContentByLink(src) === 'image'" :src="resolveMediaUrl(src)" :alt="label + ' — ' + (index + 1)" draggable="false" :loading="isGif(src)?'eager':'lazy'" :fetchpriority="isGif(src)?'high':'auto'">
      <iframe v-else-if="embedUrl(src)" :src="embedUrl(src)" :title="label + ' — ' + (index + 1)" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen />
      <video v-else :src="resolveMediaUrl(src)" autoplay muted loop playsinline preload="metadata" />
    </div>
  </div>
  <Teleport to="body">
    <div v-if="hovered" class="case-drag-cursor" aria-hidden="true"
      :style="{ left: x + 'px', top: y + 'px', transform: 'translate(-50%, -50%) rotate(' + angle + 'deg)' }">
      <img src="/assets/icons/icon-down.svg" alt=""> {{ dragLabel }} <img src="/assets/icons/icon-down.svg" alt="">
    </div>
  </Teleport>
</template>
<style scoped>
.case-carousel { display:flex; gap:20px; width:100vw; margin-left:calc((100% - 100vw) / 2); overflow-x:auto; overflow-y:hidden; scrollbar-width:none; overscroll-behavior-x:contain; touch-action:pan-x pan-y; cursor:none; user-select:none; padding:0 var(--case-grid-gutter,20px); height:300px; align-items:flex-start; }
.case-carousel::-webkit-scrollbar { display:none; }
.case-carousel:focus-visible { outline:2px solid currentColor; outline-offset:-2px; }
.case-carousel__slide { flex:0 0 335px; height:100%; display:flex; align-items:flex-start; overflow:hidden; border-radius:8px; isolation:isolate; -webkit-mask-image:-webkit-radial-gradient(white, black); }
.case-carousel__slide:nth-child(even) { flex-basis:453px; }
.case-carousel img, .case-carousel video, .case-carousel iframe { display:block; width:100%; height:100%; object-fit:contain; object-position:top center; border:0; border-radius:8px !important; overflow:hidden; pointer-events:none; }
.case-drag-cursor { position:fixed; z-index:1000; pointer-events:none; display:flex; align-items:center; height:32px; padding:0 8px; border-radius:1000px; background:rgba(0,0,0,.2); color:white; backdrop-filter:blur(8px); font-size:16px; line-height:24px; transition:transform .1s ease-out; }
.case-drag-cursor img { width:20px; height:20px; transform:rotate(90deg); }
.case-drag-cursor img:last-child { transform:rotate(-90deg); }
@container page (width < 1080px) { .case-carousel { height:300px; } }
@container page (width < 720px) { .case-carousel { height:320px; } .case-carousel__slide, .case-carousel__slide:nth-child(2) { flex-basis:320px; } }
@media (pointer:coarse) { .case-carousel { cursor:auto; } .case-drag-cursor { display:none; } }
@media (prefers-reduced-motion:reduce) { .case-drag-cursor { transition:none; transform:translate(-50%,-50%) !important; } }
</style>
