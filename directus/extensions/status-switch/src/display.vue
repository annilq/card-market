<template>
  <div ref="rootEl" class="status-switch">
    <button
      type="button"
      class="status-switch__pill"
      :class="{ 'is-loading': loading }"
      :style="{ '--pill-color': currentColor }"
      :disabled="!canEdit"
      :title="canEdit ? '点击切换状态' : ''"
      @click.stop="toggle"
    >
      <span class="status-switch__dot" :style="{ background: currentColor }"></span>
      <span class="status-switch__label">{{ currentText }}</span>
      <span class="status-switch__caret">▾</span>
    </button>

    <div v-if="open" class="status-switch__menu" @click.stop>
      <button
        v-for="c in choices"
        :key="String(c.value)"
        type="button"
        class="status-switch__item"
        :class="{ 'is-active': c.value === localValue }"
        @click="select(c)"
      >
        <span class="status-switch__dot" :style="{ background: c.color }"></span>
        <span class="status-switch__item-label">{{ c.text }}</span>
        <span v-if="c.value === localValue" class="status-switch__check">✓</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useApi, useStores } from '@directus/extensions-sdk'

const props = defineProps<{
  collection: string
  field: string
  type: string
  value: any
  display?: string | null
  options?: Record<string, any> | null
  interface?: string | null
  interfaceOptions?: Record<string, any> | null
  width?: string | null
  height?: string | null
  itemKey?: string | number | null
  primaryKey?: string | number | null
  item?: Record<string, any> | null
}>()

// 当字段接口选项里没带颜色时，按值匹配一套默认配色（与 Directus 状态语义一致）
const COLOR_MAP: Record<string, string> = {
  draft: '#f0a020',
  published: '#41b883',
  archived: '#6644ff',
  active: '#41b883',
  inactive: '#b0b0b0',
  new: '#f0a020',
  processed: '#41b883',
  pending: '#f0a020',
  spam: '#b0b0b0',
}

const DEFAULT_CHOICES = [
  { value: 'draft', text: '草稿', color: '#f0a020' },
  { value: 'published', text: '已发布', color: '#41b883' },
  { value: 'archived', text: '已归档', color: '#6644ff' },
]

const open = ref(false)
const loading = ref(false)
const localValue = ref<any>(props.value)
const rootEl = ref<HTMLElement | null>(null)

watch(
  () => props.value,
  (v) => {
    localValue.value = v
  },
)

const rowId = computed<string | number | null | undefined>(
  () => props.itemKey ?? props.primaryKey ?? props.item?.id ?? null,
)

const fieldName = computed(() => props.options?.fieldName || props.field || 'status')

const choices = computed(() => {
  const fromOptions = props.options?.choices
  const fromInterface = props.interfaceOptions?.choices
  const raw: any[] | undefined = Array.isArray(fromOptions)
    ? fromOptions
    : Array.isArray(fromInterface)
      ? fromInterface
      : undefined
  if (raw && raw.length) {
    return raw.map((c: any) => ({
      value: c.value,
      text: c.text ?? String(c.value),
      color: c.color || COLOR_MAP[String(c.value)] || '#b0b0b0',
    }))
  }
  return DEFAULT_CHOICES
})

const current = computed(
  () => choices.value.find((c) => c.value === localValue.value) || null,
)
const currentText = computed(
  () => current.value?.text ?? (localValue.value == null ? '—' : String(localValue.value)),
)
const currentColor = computed(() => current.value?.color || '#b0b0b0')

const canEdit = computed(
  () => rowId.value != null && !!props.collection && !loading.value,
)

function colorFor(v: any) {
  return (
    choices.value.find((c) => c.value === v)?.color ||
    COLOR_MAP[String(v)] ||
    '#b0b0b0'
  )
}

function toggle() {
  if (!canEdit.value) return
  open.value = !open.value
}

function close() {
  open.value = false
}

async function select(c: { value: any; text?: string }) {
  if (c.value === localValue.value) {
    close()
    return
  }
  const id = rowId.value
  if (id == null) return

  const api = useApi()
  const stores = useStores() as Record<string, any>
  const previous = localValue.value
  // 乐观更新：先改 UI，请求失败再回滚
  localValue.value = c.value
  open.value = false
  loading.value = true

  try {
    await api.patch(`/items/${props.collection}/${id}`, {
      [fieldName.value]: c.value,
    })
    // 直接更新列表 store，让当前行即时刷新（与后台侧边编辑后列表同步的机制一致）
    const itemsStore = stores.useItemsStore?.()
    if (itemsStore?.updateItem) {
      try {
        await itemsStore.updateItem(props.collection, id, {
          [fieldName.value]: c.value,
        })
      } catch {
        /* 列表 store 刷新失败不影响已持久化的数据，下次刷新即可看到 */
      }
    }
    const notify = stores.useNotificationsStore?.()
    notify?.add?.({
      title: `已切换为「${c.text ?? c.value}」`,
      type: 'success',
    })
  } catch (err: any) {
    localValue.value = previous
    const notify = stores.useNotificationsStore?.()
    notify?.add?.({
      title: '状态切换失败',
      text: err?.message ? String(err.message) : String(err),
      type: 'error',
    })
  } finally {
    loading.value = false
  }
}

function onDocClick(e: MouseEvent) {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) {
    close()
  }
}

watch(open, (v) => {
  if (v) document.addEventListener('click', onDocClick)
  else document.removeEventListener('click', onDocClick)
})

onBeforeUnmount(() => document.removeEventListener('click', onDocClick))
</script>

<style scoped>
.status-switch {
  position: relative;
  display: inline-block;
}

.status-switch__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--theme--border-color-subdued, #e0e0e0);
  background: var(--theme--background-subdued, #f5f5f5);
  border-radius: 14px;
  padding: 2px 10px;
  cursor: pointer;
  font-size: 13px;
  line-height: 20px;
  color: var(--theme--foreground, #1a1a1a);
  transition: border-color 120ms ease, background 120ms ease;
}

.status-switch__pill:hover:not(:disabled) {
  border-color: var(--pill-color, #999);
}

.status-switch__pill:disabled {
  opacity: 0.6;
  cursor: default;
}

.status-switch__pill.is-loading {
  opacity: 0.7;
  cursor: progress;
}

.status-switch__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex: none;
}

.status-switch__caret {
  font-size: 10px;
  opacity: 0.55;
}

.status-switch__menu {
  position: absolute;
  z-index: 50;
  margin-top: 4px;
  min-width: 150px;
  background: var(--theme--background, #fff);
  border: 1px solid var(--theme--border-color-subdued, #e0e0e0);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  padding: 4px;
}

.status-switch__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 6px 8px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  color: var(--theme--foreground, #1a1a1a);
}

.status-switch__item:hover {
  background: var(--theme--background-accent, #f3f0ff);
}

.status-switch__item.is-active {
  font-weight: 600;
}

.status-switch__check {
  margin-left: auto;
  color: var(--theme--primary, #6644ff);
}
</style>
