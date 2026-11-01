<template>
  <div class="status-switch">
    <!-- 只读状态药丸：仅展示，不再可点击 -->
    <span class="status-switch__pill" :style="{ '--pill-color': currentColor }">
      <span class="status-switch__dot" :style="{ background: currentColor }"></span>
      <span class="status-switch__label">{{ currentText }}</span>
    </span>

    <!-- 操作按钮：点击弹出模态框修改状态（模态框 teleport 到 body，避免被表格单元格遮挡） -->
    <button
      type="button"
      class="status-switch__btn"
      :class="{ 'is-loading': dialogLoading }"
      :disabled="!canEdit"
      :title="canEdit ? '修改状态' : ''"
      @click.stop.prevent="openDialog"
    >
      修改状态
    </button>

    <teleport to="body">
      <div v-if="dialog" class="ss-modal-overlay" @click.self="closeDialog">
        <div class="ss-modal" role="dialog" aria-modal="true">
          <div class="ss-modal__title">修改状态</div>
          <div class="ss-modal__list">
            <button
              v-for="c in choices"
              :key="String(c.value)"
              type="button"
              class="ss-modal__item"
              :class="{ 'is-active': c.value === localValue }"
              :disabled="dialogLoading"
              @click="choose(c)"
            >
              <span class="status-switch__dot" :style="{ background: c.color }"></span>
              <span class="ss-modal__item-label">{{ c.text }}</span>
              <span v-if="c.value === localValue" class="status-switch__check">✓</span>
            </button>
          </div>
          <div class="ss-modal__footer">
            <button
              type="button"
              class="ss-modal__cancel"
              :disabled="dialogLoading"
              @click="closeDialog"
            >
              取消
            </button>
          </div>
        </div>
      </div>
    </teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'

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

const dialog = ref(false)
const dialogLoading = ref(false)
const dialogRowId = ref<string | number | null>(null)
const localValue = ref<any>(props.value)
// 当前行主键在点击时解析（见 resolveRowId）

watch(
  () => props.value,
  (v) => {
    localValue.value = v
  },
)

// 列表（tabular）布局不会把行主键传给 display 组件，也没有全局 items store 可用，
// 因此无法直接从 props / store 拿到当前行 id。
// 解决方式（最可靠、且对「重复标题 / 空标题 / 重复状态」免疫）：
// 在点击发生时，从被点击元素向上找到所在 <tr>，取得它在 tbody 中的行下标；
// 再用与列表完全一致的排序 / 分页参数去接口拉取同一页数据，按下标取出主键 id。
// 为避免「用户正在筛选 / 改排序」导致行序不一致而误改，取出后会用该行的文本列值
// 与当前单元格做一次交叉校验，校验不过则判定无法确定、放弃切换（fail-closed）。
// 主键均为 id。COLUMNS 与本扩展在 bootstrap 中设置的 preset 列顺序一致。
const COLUMNS: Record<string, string[]> = {
  announcements: ['title', 'body', 'published_at', 'is_pinned', 'status'],
  cards: ['name', 'code', 'rarity_id', 'price', 'status'],
  banners: ['title', 'description', 'link', 'status'],
  info_pages: ['page_key', 'title', 'body', 'status'],
  shops: ['name', 'address', 'phone', 'business_hours', 'status'],
}
// 仅用「文本类」标识列做交叉校验（日期/数字/关系列在单元格里是格式化后的文本，
// 与接口存储值不一致，不能用于精确比对）。
const IDENT_FIELDS: Record<string, string[]> = {
  announcements: ['title'],
  cards: ['name', 'code'],
  banners: ['title', 'description', 'link'],
  info_pages: ['page_key', 'title'],
  shops: ['name', 'address', 'phone', 'business_hours'],
}
// 列表默认排序字段（手动排序字段），与各集合数据一致
const SORT_FIELD = 'sort'
// 表头中文标签 → 字段名：用于读取「当前用户手动排序列」，以复刻列表顺序
const HEADER_LABEL: Record<string, Record<string, string>> = {
  announcements: { 标题: 'title', 正文: 'body', 发布时间: 'published_at', 置顶: 'is_pinned', 发布状态: 'status' },
  cards: { 名称: 'name', 编码: 'code', 稀有度: 'rarity_id', 价格: 'price', 状态: 'status' },
  banners: { 标题: 'title', 描述: 'description', 链接: 'link', 状态: 'status' },
  info_pages: { 键: 'page_key', 标题: 'title', 正文: 'body', 状态: 'status' },
  shops: { 名称: 'name', 地址: 'address', 电话: 'phone', 营业时间: 'business_hours', 状态: 'status' },
}

