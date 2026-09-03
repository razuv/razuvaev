<script setup lang="ts">
import { SettingsType, Social, getSettings, setSettings } from '@/api';
import MediaInput from '@/components/MediaInput.vue';

const emptyBio = (iso: SettingsType['biography'][number]['iso']): SettingsType['biography'][number] => ({
  iso,
  text: '',
  contacts: [],
  feed: []
});

const languages = ref<SettingsType['languages']>();
const biography = ref<SettingsType['biography']>();
const currentLanguage = ref<SettingsType['biography'][number]['iso']>();
const currentBiography = ref<SettingsType['biography'][number]>();
const isFeedModalActive = ref<boolean>(false);
const isLoading = ref<boolean>(false);

const feedCreatingText = ref<string>('');
const feedCreatingLink = ref<string>('');
const feedCreatingImage = ref<string>('');

const loadData = async () => {
  const response = await getSettings(true);
  languages.value = response.languages;
  biography.value = response.biography;

  if(languages.value && languages.value.length > 0) {
    openContent(languages.value[0].iso);
  }
}

const onSave = async () => {
  isLoading.value = true;

  if(!biography.value) {
    return alert('Системе не удалось получить информацию о биографии');
  }

  if(!currentBiography.value) {
    return alert('Системе не удалось получить информацию о выбранной биографии по языке');
  }

  const biographyCopy = [ ...biography.value ];
  const chosenBiographyIndex = biographyCopy.findIndex(b => b.iso === currentBiography.value?.iso);

  if(chosenBiographyIndex >= 0) {
    biographyCopy[chosenBiographyIndex] = { ...currentBiography.value };
    biography.value = biographyCopy;

    await setSettings('biography', biography.value);
    // setSettings('projects', []);

    isLoading.value = false;
  }
}

const openContent = (iso: SettingsType['languages'][number]['iso']) => {
  const isBiographyFound = biography.value?.find(b => b.iso === iso);

  if(!isBiographyFound) {
    biography.value?.push(emptyBio(iso));
  }

  const chosenBiography = biography.value?.find(b => b.iso === iso);
  if(chosenBiography) {
    currentLanguage.value = iso;
    currentBiography.value = { ...chosenBiography };
  }
  loadDefaultContacts();
}

const loadDefaultContacts = () => {
  const defaultSocials: Social[] = ['email', 'medium', 'dribble', 'behance', 'facebook', 'linkedin', 'telegram'];
  defaultSocials.forEach(defaultSocial => {
    if(currentBiography.value && currentBiography.value.contacts) {
      if(!currentBiography.value.contacts.find(c => c.type === defaultSocial)) {
        currentBiography.value.contacts.push({ type: defaultSocial, link: '', visible: false });
      }

      currentBiography.value.contacts = currentBiography.value?.contacts.sort((a, b) => defaultSocials.indexOf(a.type) - defaultSocials.indexOf(b.type));
    }
  });
}

