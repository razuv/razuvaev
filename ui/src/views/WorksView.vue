<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue';
import { getData, getLanguageIso, resolveMediaUrl } from '../utils/api';
import type { HeroProofGroup, SettingsType } from '../types/api.types';
import WorksList from './WorksList.vue';

export type DesignCategory = 'product' | 'communication' | 'web' | 'event' | 'art-direction' | 'identity' | 'pet';
type LanguageIso = 'en' | 'ru' | 'sr';

const activeCategories = ref<DesignCategory[]>([]);
const language = computed<LanguageIso>(() => {
  const iso = getLanguageIso();
  return iso === 'ru' || iso === 'sr' ? iso : 'en';
});

const translations = {
  en: {
    heading: 'Hello,\nmy name is Alexey.',
    subtitle: 'I am a multidisciplinary designer and a team lead with over ten years of experience.',
    worked: 'Worked with',
    featured: 'Featured at',
    categories: ['All', 'Product', 'Communication', 'Web', 'Event', 'Art Direction', 'Branding', 'Pet Project'],
  },
  ru: {
    heading: 'Привет,\nменя зовут Алексей.',
    subtitle: 'Я мультидисциплинарный дизайнер и тимлид с опытом работы более десяти лет.',
    worked: 'Работал с',
    featured: 'Упомянут в',
    categories: ['Всё', 'Продукт', 'Коммуникация', 'Веб', 'Ивент', 'Арт-дирекшн', 'Брендинг', 'Личный проект'],
  },
  sr: {
    heading: 'Здраво,\nзовем се Алексеј.',
    subtitle: 'Мултидисциплинарни сам дизајнер и тим лидер са више од десет година искуства.',
    worked: 'Радио са',
    featured: 'Објављено у',
    categories: ['Све', 'Производ', 'Комуникација', 'Веб', 'Догађај', 'Арт дирекција', 'Брендинг', 'Лични пројекат'],
  },
};

const defaultProof = {
  worked: {
    label: '',
    tooltip: 'team.vk.company',
    link: 'https://team.vk.company/',
    items: [
      { image: '/assets/logos/vk.png', alt: 'VK' },
      { image: '/assets/logos/strelka.png', alt: 'STRELKA' },
      { image: '/assets/logos/relap.png', alt: 'Relap' },
      { image: '/assets/logos/kion.png', alt: 'KION' },
    ],
  },
  featured: {
    label: '',
    tooltip: '@cyrillicdesign',
    link: 'https://t.me/cyrillicdesign',
    items: [
      { image: '/assets/logos/hitech.png', alt: 'Hi-Tech Mail' },
      { image: '/assets/logos/vcru.png', alt: 'vc.ru' },
      { image: '/assets/logos/tj.png', alt: 'TJournal' },
      { image: '/assets/logos/cyrillic.png', alt: 'Cyrillic' },
      { image: '/assets/logos/enter.png', alt: 'Enter' },
      { image: '/assets/logos/blank.png', alt: 'BLANK POSTER' },
    ],
  },
};

const categoryIds: DesignCategory[] = ['product', 'communication', 'web', 'event', 'art-direction', 'identity', 'pet'];
const text = computed(() => translations[language.value]);
const biography = computed(() => getData('biography') as SettingsType['biography'][number]);
const editableHero = computed(() => biography.value?.iso === language.value ? biography.value.hero : undefined);
const categoryLabels = computed(() => [text.value.categories[0], ...(biography.value?.categories?.length ? biography.value.categories : text.value.categories.slice(1))]);
const hero = computed(() => ({
  title: editableHero.value?.title || text.value.heading,
  subtitle: editableHero.value?.subtitle || text.value.subtitle,
  worked: {
    ...defaultProof.worked,
    label: text.value.worked,
    ...editableHero.value?.worked,
  } as HeroProofGroup,
  featured: {
    ...defaultProof.featured,
    label: text.value.featured,
    ...editableHero.value?.featured,
  } as HeroProofGroup,
}));
const ruSubtitleParts = computed(() => {
  const [beforeWith, afterWith = ''] = hero.value.subtitle.split(' с ');
  const [beforeAnd, afterAnd = ''] = beforeWith.split(' и ');
  return { beforeAnd, afterAnd, afterWith };
});
const heroVideo = ref<HTMLVideoElement>();
const heroVideoFallback = ref(false);
const heroVideoUrl = computed(() => {
  const configured = editableHero.value?.video?.trim() || '/assets/hero-video.mp4';
  const normalized = /^(?:https?:)?\/\//i.test(configured) || configured.startsWith('/') ? configured : `/${configured}`;
  const source = heroVideoFallback.value ? '/assets/hero-video.mp4' : resolveMediaUrl(normalized);
  return source;
});
const playHeroVideo = async () => {
  const video = heroVideo.value;
  if(!video || video.ended) return;
  video.muted = true;
  video.defaultMuted = true;
  try { await video.play(); } catch { /* The browser will retry on canplay. */ }
};
const handleHeroVideoError = () => {
  if (heroVideoFallback.value) return;
  heroVideoFallback.value = true;
  nextTick(() => {
    heroVideo.value?.load();
    playHeroVideo();
  });
};
watch(heroVideoUrl, () => nextTick(() => { heroVideo.value?.load(); playHeroVideo(); }));
onMounted(() => nextTick(playHeroVideo));

