<template>
  <div class="map-picker">
    <div class="map-picker__search">
      <v-input
        v-model="query"
        :placeholder="options?.searchPlaceholder || '输入地址或地名，自动定位…'"
        :disabled="disabled"
        @keyup.enter="runSearch"
      >
        <template #append>
          <v-button
            class="map-picker__search-btn"
            small
            icon
            :loading="searching"
            :disabled="disabled"
            @click="runSearch"
          >
            <v-icon name="search" />
          </v-button>
        </template>
      </v-input>
    </div>

    <div v-if="results.length" class="map-picker__results">
      <button
        v-for="(r, i) in results"
        :key="i"
        type="button"
        class="map-picker__result"
        @click="selectResult(r)"
      >
        <span class="map-picker__result-label">{{ r.label }}</span>
      </button>
    </div>

    <div
      ref="mapEl"
      class="map-picker__map"
      :style="{ height: (options?.height || 360) + 'px' }"
    ></div>

    <small class="map-picker__hint">
      输入地址后地图自动定位（{{ debounceMs }}ms 阈值）；若返回多个候选，请在上方列表中选择其一。也可直接点击/拖动地图选取位置，自动反查地址回填输入框。
    </small>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Geo = { lat: number; lng: number; address?: string | null }

const props = defineProps<{
  value: Geo | null
  collection: string
  primaryKey: string | number
  field: string
  options: Record<string, any>
  disabled?: boolean
}>()

const emit = defineEmits<{ (e: 'input', value: Geo | null): void }>()

const mapEl = ref<HTMLDivElement | null>(null)
let map: L.Map | null = null
let marker: L.Marker | null = null

const query = ref('')
const searching = ref(false)
// 正向搜索返回的候选结果（多于 1 个时由用户选择其一）。
const results = ref<{ lat: number; lng: number; label: string }[]>([])
// 反向地理编码回填输入框时，抑制一次正向自动搜索，避免“搜索→回填→再搜索”回环。
const suppressNextSearch = ref(false)
// 用户是否已手动改过输入框/落点；为 true 时外部值（如保存后回写）不应覆盖正在进行的编辑。
const dirty = ref(false)
// 最近一次我们主动写出的 geo 序列化值；用于识别“自己写回的那次” props.value 变化，避免回环。
const lastEmitted = ref('')

// 当前经纬度来源于本字段值（geo 对象），无需触碰兄弟字段。
const lat = computed<number | null>(() => num(props.value?.lat))
const lng = computed<number | null>(() => num(props.value?.lng))

// 自动搜索的时间阈值（防抖），单位毫秒；0 表示输入即搜。
const debounceMs = computed<number>(() => {
  const d = num(props.options?.searchDebounce)
  return d == null ? 600 : d
})

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}
function round(n: number): number {
  return Math.round(n * 1e7) / 1e7
}

// 把任意 geo 值（对象或 JSON 字符串）规范化为可比较的序列化串；
// 用于判断“外部值”是否就是“我们自己刚写出的那次”，从而跳过，避免回环。
function serialize(v: unknown): string {
  if (!v) return ''
  let o: any = v
  if (typeof v === 'string') {
    try {
      o = JSON.parse(v)
    } catch {
      return ''
    }
  }
  if (!o || typeof o !== 'object') return ''
  const la = num(o.lat)
  const ln = num(o.lng)
  const a = (o.address ?? '').toString().trim()
  return JSON.stringify({
    lat: la == null ? null : round(la),
    lng: ln == null ? null : round(ln),
    address: a || null,
  })
}

// 把外部/已存的 geo 值同步到界面：回填地址输入框 + 落点（必要时反查地址）。
// 既能处理挂载时的值，也能处理晚到或保存后回写的值。字符串格式（个别版本）也会被解析。
function applyValue(v: unknown) {
  if (!v) return
  let o: any = v
  if (typeof v === 'string') {
    try {
      o = JSON.parse(v)
    } catch {
      return
    }
  }
  if (!o || typeof o !== 'object') return
  const a = (o.address ?? '').toString().trim()
  const la = num(o.lat)
  const ln = num(o.lng)
  if (a) {
    // 程序化回填，抑制一次自动搜索，避免“回填→再搜索”回环。
    suppressNextSearch.value = true
    query.value = a
  }
  if (la != null && ln != null) {
    placeMarker(la, ln)
    if (!a && props.options?.reverseOnClick !== false) reverseGeocode(la, ln)
  }
  dirty.value = false
  lastEmitted.value = serialize(v)
}