function readCurrentPage(): number {
  try {
    const pag = document.querySelector('.pagination')
    if (pag) {
      const active = pag.querySelector('.active, [aria-current="page"], .is-active')
      if (active) {
        const n = parseInt((active.textContent || '').trim(), 10)
        if (!isNaN(n) && n > 0) return n
      }
      const txt = pag.textContent || ''
      const m = txt.match(/(\d+)\s*\/\s*(\d+)/) || txt.match(/第\s*(\d+)\s*页/)
      if (m) {
        const n = parseInt(m[1], 10)
        if (!isNaN(n) && n > 0) return n
      }
    }
  } catch {
    /* 忽略，回退第 1 页 */
  }
  return 1
}

function readSort(): { field: string; desc: boolean } | null {
  try {
    const ths = Array.from(document.querySelectorAll('thead th'))
    for (const th of ths) {
      const cls = th.getAttribute('class') || ''
      // Directus 实际使用的排序类是 `sort-asc` / `sort-desc`（部分版本为 sorted-asc/-desc）；
      // 拖拽手柄列是 `sorted-manually`，不表示数据列排序，需排除。
      const isSorted = /sort(?:ed)?-(asc|desc)/.test(cls) && !cls.includes('sorted-manually')
      if (isSorted) {
        const label = (th.textContent || '').replace(/\s+/g, '').trim()
        const field = HEADER_LABEL[props.collection]?.[label]
        if (field) return { field, desc: cls.includes('desc') }
      }
    }
  } catch {
    /* 忽略，回退默认排序 */
  }
  return null
}

function isDataTd(td: Element): boolean {
  const cls = (td.getAttribute('class') || '')
  return !cls.includes('manual') && !cls.includes('select') && !cls.includes('spacer')
}