const toggleCategory = (category: DesignCategory) => {
  activeCategories.value = activeCategories.value.includes(category)
    ? activeCategories.value.filter(item => item !== category)
    : [...activeCategories.value, category];
};
</script>

<template>
  <main class="works-view">
    <section class="works-hero">
      <div class="works-hero-copy">
        <h1>{{ hero.title }}</h1>
        <p v-if="language === 'ru'" class="works-hero-subtitle works-hero-subtitle--ru"><span>{{ruSubtitleParts.beforeAnd}}</span><span class="works-hero-subtitle__and"> и {{ruSubtitleParts.afterAnd}}</span><span v-if="ruSubtitleParts.afterWith" class="works-hero-subtitle__with"> с {{ruSubtitleParts.afterWith}}</span></p>
        <p v-else>{{ hero.subtitle }}</p>

        <div class="works-hero-proof">
          <div v-for="(group, groupKey) in { worked: hero.worked, featured: hero.featured }" :key="groupKey" class="works-hero-proof-group">
            <div class="works-hero-proof-row">
              <span class="works-hero-proof__label">{{ group.label }}</span>
              <a
                v-for="(item, index) in group.items"
                :key="`${groupKey}-${index}`"
                class="works-hero-proof__badge"
                :class="{ 'works-hero-proof__badge--cyrillic': item.image.includes('cyrillic.png') }"
                :href="item.link || group.link || undefined"
                :target="item.link || group.link ? '_blank' : undefined"
                rel="noreferrer"
                :aria-label="item.alt"
              >
                <img v-if="item.image" :src="resolveMediaUrl(item.image)" :alt="item.alt">
                <span v-else>{{ item.alt }}</span>
              </a>
            </div>
          </div>
        </div>
      </div>

      <div class="works-hero-portrait" aria-hidden="true">
        <video ref="heroVideo" :src="heroVideoUrl" autoplay muted playsinline preload="auto" @canplay="playHeroVideo" @error="handleHeroVideoError" />
      </div>
    </section>

    <nav class="works-categories" aria-label="Design categories">
      <button
        type="button"
        class="works-categories__button"
        :class="{ 'works-categories__button--active': activeCategories.length === 0 }"
        :aria-pressed="activeCategories.length === 0"
        @click="activeCategories = []"
      >
        {{ categoryLabels[0] }}
      </button>
      <button
        v-for="(category, index) in categoryIds"
        :key="category"
        type="button"
        class="works-categories__button"
        :class="{ 'works-categories__button--active': activeCategories.includes(category) }"
        :aria-pressed="activeCategories.includes(category)"
        @click="toggleCategory(category)"
      >
        {{ categoryLabels[index + 1] || text.categories[index + 1] }}
        <span v-if="activeCategories.includes(category)" aria-hidden="true">×</span>
      </button>
    </nav>

    <WorksList :active-categories="activeCategories" />
  </main>
</template>

<style lang="scss" scoped>
@import '../assets/styles/main.scss';

.works-view {
  overflow-anchor: none;
  position: relative;
}

