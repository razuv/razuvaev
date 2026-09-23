<script setup lang="ts">
import { SettingsType } from '../../../types/api.types';

import MediumIcon from '../../icons/MediumIcon.vue';
import DribbleIcon from '../../icons/DribbleIcon.vue';
import LinkedinIcon from '../../icons/LinkedinIcon.vue';
import TelegramIcon from '../../icons/TelegramIcon.vue';

interface Props {
  contacts: SettingsType['biography'][number]['contacts'];
}

defineProps<Props>();
</script>

<template>
  <div class="ui-contacts">
    <a
      v-if="contacts.find(c => c.type === 'email') && contacts.find(c => c.type === 'email')?.visible"
      :href="`mailto:${contacts.find(c => c.type === 'email')?.link}`"
      class="ui-contacts__email"
    >
      {{ contacts.find(c => c.type === 'email')?.link }}
    </a>

    <div class="ui-contacts-socials">
      <a
        v-if="contacts.find(c => c.type === 'medium')?.visible"
        :href="contacts.find(c => c.type === 'medium')?.link"
        class="ui-contacts-socials__item"
        target="_blank"
      >
        <MediumIcon />
      </a>

      <a
        v-if="contacts.find(c => c.type === 'dribble')?.visible"
        :href="contacts.find(c => c.type === 'dribble')?.link"
        class="ui-contacts-socials__item"
        target="_blank"
      >
        <DribbleIcon />
      </a>

      <a
        v-if="contacts.find(c => c.type === 'linkedin')?.visible"
        :href="contacts.find(c => c.type === 'linkedin')?.link"
        class="ui-contacts-socials__item"
        target="_blank"
      >
        <LinkedinIcon />
      </a>

      <a
        v-if="contacts.find(c => c.type === 'telegram')?.visible"
        :href="contacts.find(c => c.type === 'telegram')?.link"
        class="ui-contacts-socials__item"
        target="_blank"
      >
        <TelegramIcon />
      </a>
    </div>
  </div>
</template>

<style lang="scss" scoped>
@import '../../../assets/styles/main.scss';

.ui-contacts {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: $font-size-base * 1.6;

  margin: ($font-size-base * 4.8) 0;

  &__email {
    color: $ui-white;
    text-decoration: none;
    cursor: pointer;

    @include font($font-size-base * 2.4, 400, $font-size-base * 3.2);
    @include transition(opacity);

    &:hover {
      opacity: .8;
    }
  }

  &-socials {
    display: flex;
    align-items: center;
    gap: $font-size-base * 2.4;

    &__item {
      @include transition(opacity);

      &:hover {
        opacity: .8;
      }
    }
  }

  @media screen and (max-width: $container-width-md) {
    & {
      flex-direction: column;
      align-items: flex-start;
    }
  }
}
</style>