async function resolveRowId(
  el: EventTarget | null,
): Promise<string | number | null> {
  const node = el as HTMLElement | null
  const tr = node?.closest?.('tr') as HTMLElement | null
  if (!tr) return null

  const cols = COLUMNS[props.collection]
  const identFields = IDENT_FIELDS[props.collection]
  if (!cols || !identFields) return null

  const dataTds = Array.from(tr.children).filter(isDataTd)
  const valueOf = (field: string): string => {
    const idx = cols.indexOf(field)
    if (idx < 0 || idx >= dataTds.length) return ''
    return (dataTds[idx].innerText || '').replace(/\s+/g, ' ').trim()
  }

  const origin = window.location.origin

  // 策略一：用「全部非空文本标识列 + 当前状态」组合精确过滤（与列表排序无关，最稳健）。
  // 适用于标识列唯一的情况（大多数集合的 name / code / link / page_key 等都唯一）。
  const filter: Record<string, any> = {}
  for (const f of identFields) {
    const v = valueOf(f)
    if (v && v !== '--') filter[f] = { _eq: v }
  }
  if (props.value != null && props.value !== '') filter[fieldName.value] = { _eq: props.value }
  if (Object.keys(filter).length) {
    try {
      const p = new URLSearchParams()
      p.set('fields', 'id')
      p.set('limit', '100')
      p.set('filter', JSON.stringify(filter))
      const res = await fetch(`${origin}/items/${props.collection}?${p.toString()}`, { credentials: 'include' })
      const arr = ((await res.json()) as { data?: Array<Record<string, any>> }).data || []
      if (arr.length === 1) return (arr[0].id ?? null) as string | number | null
      // 0 个或 >1 个（重复标识）则继续走策略二
    } catch {
      /* 继续策略二 */
    }
  }

  // 策略二：行下标映射。处理「重复标识」场景；并用文本列交叉校验，
  // 防止用户在筛选 / 改排序后行序错位导致误改其它行（fail-closed）。
  const tbody = tr.closest('tbody') as HTMLElement | null
  if (!tbody) return null
  const rows = Array.from(tbody.querySelectorAll(':scope > tr'))
  const index = rows.indexOf(tr)
  if (index < 0) return null

  const page = readCurrentPage()
  const limit = rows.length || 25
  const sort = readSort()
  try {
    const p = new URLSearchParams()
    p.set('fields', ['id', fieldName.value, ...identFields].join(','))
    p.set('limit', String(limit))
    p.set('page', String(page))
    if (sort) p.append('sort[]', sort.desc ? `-${sort.field}` : sort.field)
    else p.append('sort[]', SORT_FIELD)
    const res = await fetch(`${origin}/items/${props.collection}?${p.toString()}`, { credentials: 'include' })
    const arr = ((await res.json()) as { data?: Array<Record<string, any>> }).data || []
    const item = arr[index]
    if (!item) return null
    // 交叉校验：接口取回的这一行，其文本标识列应与当前单元格一致
    for (const f of identFields) {
      const rowVal = valueOf(f)
      if (!rowVal || rowVal === '--') continue
      if (String(item[f] ?? '') !== rowVal) return null
    }
    return (item.id ?? null) as string | number | null
  } catch {
    return null
  }
}

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

const canEdit = computed(() => !!props.collection && !dialogLoading.value)

function colorFor(v: any) {
  return (
    choices.value.find((c) => c.value === v)?.color ||
    COLOR_MAP[String(v)] ||
    '#b0b0b0'
  )
}

// 列表（tabular）display 的渲染上下文是隔离的：既没有 api 注入，也没有 Pinia store
// （useApi / useStores 都会抛 "[...] could not be found"）。因此这里用「同源 fetch +
// 会话 cookie」调接口，并用一个不依赖任何 store 的 DOM 小提示做反馈。
function toast(message: string, kind: 'success' | 'error' | 'warning' = 'success') {
  try {
    const el = document.createElement('div')
    el.textContent = message
    el.setAttribute('role', 'status')
    el.style.cssText =
      'position:fixed;left:50%;bottom:32px;transform:translateX(-50%);z-index:2147483647;' +
      'padding:10px 16px;border-radius:8px;color:#fff;font-size:13px;line-height:1.4;' +
      'box-shadow:0 6px 20px rgba(0,0,0,.3);max-width:80vw;opacity:1;transition:opacity .3s;'
    el.style.background = kind === 'error' ? '#d23f3f' : kind === 'warning' ? '#b8820a' : '#167a4a'
    document.body.appendChild(el)
    setTimeout(() => {
      el.style.opacity = '0'
      setTimeout(() => el.remove(), 320)
    }, 2600)
  } catch {
    /* 通知不影响数据结果 */
  }
}

// 点击「修改状态」按钮：先解析出当前行 id，再打开模态框（模态框 teleport 到 body）。
async function openDialog(e: Event) {
  if (!canEdit.value) return
  const id = await resolveRowId(e.currentTarget ?? null)
  if (id == null) {
    toast('无法确定该行的记录，请刷新列表或在详情页修改状态。', 'warning')
    return
  }
  dialogRowId.value = id
  dialog.value = true
}

