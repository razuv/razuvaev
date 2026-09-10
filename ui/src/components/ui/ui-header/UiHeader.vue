<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';

import LogoIcon from '../../icons/LogoIcon.vue';
import LinkedinIcon from '../../icons/LinkedinIcon.vue';
import TelegramIcon from '../../icons/TelegramIcon.vue';
import { changeLanguage, getData, getLanguageIso } from '../../../utils/api';
import { SettingsType } from '../../../types/api.types';

type LanguageIso = SettingsType['languages'][number]['iso'];

interface LanguageOption {
  iso: LanguageIso;
  name: string;
}

const emit = defineEmits(['on-change-language']);
const route = useRoute();
const router = useRouter();
const selectedIso = ref<LanguageIso>('en');
const isLanguageOpen = ref(false);
const isCopied = ref(false);
const isDetailContrastLight = ref(false);
let contrastObserver: MutationObserver | undefined;

const updateContrast = () => {
  if(!isDetailsPage.value) {
    isDetailContrastLight.value = false;
    return;
  }
  const surface = document.querySelector('.case') || document.querySelector('#app');
  if(!surface) return;
  const rgb = getComputedStyle(surface).backgroundColor.match(/[\d.]+/g)?.slice(0,3).map(Number) || [0,0,0];
  const [r,g,b] = rgb.map(value => { const c=value/255; return c<=.04045?c/12.92:((c+.055)/1.055)**2.4; });
  const luminance=.2126*r+.7152*g+.0722*b;
  const blackContrast=(luminance+.05)/.05;
  const whiteContrast=1.05/(luminance+.05);
  isDetailContrastLight.value=blackContrast>=whiteContrast;
};

const settings = getData() as SettingsType;
const languages: LanguageOption[] = Array.from(
  new Map((settings.languages || []).map(language => [language.iso, language])).values(),
);

const translations = {
  en: { name: 'Alexey Razuvaev', works: 'Works', bio: 'Bio', copied: 'Copied' },
  ru: { name: 'Алексей Разуваев', works: 'Работы', bio: 'Био', copied: 'Скопировано' },
  sr: { name: 'Алексеј Разуваев', works: 'Радови', bio: 'Биографија', copied: 'Копирано' },
};

const text = computed(() => translations[selectedIso.value as keyof typeof translations] || translations.en);
const isDetailsPage = computed(() => /^\/works\/\d+/.test(route.path));
const selectedLanguage = computed(() => languages.find(language => language.iso === selectedIso.value) || languages[0] || { iso: 'en', name: 'English' });
const compactLanguageName = (iso: LanguageIso) => ({ ru: '🇷🇺', en: '🇬🇧', sr: '🇷🇸' }[iso] || iso.toUpperCase());

const selectLanguage = (iso: LanguageIso) => {
  if(selectedIso.value === iso) {
    isLanguageOpen.value = false;
    return;
  }

  selectedIso.value = iso;
  changeLanguage(iso);
  isLanguageOpen.value = false;
  emit('on-change-language');
};

const copyEmail = async () => {
  const email = 'alexey@razuvaev.me';

  try {
    await navigator.clipboard.writeText(email);
  } catch {
    const input = document.createElement('textarea');
    input.value = email;
    input.style.position = 'fixed';
    input.style.opacity = '0';
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    input.remove();
  }

  isCopied.value = true;
  window.setTimeout(() => { isCopied.value = false; }, 1600);
};

onMounted(() => {
  const savedLanguage = getLanguageIso();
  selectedIso.value = languages.some(language => language.iso === savedLanguage)
    ? savedLanguage
    : languages[0]?.iso || 'en';
  nextTick(updateContrast);
  contrastObserver = new MutationObserver(updateContrast);
  contrastObserver.observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ['style', 'class'] });
});

watch(() => route.path, () => nextTick(updateContrast));

onUnmounted(() => contrastObserver?.disconnect());
</script>

