<script setup lang="ts">
import { computed, ref, nextTick } from 'vue';
import { SettingsType } from '../../../types/api.types';
import { getLanguageIso } from '../../../utils/api';
import { useRouter } from 'vue-router';

import UiImage from '../ui-image/UiImage.vue';

const router = useRouter();

interface Props {
  title: string;
  year: string;
  link: string;
  isDetails: boolean;
  isNda: boolean;
  ndaPassword?: string;
  images: SettingsType['projects'][number]['items'][number]['info']['images'];
  index?: number;
};

const props = defineProps<Props>();
const ndaCode = ref('');
const ndaError = ref(false);
const ndaOpen = ref(false);

const openLink = (link: string) => {
  window.open(link);
}

const routeToCard = () => {
  if(props.isDetails && (typeof props.index !== 'undefined')) {
    router.push(`/works/${props.index}`);
  }
}

const unlockCard = async () => {
  if (!props.isNda) return;
  if (!props.ndaPassword || ndaCode.value === props.ndaPassword) {
    if (props.isDetails && (typeof props.index !== 'undefined')) {
      sessionStorage.setItem(`nda-access:${getLanguageIso()}:${props.index}`, 'granted');
      routeToCard();
    }
    return;
  }
  ndaError.value = false;
  await nextTick();
  ndaError.value = true;
  window.setTimeout(() => { ndaError.value = false; }, 500);
};

const aboutText = computed<string>(() => {
  const currentLanguage = getLanguageIso();

  const translates = {
    ru: 'О проекте',
    en: 'About',
    sr: 'О проjекту'
  };

  return translates[currentLanguage as keyof typeof translates] || translates['en'];
})
</script>

<template>
  <div
    class="ui-card"
    :class="{
      'ui-card--nda': isNda,
      'ui-card--details': isDetails
    }"
  >
    <UiImage
      :images="images.map(image => image.link)"
      :gallery="isDetails ? false : true"
      class="ui-card-image"
    >
      <template #icon>
        <div
          v-if="link"
          class="ui-card-image__link"
          @click="openLink(link)"
        >
          <img src="/assets/icons/icon-ext.svg" alt="">
        </div>
      </template>

      <template #description>
        <div v-if="isNda && ndaOpen" class="ui-card-image-nda-blur" aria-hidden="true" />
        <form
          v-if="isNda && ndaOpen"
          class="ui-card-image-nda-form"
          :class="{ 'ui-card-image-nda-form--shake': ndaError }"
          @submit.prevent="unlockCard"
          @click.stop
        >
          <input v-model="ndaCode" type="password" placeholder="Пароль" aria-label="Пароль NDA" autocomplete="off">
          <button type="submit" aria-label="Открыть кейс"><img src="/assets/icons/arrow-right-black.svg" alt=""></button>
        </form>
        <div
          v-if="isNda && !ndaOpen"
          class="ui-card-image-about ui-card-image-nda"
          @click.stop="ndaOpen = true"
        >
          <span class="ui-card-image-about__text">NDA</span>
        </div>
        <div
          v-if="!isNda && isDetails"
          class="ui-card-image-about"
          @click="routeToCard"
        >
          <span class="ui-card-image-about__text">
            {{ aboutText }}
          </span>
        </div>
      </template>
    </UiImage>

    <div
      class="ui-card-details"
    >
      <span class="ui-card-details__title">
        {{ title }}
      </span>

      <span class="ui-card-details__year">
        {{ year }}
      </span>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../../../assets/styles/main.scss';