const moveFeed = (currentIdx: number, direction: number) => {
  function array_move(arr: unknown[], old_index: number, new_index: number) {
    if (new_index >= arr.length) {
        var k = new_index - arr.length + 1;
        while (k--) {
            arr.push(undefined);
        }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
    return arr;
  };
  if(currentBiography.value && currentBiography.value.feed) {
    currentBiography.value.feed = array_move(currentBiography.value.feed, currentIdx, currentIdx + direction) as SettingsType['biography'][number]['feed'];
  }
}

const deleteFeed = (idx: number) => {
  currentBiography.value?.feed.splice(idx, 1);
}

const addFeed = () => {
  if(!feedCreatingText.value || !feedCreatingLink.value || !feedCreatingImage.value) {
    return alert('Необходимо указать текст новости, ссылку и ссылку на картинку')
  }

  if(!currentBiography.value?.feed) {
    return alert('Данные о настройках неизвестны системе')
  }

  currentBiography.value.feed.unshift({
    text: feedCreatingText.value,
    link: feedCreatingLink.value,
    image: feedCreatingImage.value
  });

  feedCreatingText.value = '';
  feedCreatingLink.value = '';
  feedCreatingImage.value = '';

  isFeedModalActive.value = false;
}

onMounted(() => {
  loadData();
});
</script>

<template>
  <VRow class="match-height" v-if="currentBiography">
    <VCol cols="12" md="2">
      <v-list v-if="biography" style="height: 100%">
        <v-list-item title="Язык"></v-list-item>
        <v-divider></v-divider>
        <v-list-item
          v-for="lang in languages"
          :key="lang.iso"
          link
          :title="lang.name"
          :active="lang.iso === currentLanguage"
          :class="{
            'text-error': !biography.find(b => b.iso === lang.iso) || !(biography.find(b => b.iso === lang.iso)?.text)
          }"
          @click="openContent(lang.iso)"
        />
      </v-list>
    </VCol>

    <VCol cols="12" md="10">
      <VCol class="d-flex" cols="12">
        <VBtn class="ml-auto" color="success" variant="outlined" @click="onSave" :loading="isLoading">
          Сохранить
        </VBtn>
      </VCol>

      <VCol cols="12">
        <VTextarea label="О себе" v-model="currentBiography.text"></VTextarea>
      </VCol>

      <VCol cols="12">
        <VCard title="Контакты">
          <VTable>
            <thead>
              <tr>
                <th class="text-uppercase">
                  Название
                </th>
                <th class="text-uppercase">
                  Ссылка
                </th>
                <th class="text-uppercase">
                  Видимость
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="contact in currentBiography.contacts"
                :key="contact.type"
              >
                <td>{{ contact.type }}</td>
                <td class="py-2">
                  <VTextField
                    v-model="contact.link"
                    placeholder="Ссылка"
                  />
                </td>
                <td>
                  <VSwitch v-model="contact.visible" />
                </td>
              </tr>
            </tbody>
          </VTable>
        </VCard>
      </VCol>

      <VCol cols="12">
        <VCard title="Лента">
          <VTable>
            <thead>
              <tr>
                <th class="text-uppercase px-1">
                  Текст
                </th>
                <th class="text-uppercase px-1">
                  Ссылка
                </th>
                <th class="text-uppercase px-1">
                  Картинка
                </th>
                <th class="text-uppercase px-1" style="width: 150px">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(news, idx) in currentBiography.feed"
                :key="`new-feed-${idx}`"
              >
                <td class="py-2 px-1">
                  <VTextField
                    v-model="news.text"
                    placeholder="Текст"
                  />
                </td>
                <td class="py-2 px-1">
                  <VTextField
                    v-model="news.link"
                    placeholder="Ссылка"
                  />
                </td>
                <td class="py-2 px-1">
                  <MediaInput
                    v-model="news.image"
                    label="Изображение или видео"
                  />
                </td>
                <td class="px-1" style="width: 200px">
                  <VBtn class="mr-1" size="small" variant="outlined" @click="moveFeed(idx, -1)" :disabled="idx <= 0">
                    <VIcon icon="mdi-arrow-up-thin" />
                  </VBtn>
                  <VBtn class="mr-1" size="small" variant="outlined" @click="moveFeed(idx, 1)" :disabled="idx >= currentBiography.feed.length - 1">
                    <VIcon icon="mdi-arrow-down-thin" />
                  </VBtn>
                  <VBtn size="small" color="error" @click="deleteFeed(idx)">
                    <VIcon icon="mdi-trash" />
                  </VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>

          <VCardActions>
            <VBtn
              append-icon="mdi-plus"
              variant="outlined"
              class="mt-5"
              @click="isFeedModalActive = true"
            >
              Добавить
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>
    </VCol>
  </VRow>

  <VDialog v-model="isFeedModalActive" width="400">
    <VCard class="pa-5" title="Добавление новости в ленту">
      <VTextField
        v-model="feedCreatingText"
        placeholder="Текст"
        class="mb-2"
      />

      <VTextField
        v-model="feedCreatingLink"
        placeholder="Ссылка"
        class="mb-2"
      />

      <MediaInput
        v-model="feedCreatingImage"
        label="Изображение или видео"
        class="mb-2"
      />

      <VBtn color="success" @click="addFeed">
        Добавить
      </VBtn>
    </VCard>
  </VDialog>
</template>