.works-hero {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 58%) minmax(420px, 42%);
  align-items: start;
  min-height: 512px;
  overflow: visible;

  &-copy {
    position: relative;
    z-index: 2;
    padding: 120px 0 0 118px;

    h1 {
      width: 850px;
      max-width: none;
      white-space: pre;
      text-wrap: nowrap;
      overflow-wrap: normal;
      word-break: normal;
      letter-spacing: -.055em;
      font-size: $font-size-h1;
      font-weight: 400;
      line-height: $line-height-h1;
      letter-spacing: 0;
    }

    p {
      max-width: 780px;
      margin-top: 16px;
      color: #8f8f95;

      span { color: inherit; }
      font-size: $font-size-h2;
      line-height: $line-height-h2;
    }
  }

  &-portrait {
    position: absolute;
    z-index: 1;
    top: 51px;
    right: 18px;
    height: 389px;
    width: 692px;
    overflow: hidden;
    background: #000;

    video {
      width: 100%;
      height: 100%;
      object-fit: cover;
      object-position: center 42%;
    }
  }

  &-proof {
    display: flex;
    align-items: flex-end;
    gap: 110px;
    margin-top: 40px;

    &-group {
      position: relative;

      &:hover,
      &:focus-within {
        z-index: 3;

      }
    }

    &-row {
      display: flex;
      align-items: center;
      position: relative;
    }

    &__label {
      margin-right: 12px;
      color: #75797D;
      font-size: $font-size-h3;
      line-height: $line-height-h3;
      white-space: nowrap;
    }

    &__badge {
      display: grid;
      place-items: center;
      width: 40px;
      height: 40px;
      margin-left: -4px;
      border-radius: 50%;
      background: transparent;
      color: #111;
      font-size: $font-size-h4;
      line-height: $line-height-h4;
      font-weight: 600;
      position: relative;
      background: transparent;
      z-index: 1;
      text-decoration: none;
      transition: transform .16s ease, z-index .16s ease;

      > img {
        width: 100%;
        height: 100%;
        border-radius: inherit;
        object-fit: cover;
      }

      &:hover, &:focus-visible { z-index: 3; transform: translateY(-2px); }

    }
  }
}

.works-categories {
  position: sticky;
  z-index: 15;
  top: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1053px;
  max-width: calc(100% - 24px);
  margin: 16px 0 40px 185px;
  padding: 8px;
  flex-wrap: wrap;
  overflow: visible;
    gap: 8px;
  background: rgba(0, 0, 0, .65);
  backdrop-filter: blur(12px);
  border-radius: 1000px;
  scrollbar-width: none;

  &::-webkit-scrollbar { display: none; }

  &__button {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    flex: none;
    height: 32px;
    padding: 0 8px;
    border: 0;
    border-radius: 1000px;
    background: transparent;
    color: $ui-white;
    cursor: pointer;
    font-size: $font-size-h3;
    line-height: $line-height-h3;
    white-space: nowrap;
    transition: background-color .18s ease, color .18s ease;

    &:hover,
    &--active {
      background: $ui-white;
      color: $ui-black;
    }

    span { color: inherit; font-size: $font-size-h3; line-height: $line-height-h3; }
  }
}

@container page (width < 1440px) {
  .works-hero {
    min-height: 404px;

    &-copy {
      padding: 58px 0 0 88px;
      width: 660px;

      h1 { width: 660px; }

      h1 {
        font-size: 56px;
        line-height: 56px;
      }

      p {
        margin-top: 16px;
        font-size: 20px;
        line-height: 28px;
      }
    }

    &-portrait {
      top: 12px;
      right: 16px;
      width: 496px;
      height: 279px;
    }

    &-proof {
      width: 904px;
      justify-content: space-between;
      margin-top: 32px;
    }
  }

.works-categories {
    width: 904px;
    min-height: 72px;
    justify-content: flex-start;
    flex-wrap: wrap;
    overflow: visible;
    margin: 16px auto 40px;
    padding: 0;
  }
}

@container page (min-width: 1440px) {
  .works-categories {
    flex-wrap: nowrap;
  }
}

@container page (width < 1080px) {
  .works-hero {
    display: flex;
    min-height: 0;
    flex-direction: column;
    align-items: stretch;
    overflow: visible;

    &-copy {
      order: 2;
      padding: 0 24px 42px;
      width: auto;

      h1 { width: 672px; max-width: 672px; }

      h1 {
        width: 328px;
        max-width: 328px;
        font-size: 64px;
        line-height: 64px;
      }

      p {
        font-size: 20px;
        line-height: 28px;
      }
    }

    &-portrait {
      position: relative;
      top: auto;
      right: auto;
      bottom: auto;
      order: 1;
      width: 574px;
      height: 322px;
      margin: 8px auto -4px;
      opacity: 1;

      video {
        object-position: center 38%;
      }
    }

    &-proof {
      display: flex;
      width: 672px;
      justify-content: space-between;
      margin: 24px auto 0;
    }
  }

  .works-categories {
    width: 656px;
    flex-wrap: wrap;
    overflow: visible;
    margin: 0 auto 32px;
  }
}

