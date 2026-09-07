<script setup lang="ts">
defineProps<{open:boolean;title:string;description?:string}>()
defineEmits<{(event:'confirm'):void;(event:'cancel'):void}>()
</script>

<template>
  <Teleport to="body">
    <Transition name="confirm">
      <div v-if="open" class="confirm-backdrop" role="presentation" @mousedown.self="$emit('cancel')">
        <section class="confirm-dialog" role="alertdialog" aria-modal="true" :aria-label="title">
          <button class="confirm-close icon-button" type="button" aria-label="Закрыть" @click="$emit('cancel')">
            <img :src="'/assets/icons/icon-cross.svg'" alt="">
          </button>
          <h2>{{title}}</h2>
          <p v-if="description">{{description}}</p>
          <div class="confirm-actions">
            <button class="pill" type="button" @click="$emit('cancel')">Отмена</button>
            <button class="pill pill--light confirm-delete" type="button" @click="$emit('confirm')">Удалить</button>
          </div>
        </section>
      </div>
    </Transition>
  </Teleport>
</template>

<style scoped>
.confirm-backdrop{position:fixed;z-index:1000;inset:0;display:grid;place-items:center;padding:16px;background:rgba(0,0,0,.72);backdrop-filter:blur(8px)}
.confirm-dialog{position:relative;width:min(100%,400px);padding:24px;border-radius:12px;background:#1d1d1d;box-shadow:0 16px 60px rgba(0,0,0,.5)}
.confirm-dialog h2{margin:0 36px 8px 0;font-size:24px;line-height:32px;font-weight:400}.confirm-dialog p{margin:0;color:#aaa}.confirm-close{position:absolute;top:16px;right:16px}.confirm-actions{display:flex;justify-content:flex-end;gap:8px;margin-top:24px}.confirm-delete{background:#fff;color:#000}
.confirm-enter-active,.confirm-leave-active{transition:opacity .18s ease}.confirm-enter-active .confirm-dialog,.confirm-leave-active .confirm-dialog{transition:transform .18s ease,opacity .18s ease}.confirm-enter-from,.confirm-leave-to{opacity:0}.confirm-enter-from .confirm-dialog,.confirm-leave-to .confirm-dialog{opacity:0;transform:translateY(8px) scale(.98)}
</style>