.ui-card {
  display: flex;
  flex-direction: column;
  position: relative;

  &-image {
    aspect-ratio: 1.5;
    border-radius: 8px;
    margin-bottom: auto;

    :deep(.ui-image-container),
    :deep(.swiper),
    :deep(.swiper-wrapper),
    :deep(.swiper-slide) {
      height: 100%;
    }

    :deep(img),
    :deep(video) {
      width: 100%;
      height: 100%;
      object-fit: cover;
    }

    &__link {
      position: absolute;
      right: 8px;
      bottom: 8px;

      display: flex;
      align-items: center;
      justify-content: center;

      width: 24px;
      height: 24px;

      background-color: rgba(0, 0, 0, 0.3);
      box-shadow: 0px 2px 8px 0px rgba(0, 0, 0, 0.15);
      backdrop-filter: blur(6px);
      border-radius: 50%;

      z-index: 1;

      cursor: pointer;

      @include transition(background-color);

      & img {
        width: 20px;
        height: 20px;

        @include transition(filter);
      }

      &:hover {
        background-color: $ui-white;

        & img {
          filter: invert(1);
        }
      }
    }

    &:after {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;

      display: flex;
      align-items: center;
      justify-content: center;
      text-transform: uppercase;
      pointer-events: none;

      backdrop-filter: blur(12px);

      opacity: 0;

      @include font($font-size-base * 1.6, 400, $font-size-base * 2.4);
      @include transition(opacity);
    }

    &-about {
      position: absolute;
      left: 0;
      top: 0;
      right: 0;
      bottom: 0;

      display: flex;
      align-items: center;
      justify-content: center;

      backdrop-filter: blur(12px);

      opacity: 0;

      @include transition(opacity);
      @include disable-text-selection();

      &__text {
        display: block;
        padding: 0 ($font-size-base * 1.2);

        background: rgba(0, 0, 0, 0.30);
        backdrop-filter: blur(6px);

        border-radius: 24px;

        @include font($font-size-base * 1.6, 400, $font-size-base * 2.4);
        @include transition((background-color, color));

        &:hover {
          background-color: $ui-white;
          color: $ui-black;
        }
      }
    }

    &-nda-form {
      position: absolute;
      z-index: 2;
      left: 50%;
      top: 50%;
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 4px;
      border-radius: 100px;
      background: rgba(0, 0, 0, .28);
      backdrop-filter: blur(8px);
      transform: translate(-50%, -50%);

      input { width: 100px; height: 24px; border: 0; outline: 0; border-radius: 100px; padding: 0 8px; background: transparent; color: #fff; font: inherit; font-size: 14px; }
      input::placeholder { color: rgba(255, 255, 255, .8); }
      button { width: 24px; height: 24px; border: 0; border-radius: 50%; background: #fff; color: #000; cursor: pointer; display: grid; place-items: center; }
      button img { width: 20px; height: 20px; }
      &--shake { animation: nda-shake .42s ease-in-out; }
    }

    &-nda-blur {
      position: absolute;
      z-index: 1;
      inset: 0;
      border-radius: inherit;
      backdrop-filter: blur(12px);
      -webkit-backdrop-filter: blur(12px);
      pointer-events: none;
    }

    &:hover {
      & .ui-card-image {
        &-about {
          opacity: 1;
        }
      }
    }
  }

  &--nda {
    & .ui-card-image {
      &:after {
        content: none;
      }
    }
  }

  &--details {
    cursor: pointer;
  }

  &:hover {
    & .ui-card-image {
      &:after {
        opacity: 1;
      }
    }
  }

  &-details {
    display: flex;
    align-items: center;
    justify-content: space-between;

    margin-top: $font-size-base * .8;

    &__title {
      @include font($font-size-h3, 400, $line-height-h3);
      @include disable-text-selection();
    }

    &__year {
      @include font($font-size-h3, 400, $line-height-h3);
      @include disable-text-selection();
    }
  }
}

@keyframes nda-shake {
  0%, 100% { transform: translate(-50%, -50%); }
  25% { transform: translate(calc(-50% - 7px), -50%); }
  50% { transform: translate(calc(-50% + 7px), -50%); }
  75% { transform: translate(calc(-50% - 4px), -50%); }
}

@container page (width < 720px) {
  .ui-card-details {
    &__title,
    &__year {
      font-size: $font-size-h4;
      line-height: $line-height-h4;
    }
  }
}
</style>