// 用语义令牌取色，深/浅主题下都可见（与前端 MapView 一致思路）。
const PIN_HTML = `
  <div style="transform:translate(-50%,-100%)">
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 12.1 20.4 12.7 20.9a2 2 0 0 0 2.6 0C15.9 34.4 28 23.5 28 14 28 6.27 21.73 0 14 0Z" fill="var(--theme--primary, #6741d9)"/>
      <circle cx="14" cy="14" r="5.5" fill="#fff"/>
    </svg>
  </div>`

function makeIcon() {
  return L.divIcon({
    className: 'map-picker__pin',
    html: PIN_HTML,
    iconSize: [28, 36],
    iconAnchor: [14, 36],
  })
}

function placeMarker(latVal: number, lngVal: number) {
  if (!map) return
  const ll: L.LatLngExpression = [latVal, lngVal]
  if (marker) {
    marker.setLatLng(ll)
  } else {
    marker = L.marker(ll, { draggable: true, icon: makeIcon() }).addTo(map)
    marker.on('dragend', () => {
      const p = marker!.getLatLng()
      writeGeo(p.lat, p.lng)
      if (props.options?.reverseOnClick !== false) reverseGeocode(p.lat, p.lng)
    })
  }
  map.setView(ll, map.getZoom() || (props.options?.defaultZoom || 13))
}

// 写回：把 {lat,lng,address} 作为本字段（geo）的值通过标准 input 通道发出。
// address 取自当前输入框文本，保证“地图选点 / 搜索框”这一唯一地址输入与存储一致。
function writeGeo(latVal: number, lngVal: number) {
  const payload: Geo = {
    lat: round(latVal),
    lng: round(lngVal),
    address: (query.value || '').trim() || null,
  }
  emit('input', payload)
  // 标记为用户主动写入，并记录序列化值：保存后回写的同一值会被识别并跳过，
  // 也不会在用户已编辑时被外部变化覆盖。
  dirty.value = true
  lastEmitted.value = serialize(payload)
}

// 正向地理编码：地址文本 → 候选坐标列表；多结果时由用户选择其一。
async function runSearch() {
  const q = (query.value || '').trim()
  if (!q || searching.value) return
  searching.value = true
  results.value = []
  try {
    const limit = num(props.options?.searchLimit) ?? 5
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=' +
      encodeURIComponent(String(limit)) +
      '&q=' +
      encodeURIComponent(q)
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await res.json()
    if (Array.isArray(data) && data.length) {
      const items = data
        .map((r: any) => ({
          lat: parseFloat(r.lat),
          lng: parseFloat(r.lon),
          label: r.display_name || r.name || q,
        }))
        .filter((r) => Number.isFinite(r.lat) && Number.isFinite(r.lng))
      if (items.length === 1) {
        // 唯一结果直接落点，省去一次点击
        selectResult(items[0])
      } else {
        results.value = items
      }
    }
  } catch (_e) {
    // 网络/限流失败则静默忽略，运营仍可手动点选
  } finally {
    searching.value = false
  }
}

// 选择某个候选结果：落点、定位、回写 geo，并用该候选地址填充输入框。
function selectResult(r: { lat: number; lng: number; label: string }) {
  results.value = []
  // 填充地址后抑制一次自动搜索，避免“回填→再搜索”回环。
  suppressNextSearch.value = true
  query.value = r.label
  if (map) {
    placeMarker(r.lat, r.lng)
    map.setZoom(props.options?.defaultZoom || 15)
  }
  writeGeo(r.lat, r.lng)
}

