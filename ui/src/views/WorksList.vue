<script setup lang="ts">
import { computed, ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
import { SettingsType } from '../types/api.types';
import { getData, getLanguageIso } from '../utils/api';
import type { DesignCategory } from './WorksView.vue';

import UiCard from '../components/ui/ui-card/UiCard.vue';

const list = ref<HTMLElement>();
const minimumHeight = ref(0);
const resizing = ref(false);
let resizeObserver: ResizeObserver | undefined;
let resizeTimer: ReturnType<typeof setTimeout> | undefined;
let lastWidth = 0;

const projects = ref<SettingsType['projects'][number]>();

const props = defineProps<{
  activeCategories: DesignCategory[];
}>();

const petProjectIndexes = new Set([0, 15, 18, 19, 20, 21, 23, 24, 26, 27, 28]);
const categoryIds: DesignCategory[] = ['product', 'communication', 'web', 'event', 'art-direction', 'identity', 'pet'];

const getProjectCategories = (projectIndex: number): DesignCategory[] => {
  const allData = getData() as SettingsType;
  const englishProject = allData.projects.find(project => project.iso === 'en')?.items[projectIndex];
  const current = projects.value?.items[projectIndex];
  const localizedCategories = allData.biography.find(item => item.iso === projects.value?.iso)?.categories || [];
  const selectedTags = current?.details.tags || [];
  const configured = selectedTags
    .map(tag => localizedCategories.findIndex(category => category.localeCompare(tag, undefined, { sensitivity: 'base' }) === 0))
    .filter(index => index >= 0)
    .map(index => categoryIds[index])
    .filter((category): category is DesignCategory => Boolean(category));
  if(configured.length) return [...new Set(configured)];
  const description = current?.details.tags?.length ? current.details.tags.join(', ').toLowerCase() : (englishProject?.details.content?.[0]?.title.toLowerCase() || '');
  const categories: DesignCategory[] = [];

  if(description.includes('product')) categories.push('product');
  if(description.includes('communication') || description.includes('graphic design')) categories.push('communication');
  if(description.includes('web')) categories.push('web');
  if(description.includes('event')) categories.push('event');
  if(description.includes('art direction')) categories.push('art-direction');
  if(description.includes('identity') || description.includes('branding') || description.includes('typography')) categories.push('identity');
  if(petProjectIndexes.has(projectIndex)) categories.push('pet');

  return categories;
};

const visibleProjects = computed(() => {
  if(!projects.value) return [];

  return projects.value.items
    .map((project, index) => ({ project, index }))
    .filter(({ index }) => props.activeCategories.length === 0
      || props.activeCategories.some(category => getProjectCategories(index).includes(category)));
});

const labels = computed(()=>getLanguageIso()==='ru'?{selected:'Избранные проекты',other:'Другие работы',archive:'Ранние работы'}:getLanguageIso()==='sr'?{selected:'Изабрани пројекти',other:'Други радови',archive:'Рани радови'}:{selected:'Selected projects',other:'More work',archive:'Earlier work'})
const sections = computed(() => {
  const archive = visibleProjects.value.filter(({project}) => project.rules.listing==='archive' || (!project.rules.listing && Math.max(...(project.info.year.match(/\d{4}/g) || ['9999']).map(Number)) < 2019))
  const recent = visibleProjects.value.filter(item=>!archive.includes(item))
  return [{id:'recent',title:'',items:recent},{id:'archive',title:labels.value.archive,items:archive}].filter(section=>section.items.length)
})

// Keep enough document height to prevent the browser clamping the current scroll.
watch(() => props.activeCategories, () => {
  if (list.value) minimumHeight.value = Math.max(0, window.innerHeight - list.value.getBoundingClientRect().top);
}, { flush: 'pre' });

const freezeLeavingCard = (element: Element) => {
  const card = element as HTMLElement;
  const { width, height } = card.getBoundingClientRect();
  const left = card.offsetLeft;
  const top = card.offsetTop;
  Object.assign(card.style, { left: `${left}px`, top: `${top}px`, width: `${width}px`, height: `${height}px` });
};
const clearLeavingCard = (element: Element) => {
  const card = element as HTMLElement;
  for (const property of ['left', 'top', 'width', 'height']) card.style.removeProperty(property);
};

onMounted(async () => {
  projects.value = getData('projects') as SettingsType['projects'][number];
  await nextTick();
  if (!list.value) return;
  lastWidth = list.value.getBoundingClientRect().width;
  resizeObserver = new ResizeObserver(([entry]) => {
    const width = entry.contentRect.width;
    if (Math.abs(width - lastWidth) < .5) return;
    lastWidth = width;
    resizing.value = true;
    minimumHeight.value = 0;
    // A re-entered card must not retain the pixel dimensions of its leaving state.
    list.value?.querySelectorAll<HTMLElement>('.works-list__card:not(.project-leave-active)').forEach(clearLeavingCard);
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => { resizing.value = false; }, 180);
  });
  resizeObserver.observe(list.value);
});
onBeforeUnmount(() => {
  resizeObserver?.disconnect();
  clearTimeout(resizeTimer);
});
</script>