@container page (width < 720px) {
  .works-hero {
    &-copy {
      padding: 28px 16px 0;

      h1 {
        max-width: 100%;
        font-size: 32px;
        line-height: 32px;
        letter-spacing: 0;
      }

      p {
        max-width: 560px;
        margin-top: 10px;
        font-size: 16px;
        line-height: 22px;
      }
    }

    &-portrait {
      width: 336px;
      height: 188px;
      margin: -4px auto -6px;

      video {
        object-position: center 38%;
      }
    }

    &-proof {
      position: static;
      display: flex;
      flex-direction: column;
      align-items: flex-start;
      gap: 8px;
      width: auto;
      margin-top: 16px;

      &__badge {
        width: 32px;
        height: 32px;
        margin-left: 4px;
        font-size: $font-size-h4;
        line-height: $line-height-h4;
      }
      &__label {
        min-width: 0;
        margin-right: 4px;
        font-size: $font-size-h4;
        line-height: $line-height-h4;
      }
    }
  }

  .works-categories {
    position: relative;
    top: auto;
    flex-wrap: wrap;
    justify-content: flex-start;
    gap: 4px 0;
    width: 100%;
    max-width: 620px;
    margin: 32px auto 20px;
    padding: 0 12px;
    overflow: visible;
    border-radius: 0;
    background: transparent;
    box-shadow: none;
    backdrop-filter: none;

    &__button {
      height: 24px;
      padding: 0 8px;
      font-size: $font-size-h3;
      line-height: $line-height-h3;
    }
  }
}
/* Reference layouts: the page container, not the window, defines each step. */
.works-hero { min-height:472px; }
@container page (width >= 1440px) {
  .works-hero-copy { padding-left:134px; }
  .works-hero-copy h1 { transform:translateY(-8px); }
}
.works-categories { width:calc(100% - 40px); min-height:32px; margin:16px auto 40px; padding:0; justify-content:center; }
@container page (width >= 1080px) {
  .works-categories {
    width:max-content;
    max-width:calc(100% - 32px);
    min-height:32px;
    flex-wrap:nowrap;
    top:24px;
    isolation:isolate;
    background:transparent;
    backdrop-filter:none;
  }
  .works-categories::before {
    content:'';
    position:absolute;
    inset:-8px;
    z-index:-1;
    border-radius:1000px;
    background:rgba(0,0,0,.65);
    backdrop-filter:blur(12px);
    -webkit-backdrop-filter:blur(12px);
  }
}
@container page (width >= 1440px) {
  .works-categories { margin-top:24px; margin-bottom:32px; }
}
@container page (width < 1440px) {
  .works-hero { min-height:352px; }
  .works-hero-copy { padding:56px 0 0 40px; width:600px; }
  .works-hero-copy p { max-width:520px; margin-top:24px; }
  .works-hero-proof { width:max-content; justify-content:flex-start; gap:76px; margin-top:32px; }
}
@container page (1080px <= width < 1440px) {
  .works-hero-portrait { width:574px; height:323px; top:0; right:0; }
  .works-hero-subtitle__with { display:block; }
}
@container page (width < 1080px) {
  .works-hero { min-height:0; }
  .works-hero-copy { width:100%; padding:8px 20px 0; text-align:center; }
  .works-hero-copy h1 { width:100%; max-width:none; font-size:56px; line-height:56px; }
  .works-hero-copy p { max-width:none; margin-top:24px; }
  .works-hero-proof { width:100%; justify-content:space-between; gap:0; margin-top:24px; }
  .works-categories { width:680px; margin:48px auto 26px; min-height:72px; }
}
@container page (width < 720px) {
  .works-hero-portrait { margin:8px auto 0; }
  .works-hero-copy { padding:22px 16px 0; }
  .works-hero-copy h1 { width:100%; font-size:32px; line-height:32px; }
  .works-hero-copy p { margin-top:12px; }
  .works-hero-subtitle { text-wrap:balance; }
  .works-hero-subtitle__and { display:inline; }
  .works-hero-proof { flex-direction:row; justify-content:space-between; align-items:start; margin-top:22px; gap:0; }
  .works-hero-proof-row { flex-wrap:wrap; justify-content:center; }
  .works-hero-proof-group:first-child { width:116px; }
  .works-hero-proof-group:last-child { width:172px; }
  .works-hero-proof__label { width:100%; margin:0 0 8px; font-size:12px; line-height:20px; }
  .works-hero-proof__badge { flex:none; margin-left:-4px; }
  .works-hero-proof__badge:nth-child(2) { margin-left:0; }
  .works-categories { width:336px; max-width:100%; min-height:48px; padding:0; gap:0; margin:48px auto 28px; justify-content:center; }
  .works-categories__button { height:24px; font-size:12px; line-height:20px; padding:0 8px; }
}
</style>