// 反向地理编码：坐标 → 地址，回填到输入框（抑制一次自动搜索，避免回环）。
async function reverseGeocode(latVal: number, lngVal: number) {
  try {
    const url =
      'https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=' +
      latVal +
      '&lon=' +
      lngVal
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await res.json()
    const addr = data?.display_name
    if (addr) {
      suppressNextSearch.value = true
      query.value = addr
      // 用反查得到的地址回写 geo.address，使唯一输入框与存储保持一致
      writeGeo(latVal, lngVal)
    }
  } catch (_e) {
    // 忽略失败，保留坐标即可
  }
}

// 输入防抖：超过时间阈值才触发正向搜索；程序化回填时跳过。
let searchTimer: ReturnType<typeof setTimeout> | null = null
watch(query, () => {
  if (suppressNextSearch.value) {
    suppressNextSearch.value = false
    return
  }
  // 用户手动输入：标记为脏，避免外部值（如保存后回写）覆盖正在进行的编辑。
  dirty.value = true
  if (searchTimer) clearTimeout(searchTimer)
  const ms = debounceMs.value
  if (ms <= 0) {
    runSearch()
    return
  }
  searchTimer = setTimeout(runSearch, ms)
})

// 字段值（含坐标）变化同步到地图标记
watch([lat, lng], ([la, ln]) => {
  if (map && la != null && ln != null) placeMarker(la, ln)
})

// 字段值（geo）变化兜底回显：挂载时若值晚到、或保存后回写、或外部修改，都重新同步到界面。
// 自己写出的那次（serialize 与 lastEmitted 相同）会被跳过，避免回环；
// 用户正在手动编辑（dirty）时也不覆盖。
watch(
  () => props.value,
  (v) => {
    if (serialize(v) === lastEmitted.value) return
    if (dirty.value) return
    applyValue(v)
  },
)

onMounted(() => {
  if (!mapEl.value || typeof window === 'undefined') return
  const defLat = num(props.options?.defaultLat) ?? 35.6812
  const defLng = num(props.options?.defaultLng) ?? 139.7671
  const startLat = lat.value ?? defLat
  const startLng = lng.value ?? defLng

  map = L.map(mapEl.value, { scrollWheelZoom: true }).setView(
    [startLat, startLng],
    props.options?.defaultZoom || 13,
  )
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  }).addTo(map)

  // 回显已存的 geo：地址回填输入框、坐标落点（必要时反查地址）；
  // 若字段值在挂载后才到达，上面的 watch 也会兜底同步。
  applyValue(props.value)

  map.on('click', (e: L.LeafletMouseEvent) => {
    results.value = []
    const { lat: la, lng: ln } = e.latlng
    placeMarker(la, ln)
    writeGeo(la, ln)
    if (props.options?.reverseOnClick !== false) reverseGeocode(la, ln)
  })
})

onBeforeUnmount(() => {
  if (map) {
    map.remove()
    map = null
    marker = null
  }
})
</script>

<style scoped>
.map-picker__search {
  margin-bottom: 8px;
}
.map-picker__search-btn {
  margin-right: -8px;
}
.map-picker__map {
  width: 100%;
  border-radius: var(--theme--border-radius, 8px);
  /* 避免地图瓦片层盖住表单里的下拉/弹层 */
  z-index: 0;
}
.map-picker__hint {
  display: block;
  margin-top: 6px;
  color: var(--theme--foreground-subdued);
}
.map-picker__results {
  margin: 6px 0 8px;
  border: 1px solid var(--theme--border-color, #e0e0e0);
  border-radius: var(--theme--border-radius, 8px);
  max-height: 220px;
  overflow-y: auto;
  background: var(--theme--background, #fff);
}
.map-picker__result {
  display: block;
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: none;
  border-bottom: 1px solid var(--theme--border-color-subdued, #eee);
  background: transparent;
  color: var(--theme--foreground, #1a1a1a);
  cursor: pointer;
  font-size: 13px;
  line-height: 1.4;
}
.map-picker__result:last-child {
  border-bottom: none;
}
.map-picker__result:hover {
  background: var(--theme--background-accent, #f3f0ff);
}
.map-picker__result-label {
  display: block;
  word-break: break-word;
}
</style>
