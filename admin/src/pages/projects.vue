<script setup lang="ts">
import { SettingsType, getSettings, setSettings } from '@/api';
import MediaInput from '@/components/MediaInput.vue';

type ProjectDetails = SettingsType['projects'][number]['items'][number];

const emptyProjectSetup = (iso: SettingsType['projects'][number]['iso']): SettingsType['projects'][number] => ({
  iso,
  items: []
});

// {
//       rules: {
//         nda: boolean;
//         details: boolean;
//       };
//       info: {
//         title: string;
//         year: string;
//         link: string;
//         images: string[];
//       };
//       details: {
//         theme: {
//           background: string;
//           textColor: string;
//         };
//         content: {
//           iso: string;
//           blocks: {
//             title: string;
//             text: string;
//           }[];
//         }[];
//       }
//     }

const emptyProject = (): ProjectDetails => ({
  rules: {
    nda: true,
    details: false,
    syncMedia: true
  },
  info: {
    title: '',
    year: '',
    link: '',
    images: []
  },
  details: {
    theme: {
      background: '#000000',
      textColor: '#FFFFFF'
    },
    content: []
  }
})

const languages = ref<SettingsType['languages']>();
const projects = ref<SettingsType['projects']>();

const currentLanguage = ref<SettingsType['biography'][number]['iso']>();
const currentProjects = ref<SettingsType['projects'][number]>();
const currentProject = ref<ProjectDetails>();
const isCurrentProjectDetailsOpen = ref<boolean>();
const isProjectCreating = ref<boolean>();
const isLoading = ref<boolean>();
const draggedProjectIndex = ref<number | null>(null);

const loadData = async () => {
  const response = await getSettings(true);
  languages.value = response.languages;
  projects.value = response.projects;
  response.projects.forEach(project => {
    project.items.forEach(item => {
      item.rules.syncMedia ??= true;
    });
  });

  if(languages.value && languages.value.length > 0) {
    openContent(languages.value[0].iso);
  }
}

// const onSave = async () => {
//   isLoading.value = true;

//   if(!biography.value) {
//     return alert('Системе не удалось получить информацию о биографии');
//   }

//   if(!currentBiography.value) {
//     return alert('Системе не удалось получить информацию о выбранной биографии по языке');
//   }

//   const biographyCopy = [ ...biography.value ];
//   const chosenBiographyIndex = biographyCopy.findIndex(b => b.iso === currentBiography.value?.iso);

//   if(chosenBiographyIndex >= 0) {
//     biographyCopy[chosenBiographyIndex] = { ...currentBiography.value };
//     biography.value = biographyCopy;

//     await setSettings('biography', biography.value);

//     isLoading.value = false;
//   }
// }

const onSave = async () => {
  isLoading.value = true;

  if(!currentProjects.value || !projects.value) {
    alert('Системе не удалось получить открытый список проектов');
    return;
  }

  const projectsCopy = [ ...projects.value ];
  const chosenProjectIndex = projectsCopy.findIndex(p => p.iso === currentProjects.value?.iso);

  if(chosenProjectIndex >= 0 && projectsCopy[chosenProjectIndex]) {
    projectsCopy.forEach(project => {
      if(project.iso === currentProjects.value?.iso) return;

      currentProjects.value?.items.forEach((sourceProject, index) => {
        if(project.items[index]) {
          project.items[index].rules.syncMedia = sourceProject.rules.syncMedia !== false;
          if(sourceProject.rules.syncMedia !== false) {
            project.items[index].info.images = sourceProject.info.images.map(image => ({ ...image }));
          }
        }
      });
    });

    projectsCopy[chosenProjectIndex] = currentProjects.value;
    projects.value = projectsCopy;

    await setSettings('projects', projects.value);

    isLoading.value = false;
  }
};

const openContent = (iso: SettingsType['languages'][number]['iso']) => {
  const isProjectFound = projects.value?.find(b => b.iso === iso);

  if(!isProjectFound) {
    projects.value?.push(emptyProjectSetup(iso));
  }

  const chosenProject = projects.value?.find(b => b.iso === iso);
  if(chosenProject) {
    currentLanguage.value = iso;
    currentProjects.value = { ...chosenProject };
  }
}

