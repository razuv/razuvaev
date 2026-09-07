<script setup lang="ts">
import { richText } from "../../../utils/content";
import { SettingsType } from '../../../types/api.types';

import UiImage from '../ui-image/UiImage.vue';
import ArrowLinkIcon from '../../icons/ArrowLinkIcon.vue';

interface Props {
  feed: SettingsType['biography'][number]['feed'];
}

defineProps<Props>();

const openLink = (link: string) => {
  window.open(link);
}
</script>

<template>
  <div class="ui-feed">
    <div
      v-for="f in feed"
      :key="f.link"
      class="ui-feed-item"
    >
      <UiImage
        :images="[f.image]"
        :gallery="false"
        class="ui-feed-item__image"
      />

      <span class="ui-feed-item__text" v-html="richText(f.text)" />

      <div class="ui-feed-item__icon" @click="openLink(f.link)">
        <ArrowLinkIcon />
      </div>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../../../assets/styles/main.scss';

.ui-feed {
  display: flex;
  flex-direction: column;
  gap: $font-size-base * 2.4;

  &-item {
    display: flex;
    align-items: center;
    gap: $font-size-base * 1.2;

    &__image {
      min-width: 48px;
      max-width: 48px;
      border-radius: 8px;
    }

    &__text {
      @include font($font-size-base * 1.6, 400, $font-size-base * 2.4);
    }

    &__icon {
      display: flex;
      align-items: center;
      justify-content: center;
      
      border-radius: 50%;
      background: rgba(95, 95, 95, 0.50);
      box-shadow: 0px 2px 8px 0px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(6px);
      cursor: pointer;

      min-width: 24px;
      max-width: 24px;
      height: 24px;

      margin-left: auto;
      
      @include transition(background-color);

      & svg {
        stroke: $ui-white;

        @include transition(stroke);
      }

      &:hover {
        background-color: $ui-white;

        & svg {
          stroke: $ui-black;
        }
      }
    }
  }
}
</style>