<script setup lang="ts">
import { computed, ref, watch } from 'vue'
const props = defineProps<{ modelValue?: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const normalize = (value: string) => {
  const hex = value.trim().replace(/^#/, '')
  if (/^[\da-f]{3}$/i.test(hex)) return '#' + [...hex].map(char => char + char).join('').toUpperCase()
  return /^[\da-f]{6}$/i.test(hex) ? '#' + hex.toUpperCase() : null
}
const draft = ref(props.modelValue || '')
const invalid = ref(false)
const color = computed(() => normalize(props.modelValue || '') || '#000000')
watch(() => props.modelValue, value => { draft.value = value || ''; invalid.value = false })
const commit = () => {
  const value = normalize(draft.value)
  invalid.value = !value
  if (value) { draft.value = value; emit('update:modelValue', value) }
}
const pick = (event: Event) => {
  draft.value = (event.target as HTMLInputElement).value
  commit()
}
</script>
<template>
  <span class="color-input">
    <input :value="color" class="control color-input__picker" type="color" aria-label="Выбрать цвет" @input="pick">
    <input v-model="draft" class="control color-input__hex" type="text" aria-label="Цвет HEX" placeholder="#RRGGBB" :aria-invalid="invalid" spellcheck="false" @input="invalid=false" @change="commit" @keydown.enter.prevent="commit">
    <small v-if="invalid" role="alert">Введите 3 или 6 HEX-символов, например #2FC1CB</small>
  </span>
</template>
<style scoped>
.color-input{display:flex;flex-wrap:wrap;gap:8px;min-width:0}.color-input__picker{width:48px;flex:none;padding:4px}.color-input__hex{width:0;min-width:80px;flex:1;font-family:monospace}.color-input__hex[aria-invalid=true]{border-color:#ff8a80}.color-input small{width:100%;color:#ff8a80}
</style>