async function choose(c: { value: any; text?: string }) {
  if (c.value === localValue.value) {
    closeDialog()
    return
  }
  if (dialogRowId.value == null) {
    closeDialog()
    return
  }
  const id = dialogRowId.value
  const previous = localValue.value
  // 乐观更新：先改 UI，请求失败再回滚
  localValue.value = c.value
  dialogLoading.value = true

  try {
    const origin = window.location.origin
    const res = await fetch(`${origin}/items/${props.collection}/${id}`, {
      method: 'PATCH',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [fieldName.value]: c.value }),
    })
    if (!res.ok) {
      const body = await res.text().catch(() => '')
      throw new Error(`HTTP ${res.status} ${body.slice(0, 200)}`)
    }
    toast(`已切换为「${c.text ?? c.value}」`, 'success')
    closeDialog()
  } catch (err: any) {
    localValue.value = previous
    toast(`状态切换失败：${err?.message ? String(err.message) : String(err)}`, 'error')
  } finally {
    dialogLoading.value = false
  }
}

function closeDialog() {
  dialog.value = false
  dialogRowId.value = null
}
</script>

<style scoped>
.status-switch {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* 只读状态药丸 */
.status-switch__pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  border: 1px solid var(--theme--border-color-subdued, #e0e0e0);
  background: var(--theme--background-subdued, #f5f5f5);
  border-radius: 14px;
  padding: 2px 10px;
  font-size: 13px;
  line-height: 20px;
  color: var(--theme--foreground, #1a1a1a);
}

.status-switch__dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
  flex: none;
}

/* 修改状态按钮 */
.status-switch__btn {
  border: 1px solid var(--theme--border-color-subdued, #cfcfcf);
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #1a1a1a);
  border-radius: 6px;
  padding: 2px 10px;
  font-size: 12px;
  line-height: 20px;
  cursor: pointer;
  transition: border-color 120ms ease, background 120ms ease;
}

.status-switch__btn:hover:not(:disabled) {
  border-color: var(--theme--primary, #6644ff);
  background: var(--theme--background-accent-subdued, #f3f0ff);
}

.status-switch__btn:disabled {
  opacity: 0.6;
  cursor: default;
}

.status-switch__btn.is-loading {
  opacity: 0.7;
  cursor: progress;
}

/* 模态框：teleport 到 body，不会被表格单元格 overflow 遮挡 */
.ss-modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 2147483646;
  background: rgba(0, 0, 0, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
}

.ss-modal {
  width: 280px;
  max-width: 90vw;
  background: var(--theme--background, #fff);
  border: 1px solid var(--theme--border-color-subdued, #e0e0e0);
  border-radius: 10px;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.25);
  overflow: hidden;
}

.ss-modal__title {
  padding: 12px 16px;
  font-size: 14px;
  font-weight: 600;
  color: var(--theme--foreground, #1a1a1a);
  border-bottom: 1px solid var(--theme--border-color-subdued, #eee);
}

.ss-modal__list {
  padding: 6px;
}

.ss-modal__item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  border: none;
  background: transparent;
  padding: 8px 10px;
  border-radius: 6px;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  color: var(--theme--foreground, #1a1a1a);
}

.ss-modal__item:hover:not(:disabled) {
  background: var(--theme--background-accent-subdued, #f3f0ff);
}

.ss-modal__item.is-active {
  font-weight: 600;
}

.ss-modal__item:disabled {
  opacity: 0.6;
  cursor: default;
}

.ss-modal__item-label {
  flex: 1;
}

.status-switch__check {
  color: var(--theme--primary, #6644ff);
}

.ss-modal__footer {
  padding: 8px 16px 12px;
  display: flex;
  justify-content: flex-end;
  border-top: 1px solid var(--theme--border-color-subdued, #eee);
}

.ss-modal__cancel {
  border: 1px solid var(--theme--border-color-subdued, #cfcfcf);
  background: var(--theme--background, #fff);
  color: var(--theme--foreground, #1a1a1a);
  border-radius: 6px;
  padding: 4px 14px;
  font-size: 13px;
  cursor: pointer;
}

.ss-modal__cancel:hover:not(:disabled) {
  border-color: var(--theme--primary, #6644ff);
}
</style>
