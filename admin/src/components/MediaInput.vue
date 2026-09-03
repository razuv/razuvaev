<script setup lang="ts">
import { computed, ref } from 'vue';
import { resolveMediaUrl, uploadMedia } from '@/api';

interface Props {
  modelValue: string;
  label?: string;
  accept?: string;
}

const props = withDefaults(defineProps<Props>(), {
  label: 'Ссылка или файл',
  accept: 'image/*,video/*',
});

const emit = defineEmits<{
  (event: 'update:modelValue', value: string): void;
}>();

const fileInput = ref<HTMLInputElement>();
const isDragging = ref(false);
const isLoading = ref(false);
const error = ref('');
const previewUrl = computed(() => props.modelValue ? resolveMediaUrl(props.modelValue) : '');
const isVideo = computed(() => /\.(mp4|webm|mov|m4v)(?:\?|$)/i.test(props.modelValue));

const selectFile = () => fileInput.value?.click();

const handleFile = async (file?: File) => {
  if(!file) return;

  isLoading.value = true;
  error.value = '';

  try {
    emit('update:modelValue', await uploadMedia(file));
  } catch (uploadError) {
    error.value = uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить файл';
  } finally {
    isLoading.value = false;
  }
};

const onDrop = (event: DragEvent) => {
  isDragging.value = false;
  handleFile(event.dataTransfer?.files[0]);
};
</script>

<template>
  <div class="media-input">
    <VTextField
      :model-value="modelValue"
      :label="label"
      @update:model-value="emit('update:modelValue', $event)"
    />

    <button
      type="button"
      class="media-input__dropzone"
      :class="{ 'media-input__dropzone--active': isDragging }"
      @click="selectFile"
      @dragenter.prevent="isDragging = true"
      @dragover.prevent="isDragging = true"
      @dragleave.prevent="isDragging = false"
      @drop.prevent="onDrop"
    >
      <input
        ref="fileInput"
        type="file"
        :accept="accept"
        hidden
        @change="handleFile(($event.target as HTMLInputElement).files?.[0])"
      >
      <VProgressCircular v-if="isLoading" indeterminate size="24" />
      <template v-else>
        <VIcon icon="mdi-tray-arrow-up" />
        <span>Перетащить файл или выбрать</span>
      </template>
    </button>

    <div v-if="previewUrl" class="media-input__preview">
      <video v-if="isVideo" :src="previewUrl" muted controls />
      <img v-else :src="previewUrl" alt="Предпросмотр">
    </div>

    <span v-if="error" class="media-input__error">{{ error }}</span>
  </div>
</template>

<style scoped lang="scss">
.media-input {
  display: grid;
  gap: 10px;
  width: 100%;
}

.media-input__dropzone {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 72px;
  width: 100%;
  border: 1px dashed rgba(var(--v-theme-on-surface), 0.5);
  border-radius: 16px;
  background: rgba(var(--v-theme-on-surface), 0.04);
  color: rgb(var(--v-theme-on-surface));
  cursor: pointer;
  transition: background-color 160ms ease, border-color 160ms ease;
}

.media-input__dropzone:hover,
.media-input__dropzone--active {
  border-color: rgb(var(--v-theme-on-surface));
  background: rgba(var(--v-theme-on-surface), 0.1);
}

.media-input__preview {
  overflow: hidden;
  max-width: 220px;
  border-radius: 12px;
}

.media-input__preview img,
.media-input__preview video {
  display: block;
  width: 100%;
}

.media-input__error {
  color: #ff7b7b;
  font-size: 12px;
}
</style>