<template>
  <header class="ui-header" :class="{
    'ui-header--transparent': isDetailsPage,
    'ui-header--light-background': isDetailsPage && isDetailContrastLight
  }">
    <button class="ui-header-brand" type="button" @click="router.push('/works')">
      <LogoIcon class="ui-header-brand__logo" />
      <span>{{ text.name }}</span>
    </button>

    <nav class="ui-header-navigation" :aria-label="text.works">
      <button
        type="button"
        class="ui-header-navigation__pill"
        :class="{ 'ui-header-navigation__pill--active': route.path.includes('/works') }"
        @click="router.push('/works')"
      >
        {{ text.works }}
      </button>
      <button
        type="button"
        class="ui-header-navigation__pill"
        :class="{ 'ui-header-navigation__pill--active': route.path.includes('/bio') }"
        @click="router.push('/bio')"
      >
        {{ text.bio }}
      </button>
      <a class="ui-header-navigation__pill" href="https://t.me/razuvaevtv" target="_blank" rel="noreferrer">TV</a>
      <a class="ui-header-navigation__pill ui-header-navigation__social" href="https://www.linkedin.com/in/razuv/" target="_blank" rel="noreferrer" aria-label="LinkedIn" title="LinkedIn">
        <LinkedinIcon aria-hidden="true" />
      </a>
      <a class="ui-header-navigation__pill ui-header-navigation__social" href="https://t.me/razuvaev" target="_blank" rel="noreferrer" aria-label="Telegram" title="Telegram">
        <TelegramIcon aria-hidden="true" />
      </a>
      <button class="ui-header-navigation__pill" type="button" @click="copyEmail">
        <img :src="isCopied ? '/assets/icons/icon-success.svg' : '/assets/icons/icon-copy.svg'" alt="" aria-hidden="true">
        Email
      </button>

      <div
        class="ui-header-language"
        @mouseenter="isLanguageOpen = true"
        @mouseleave="isLanguageOpen = false"
        @keydown.esc="isLanguageOpen = false"
        @focusout="!($event.currentTarget as HTMLElement).contains($event.relatedTarget as Node) && (isLanguageOpen = false)"
      >
        <button
          class="ui-header-language__trigger"
          type="button"
          :aria-expanded="isLanguageOpen"
          aria-controls="language-options"
          :title="selectedLanguage.name"
          aria-label="Language"
          @mouseenter="isLanguageOpen = true"
        >
          <span class="ui-header-language__full-name">{{ selectedLanguage.name }}</span>
          <span class="ui-header-language__compact-name">{{ compactLanguageName(selectedIso) }}</span>
        </button>

        <Transition name="language-dropdown">
        <div v-if="isLanguageOpen" id="language-options" class="ui-header-language-menu">
          <button
            v-for="language in languages.filter(item => item.iso !== selectedIso)"
            :key="language.iso"
            :aria-label="language.name"
            type="button"
            class="ui-header-language-menu__item"
            :class="{ 'ui-header-language-menu__item--active': language.iso === selectedIso }"
            @click="selectLanguage(language.iso)"
          >
            <span class="ui-header-language-menu__full-name">{{ language.name }}</span>
            <span class="ui-header-language-menu__compact-name">{{ compactLanguageName(language.iso) }}</span>
          </button>
        </div>
        </Transition>
      </div>
    </nav>
  </header>
</template>

<style scoped lang="scss">
.ui-header {
  position: relative; z-index: 20; display: flex; align-items: center;
  justify-content: space-between; height: 88px; padding: 28px 40px 28px 48px;
  color: #fff; background: transparent; --pill: rgba(255,255,255,.15);
}
.ui-header--light-background { color: #000; --pill: rgba(0,0,0,.2); }
.ui-header-brand {
  display:flex; align-items:center; gap:4px; padding:0; border:0; background:none;
  color:inherit; font:inherit; cursor:pointer;
  span { color:inherit; font-size:16px; line-height:24px; white-space:nowrap; }
}
.ui-header-brand__logo { width:24px; height:24px; }
@container page (width >= 1440px) { .ui-header-brand__logo { width:20px; } }
.ui-header-navigation { display:flex; align-items:center; gap:8px; }
.ui-header-navigation > :nth-child(-n+3) { display:none; }
.ui-header-navigation__pill, .ui-header-language__trigger, .ui-header-language-menu__item {
  display:flex; align-items:center; justify-content:center; gap:0; height:32px;
  padding:0 8px; border:0; border-radius:1000px; background:var(--pill);
  backdrop-filter:blur(8px); -webkit-backdrop-filter:blur(8px);
  color:#fff; font:inherit; font-size:16px; line-height:24px;
  text-decoration:none; white-space:nowrap; cursor:pointer;
  img { width:20px; height:20px; flex:none; filter:none; }
  &:hover { background:#fff; color:#000; img { filter:invert(1); } }
  &:focus-visible { outline:2px solid currentColor; outline-offset:3px; }
}
.ui-header-navigation__social {
  width:32px; padding:0; flex:none;
  svg { width:18px; height:18px; }
}
.ui-header-language { position:relative; width:32px; height:32px; }
.ui-header-language__trigger { width:100%; padding:0; }
.ui-header-language__trigger[aria-expanded="true"] img { transform:rotate(180deg); }
.ui-header-language__full-name, .ui-header-language-menu__full-name { display:none; }
.ui-header-language__compact-name, .ui-header-language-menu__compact-name { color:inherit; font-size:12px; line-height:20px; }
.ui-header-language-menu { position:absolute; top:100%; left:0; width:100%; display:flex; flex-direction:column; gap:4px; padding-top:4px; }
.language-dropdown-enter-active, .language-dropdown-leave-active { transition: opacity .16s ease, transform .16s ease; transform-origin: top center; }
.language-dropdown-enter-from, .language-dropdown-leave-to { opacity: 0; transform: translateY(-4px) scale(.98); }
.ui-header-language-menu__item { width:100%; }
@container page (1080px <= width < 1440px) { .ui-header { padding-left:40px; } }
@container page (width < 1080px) { .ui-header { height:72px; padding:20px 28px 20px 32px; } }
@container page (width < 720px) {
  .ui-header { height:56px; padding:16px 16px 16px 18px; }
  .ui-header-brand span { display:none; }
  .ui-header-brand__logo { width:24px; height:24px; }
  .ui-header-navigation { gap:4px; }
  .ui-header-navigation__pill, .ui-header-language__trigger, .ui-header-language-menu__item {
    height:24px; font-size:12px; line-height:20px;
  }
  .ui-header-navigation__social { width:24px; svg { width:14px; height:14px; } }
  .ui-header-language { width:24px; height:24px; }
  .ui-header-language-menu { gap:2px; padding-top:2px; }
}
</style>