<template>
  <div ref="list" v-if="projects" :style="{ minHeight: `${minimumHeight}px` }">
  <component v-for="section in sections" :key="section.id" :is="section.id==='archive'?'details':'section'" class="project-section" :open="section.id==='archive'&&activeCategories.length>0?true:undefined">
    <summary v-if="section.id==='archive'" class="project-section-title"><i aria-hidden="true"/>{{section.title}}</summary>

    <TransitionGroup tag="div" name="project" class="works-list" :class="{ 'works-list--resizing': resizing }" @before-enter="clearLeavingCard" @before-leave="freezeLeavingCard" @after-leave="clearLeavingCard" @leave-cancelled="clearLeavingCard">
      <UiCard v-for="({project,index}) in section.items" :key="project.id||index" :index="index" :title="project.info.title" :year="project.info.year" :link="project.info.link" :images="project.info.images" :is-details="project.rules.details" :is-nda="project.rules.nda" :nda-password="project.rules.ndaPassword" class="works-list__card"/>
    </TransitionGroup>
  </component>
  <p v-if="!visibleProjects.length" class="project-section-title">{{getLanguageIso()==='ru'?'Нет проектов в выбранных категориях':'No projects in these categories'}}</p>
  </div>
</template>

<style lang="scss" scoped>
@import '../assets/styles/main.scss';

.works-list {
  position: relative;
  width: 100%;
  min-width: 0;
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  grid-template-rows: auto;
  gap: 20px;
  padding: 0 18px 48px;

  @container page (width < 1440px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    padding-inline: 16px;
  }

  @container page (width < 1080px) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    padding: 0 14px 48px;
  }

  @container page (width < 720px) {
    grid-template-columns: minmax(0, 1fr);
    padding: 0 12px 32px;
  }

  &__card {
    min-width: 0;
    overflow: hidden;
  }
}
.project-section-title{margin:0 20px 20px;font-size:24px;line-height:32px;font-weight:400;color:inherit}.project-section-title span{font-size:16px;opacity:.65;margin-left:8px}summary.project-section-title{cursor:pointer;min-height:44px;display:flex;align-items:center;gap:8px;list-style:none}summary.project-section-title::-webkit-details-marker{display:none}summary.project-section-title i{width:24px;height:24px;background:currentColor;mask:url('/assets/icons/arrow-down-white.svg') center/contain no-repeat}details[open]>summary.project-section-title i{transform:rotate(180deg)}.project-section{margin-bottom:16px}
</style>

<style scoped>
.project-move, .project-enter-active, .project-leave-active {
  transition: opacity .2s ease, transform .24s ease;
}
.project-enter-from, .project-leave-to { opacity: 0; transform: translateY(6px) scale(.98); }
.works-list--resizing > .works-list__card { transition: none !important; }
.project-leave-active { position: absolute; pointer-events: none; }
@media (prefers-reduced-motion: reduce) {
  .project-move, .project-enter-active, .project-leave-active { transition: none; }
}
</style>
