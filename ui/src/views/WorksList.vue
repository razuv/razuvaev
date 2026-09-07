<script setup lang="ts">
import { computed, ref, onMounted } from 'vue';
import { SettingsType } from '../types/api.types';
import { getData } from '../utils/api';
import type { DesignCategory } from './WorksView.vue';

import UiCard from '../components/ui/ui-card/UiCard.vue';

const projects = ref<SettingsType['projects'][number]>();

const props = defineProps<{
  activeCategories: DesignCategory[];
}>();

const petProjectIndexes = new Set([0, 15, 18, 19, 20, 21, 23, 24, 26, 27, 28]);

const getProjectCategories = (projectIndex: number): DesignCategory[] => {
  const allData = getData() as SettingsType;
  const englishProject = allData.projects.find(project => project.iso === 'en')?.items[projectIndex];
  const current = projects.value?.items[projectIndex];
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

onMounted(() => {
  projects.value = getData('projects') as SettingsType['projects'][number];
});
</script>

<template>
  <div class="works-list" v-if="projects">
    <UiCard
      v-for="({ project, index: projectIndex }) in visibleProjects"
      :key="project.info.title"
      :index="projectIndex"
      :title="project.info.title"
      :year="project.info.year"
      :link="project.info.link"
      :images="project.info.images"
      :is-details="project.rules.details"
      :is-nda="project.rules.nda"
      :nda-password="project.rules.ndaPassword"

      class="works-list__card"
    />
  </div>
</template>

<style lang="scss" scoped>
@import '../assets/styles/main.scss';

.works-list {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  grid-template-rows: auto;
  gap: 24px 20px;
  padding: 0 18px 48px;

  @container page (width < 1440px) {
    grid-template-columns: repeat(3, 1fr);
    padding-inline: 16px;
  }

  @container page (width < 1080px) {
    grid-template-columns: repeat(2, 1fr);
    padding: 0 14px 48px;
  }

  @container page (width < 720px) {
    grid-template-columns: 1fr;
    padding: 0 12px 32px;
  }

  &__card {
    overflow: hidden;
  }
}
</style>
