<script setup lang="ts">
// @ts-ignore
import { Navigation, Pagination } from 'swiper';
import { Swiper, SwiperSlide } from 'vue-awesome-swiper';
import 'swiper/css';
import 'swiper/css/pagination';
import 'swiper/css/navigation';
import { detectContentByLink, resolveMediaUrl } from '../../../utils/api';

import UiVideo from '../ui-video/UiVideo.vue';


interface Props {
  images: string[];
  gallery: boolean;
  alwaysOn?: boolean;
}

defineProps<Props>();
const emits = defineEmits(['on-click']);

const onClick = () => {
  emits('on-click');
}
</script>

<template>
  <div
    class="ui-image"
    :class="{
      'ui-image--always-on': alwaysOn
    }"
  >
    <div
      v-if="(images.length > 0 && images.length < 2) || !gallery"
      class="ui-image-container one-picture-container"
    >
      <img
        v-if="detectContentByLink(images[0]) === 'image'"
        :src="resolveMediaUrl(images[0])"
        alt="Preview"
        ondragstart="return false"
        @click="onClick"
      />

      <ui-video
        v-else
        :src="resolveMediaUrl(images[0])"
      />
    </div>

    <swiper
      v-else
      :allow-touch-move="true"
      :slides-per-view="1"
      :modules="[Navigation, Pagination]"
      :pagination="{
        type: 'fraction'
      }"
      navigation
      loop
    >
      <swiper-slide
        v-for="image in images"
        :key="image"
      >
        <img
          v-if="detectContentByLink(image) === 'image'"
          :src="resolveMediaUrl(image)"
          alt="Preview"
          ondragstart="return false"
          @click="onClick"
        />

        <ui-video
          v-else
          :src="resolveMediaUrl(image)"
        />
      </swiper-slide>
    </swiper>

    <slot name="icon" />
    <slot name="description" />
  </div>
</template>

<style lang="scss">
@import '../../../assets/styles/main.scss';

.ui-image {
  overflow: hidden;
  position: relative;

  &-container {
    width: 100%;
    @include disable-text-selection();

    & img {
      width: 100%;
      @include disable-text-selection();
    }
  }

  & .swiper {
    & .swiper-wrapper {
      align-items: stretch;
    }

    & .swiper-slide {
      display: flex;
      align-items: center;
      height: auto;
    }

    & .swiper-button-next, & .swiper-button-prev {
      background-color: rgba(0, 0, 0, 0.3);
      box-shadow: 0px 2px 8px 0px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(6px);

      padding: 10px 2px;
      border-radius: 24px;

      width: 24px;
      height: 40px;

      opacity: 0;

      @include transition((background-color, opacity));

      &:after {
        font-size: 14px;
        color: $ui-white;
      }

      &:hover {
        background-color: $ui-white;

        &:after {
          color: $ui-black;
        }
      }
    }

    & .swiper-button-next {
      right: 8px;
    }

    & .swiper-button-prev {
      left: 8px;
    }

    & .swiper-pagination {
      display: flex;
      justify-content: center;
      width: fit-content;
      
      background-color: rgba(0, 0, 0, 0.3);
      box-shadow: 0px 2px 8px 0px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(6px);

      padding: 0 12px;
      border-radius: 24px;

      max-width: 78px;
      min-width: 54px;
      left: 50%;

      gap: 2px;

      transform: translateX(-50%);

      color: $ui-white;

      opacity: 0;

      @include font($font-size-base * 1.6, 400, $font-size-base * 2.4);
      @include disable-text-selection();
      @include transition((opacity));
    }

    & img {
      width: 100%;

      @include disable-text-selection();
    }
  }

  &--always-on {
    & .swiper {
      & .swiper-button-next, & .swiper-button-prev {
        opacity: 1;
      }
    }

    & .swiper-pagination {
      opacity: 1;
    }
  }

  &:hover {
    & .swiper {
      & .swiper-button-next, & .swiper-button-prev {
        opacity: 1;
      }
    }

    & .swiper-pagination {
      opacity: 1;
    }
  }
}
</style>