const moveItem = (originalArray: unknown[], idx: number, direction: number) => {
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

  originalArray = array_move(originalArray, idx, idx + direction);
  return originalArray;
}

const deleteItem = (originalArray: unknown[], idx: number) => {
  originalArray.splice(idx, 1);
  return originalArray;
}

const onProjectDragStart = (index: number, event: DragEvent) => {
  draggedProjectIndex.value = index;
  if(event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
};

const onProjectDrop = (targetIndex: number) => {
  const sourceIndex = draggedProjectIndex.value;
  draggedProjectIndex.value = null;

  if(sourceIndex === null || sourceIndex === targetIndex || !currentProjects.value) return;

  const [project] = currentProjects.value.items.splice(sourceIndex, 1);
  currentProjects.value.items.splice(targetIndex, 0, project);

  if(projects.value) {
    projects.value.forEach(locale => {
      if(locale.iso === currentLanguage.value || !locale.items[sourceIndex]) return;
      const [localizedProject] = locale.items.splice(sourceIndex, 1);
      locale.items.splice(targetIndex, 0, localizedProject);
    });
  }
};

const openProjectDetails = (project: ProjectDetails | null, visibility: boolean): ProjectDetails => {
  isProjectCreating.value = !project;
  isCurrentProjectDetailsOpen.value = !!visibility;

  if(!project) {
    currentProject.value = emptyProject();
  } else {
    currentProject.value = project;
  }

  return currentProject.value;
}

const onUpdateProject = () => {
  if(!currentProject.value) {
    alert('Системе не удалось получить открытый проект или создать его');
    return;
  }

  if(!currentProject.value.info.title) {
    alert('Проект должен иметь название');
    return;
  }

  if(!currentProject.value.info.images || (currentProject.value.info.images && currentProject.value.info.images.length <= 0)) {
    alert('Проект должен иметь хотя бы одну картинку');
    return;
  }

  if(!currentProjects.value) {
    alert('Системе не удалось получить открытый список проектов');
    return;
  }
  if(isProjectCreating.value) {
    currentProjects.value.items.push(currentProject.value);
  }
  openProjectDetails(null, false);
};

onMounted(() => {
  loadData();

  // openProjectDetails(null, true);
});
</script>

<template>
  <VRow class="match-height" v-if="currentProjects">
    <VCol cols="12" md="2">
      <v-list v-if="projects" style="height: 100%">
        <v-list-item title="Язык"></v-list-item>
        <v-divider></v-divider>
        <v-list-item
          v-for="lang in languages"
          :key="lang.iso"
          link
          :title="lang.name"
          :active="lang.iso === currentLanguage"
          :class="{
            'text-error': !projects.find(b => b.iso === lang.iso)
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
        <VCard title="Проекты">
          <VTable>
            <thead>
              <tr>
                <th class="text-uppercase">
                  Проект
                </th>
                <th class="text-uppercase">
                  Общее медиа
                </th>
                <th class="text-uppercase">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(project, idx) in currentProjects.items"
                :key="`${project.info.title}-${idx}`"
                draggable="true"
                class="project-row"
                :class="{ 'project-row--dragging': draggedProjectIndex === idx }"
                @dragstart="onProjectDragStart(idx, $event)"
                @dragend="draggedProjectIndex = null"
                @dragover.prevent
                @drop.prevent="onProjectDrop(idx)"
              >
                <td>
                  <div class="project-row__title">
                    <VIcon icon="mdi-drag" size="20" />
                    {{ project.info.title }}
                  </div>
                </td>
                <td style="width: 150px">
                  <VSwitch
                    v-model="project.rules.syncMedia"
                    class="project-row__media-switch"
                    :aria-label="`Общее медиа для языков: ${project.info.title}`"
                    hide-details
                  />
                </td>
                <td style="width: 280px">
                  <VBtn class="mr-1" size="small" color="warning" @click="openProjectDetails(project, true)">
                    <VIcon icon="mdi-pen" />
                  </VBtn>
                  <VBtn size="small" color="error" @click="deleteItem(currentProjects.items, idx)">
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
              @click="openProjectDetails(null, true)"
            >
              Добавить
            </VBtn>
          </VCardActions>
        </VCard>
      </VCol>
    </VCol>
  </VRow>

  <VDialog v-model="isCurrentProjectDetailsOpen" maxWidth="740">
    <VCard
      v-if="currentProject"
      class="pa-5"
      :title="`${isProjectCreating ? 'Создание' : 'Редактирование'} проекта`"
    >
      <VRow class="px-5 mb-1">
        <VCol>
          <VTextField
            label="Название *"
            v-model="currentProject.info.title"
          />
        </VCol>
      </VRow>

      <VRow class="px-5 mb-1">
        <VCol>
          <VTextField
            label="Год"
            v-model="currentProject.info.year"
          />
        </VCol>
      </VRow>

      <VRow class="px-5 mb-1">
        <VCol>
          <VTextField
            label="Ссылка"
            v-model="currentProject.info.link"
          />
        </VCol>
      </VRow>

      <VRow
        class="px-5 mb-1 align-center"
        v-for="(image, image_idx) in currentProject.info.images"
        :key="`image-project-${image_idx}`"
      >
        <VCol>
          <MediaInput
            v-model="image.link"
            :label="`Медиа #${image_idx + 1} *`"
          />
        </VCol>

        <VCol cols="2">
          <VBtn color="error" @click="deleteItem(currentProject.info.images, image_idx)">
            <VIcon icon="mdi-trash" />
          </VBtn>
        </VCol>
      </VRow>

      <VRow class="px-5 mb-1">
        <VCol>
          <VBtn variant="outlined" color="warning" class="mr-2" @click="currentProject.info.images.push({ link: '' })">
            Добавить картинку
          </VBtn>
        </VCol>
      </VRow>

      <VRow class="px-5">
        <VCol>
          <VSwitch v-model="currentProject.rules.nda" label="Защищен NDA"/>
        </VCol>
      </VRow>

      <VRow class="px-5 mb-1">
        <VCol>
          <VSwitch v-model="currentProject.rules.details" label="Разрешено открыть детали"/>
        </VCol>
      </VRow>

      <VRow class="px-5 mb-1">
        <VCol cols="1">
          <div style="width: 48px; height: 48px; border-radius: 8px;" :style="`background-color: ${currentProject.details.theme.background}`" />
        </VCol>

        <VCol cols="11">
          <VTextField
            label="Цвет фона"
            v-model="currentProject.details.theme.background"
          />
        </VCol>
      </VRow>

      <VRow class="px-5 mb-1">
        <VCol cols="1">
          <div style="width: 48px; height: 48px; border-radius: 8px;" :style="`background-color: ${currentProject.details.theme.textColor}`" />
        </VCol>

        <VCol cols="11">
          <VTextField
            label="Цвет текста"
            v-model="currentProject.details.theme.textColor"
          />
        </VCol>
      </VRow>

      <VRow class="px-5 mb-1 align-center" v-for="(content, content_idx) in currentProject.details.content">

        <VCol cols="10">
          <VTextField
            label="Заголовок"
            v-model="content.title"
          />
        </VCol>

        <VCol cols="2">
          <VBtn color="error" @click="deleteItem(currentProject.details.content, content_idx)">
            <VIcon icon="mdi-trash" />
          </VBtn>
        </VCol>

        <VCol cols="12" style="margin-top: -15px;">
          <VTextarea
            label="Текст"
            v-model="content.text"
          />
        </VCol>
      </VRow>

      <VRow class="px-5 mb-1">
        <VCol>
          <VBtn variant="outlined" color="warning" class="mr-2" @click="currentProject.details.content.push({ title: '', text: '' })">
            Добавить контент-блок
          </VBtn>
        </VCol>
      </VRow>
      
      <VRow class="px-5 mb-1">
        <VCol>
          <VBtn variant="outlined" color="success" class="mr-2" @click="onUpdateProject">
            {{ isProjectCreating ? 'Создать' : 'Обновить' }}
          </VBtn>
        </VCol>
      </VRow>
    </VCard>
  </VDialog>
</template>

<style scoped lang="scss">
.project-row {
  cursor: grab;
  transition: opacity 160ms ease, background-color 160ms ease;
}

.project-row:hover {
  background: rgba(255, 255, 255, .04);
}

.project-row--dragging {
  opacity: .35;
}

.project-row__title {
  display: flex;
  align-items: center;
  gap: 10px;
}

.project-row__media-switch {
  width: fit-content;
  transform: scale(.78);
  transform-origin: left center;
}
</style>
