<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { getChangeHistory, restoreChange, type ChangeHistoryEntry } from '@/api'
import ConfirmDialog from '@/components/ConfirmDialog.vue'

const entries = ref<ChangeHistoryEntry[]>([])
const loading = ref(true)
const restoring = ref(false)
const error = ref('')
const message = ref('')
const selectedScope = ref('all')
const pending = ref<ChangeHistoryEntry | null>(null)
const dateTime = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'medium', timeStyle: 'medium' })
const scopes = computed(() => [...new Set(entries.value.map(entry => entry.scope))])
const filtered = computed(() => selectedScope.value === 'all' ? entries.value : entries.value.filter(entry => entry.scope === selectedScope.value))

function scopeName(scope: string): string {
  if (scope === 'project-workspace') return 'Кейсы, все языки'
  if (scope === 'languages') return 'Языки'
  if (scope === 'tv') return 'TV'
  if (scope.startsWith('biography:')) return `Главная, CV и футер · ${scope.slice(10).toUpperCase()}`
  if (scope.startsWith('projects:')) return `Кейсы · ${scope.slice(9).toUpperCase()}`
  return scope
}

async function load() {
  loading.value = true
  error.value = ''
  try { entries.value = await getChangeHistory() }
  catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось загрузить историю' }
  finally { loading.value = false }
}

async function restore() {
  if (!pending.value || restoring.value) return
  const entry = pending.value
  restoring.value = true
  error.value = ''
  message.value = ''
  try {
    await restoreChange(entry.id)
    pending.value = null
    await load()
    message.value = `Версия #${entry.id} восстановлена. Откройте нужный раздел, чтобы увидеть изменения.`
    if (entry.scope === 'languages') window.location.reload()
  } catch (cause) { error.value = cause instanceof Error ? cause.message : 'Не удалось восстановить версию' }
  finally { restoring.value = false }
}

onMounted(load)
</script>

<template>
  <section class="history-page">
    <header class="history-heading"><div><h1>История изменений</h1><p>Сохранённые версии остаются после закрытия админки. Восстановление добавляет новую запись в историю.</p></div><button class="pill" type="button" :disabled="loading" @click="load">Обновить</button></header>
    <p v-if="error" class="history-error" role="alert">{{error}}</p>
    <p v-if="message" class="history-message" role="status">{{message}}</p>
    <p v-if="loading" class="history-muted" role="status">Загружаю историю…</p>
    <template v-else>
      <label v-if="scopes.length" class="history-filter field"><span>Раздел</span><select v-model="selectedScope" class="control"><option value="all">Все разделы</option><option v-for="scope in scopes" :key="scope" :value="scope">{{scopeName(scope)}}</option></select></label>
      <p v-if="!filtered.length" class="history-muted">История появится после первого сохранения.</p>
      <ol v-else class="history-list"><li v-for="entry in filtered" :key="entry.id" class="history-entry"><div><span class="history-scope">{{scopeName(entry.scope)}}</span><h2>{{entry.action}}</h2><time :datetime="entry.createdAt">{{dateTime.format(new Date(entry.createdAt))}}</time></div><button class="pill pill--outline" type="button" :disabled="restoring" @click="pending=entry">Восстановить</button></li></ol>
    </template>
    <ConfirmDialog :open="!!pending" title="Восстановить сохранённую версию?" :description="pending ? `${scopeName(pending.scope)} · ${dateTime.format(new Date(pending.createdAt))}. Текущие данные этого раздела будут заменены; восстановление тоже сохранится в истории.` : ''" confirm-label="Восстановить" @confirm="restore" @cancel="pending=null"/>
  </section>
</template>

<style scoped>
.history-page{max-width:960px}.history-heading{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;margin-bottom:32px}.history-heading h1{font-size:32px;line-height:40px;font-weight:400;margin:0 0 8px}.history-heading p{color:#aaa;max-width:650px;margin:0}.history-filter{display:grid;gap:8px;max-width:320px;margin-bottom:20px}.history-list{display:grid;gap:8px;list-style:none;margin:0;padding:0}.history-entry{display:flex;align-items:center;justify-content:space-between;gap:24px;padding:16px 20px;border:1px solid #343434;border-radius:12px;background:#151515}.history-entry h2{font-size:18px;line-height:26px;font-weight:400;margin:4px 0}.history-entry time,.history-scope,.history-muted{color:#aaa;font-size:14px;line-height:22px}.history-error{color:#ff8a80}.history-message{color:#bce8c0}.history-entry button{flex:none}@media(max-width:719px){.history-heading,.history-entry{align-items:flex-start;flex-direction:column}.history-entry{gap:12px}}
</style>
