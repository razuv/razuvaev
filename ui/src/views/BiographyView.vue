<script setup lang="ts">
import { richText } from "../utils/content";
import { ref, onMounted } from 'vue';
import { SettingsType } from '../types/api.types';
import { getData } from '../utils/api';

import UiContacts from '../components/ui/ui-contacts/UiContacts.vue';
import UiFeed from '../components/ui/ui-feed/UiFeed.vue';

const bio = ref<SettingsType['biography'][number]>();

onMounted(() => {
  bio.value = getData('biography') as SettingsType['biography'][number];
});
</script>

<template>
  <div
    v-if="bio"
    class="biography-view"
  >
    <span class="biography-view__text" v-html="richText(bio.text)" />

    <UiContacts
      class="biography-view__contacts"
      :contacts="bio.contacts"
    />

    <UiFeed
      class="biography-view__feed"
      :feed="bio.feed"
    />
  </div>
</template>

<style lang="scss" scoped>
@import '../assets/styles/main.scss';
.biography-view {
  &__text {
    display: block;
    margin-top: $font-size-base * .8;

    @include font($font-size-base * 1.6, 400, $font-size-base * 2.4);
  }
}
</style>