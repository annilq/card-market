<template>
  <div class="map-picker">
    <div class="map-picker__search">
      <v-input
        v-model="query"
        :placeholder="options.searchPlaceholder || '输入地址或地名，回车搜索…'"
        :disabled="disabled"
        @keyup.enter="search"
      >
        <template #append>
          <v-button
            class="map-picker__search-btn"
            small
            icon
            :loading="searching"
            :disabled="disabled"
            @click="search"
          >
            <v-icon name="search" />
          </v-button>
        </template>
      </v-input>
    </div>

    <div
      ref="mapEl"
      class="map-picker__map"
      :style="{ height: (options.height || 360) + 'px' }"
    ></div>

    <div class="map-picker__coords">
      <v-input
        v-model="latText"
        type="number"
        label="纬度 lat"
        step="0.0000001"
        :disabled="disabled"
        @update:model-value="onManualCoords"
      />
      <v-input
        v-model="lngText"
        type="number"
        label="经度 lng"
        step="0.0000001"
        :disabled="disabled"
        @update:model-value="onManualCoords"
      />
    </div>

    <small class="map-picker__hint">
      点击地图或拖动标记设置位置；也可直接输入坐标，或在上方搜索地址后由地图自动定位。
    </small>
  </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch } from 'vue'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

type Geo = { lat: number; lng: number }

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

// 当前经纬度来源于本字段值（geo 对象），无需触碰兄弟字段。
const lat = computed<number | null>(() => num(props.value?.lat))
const lng = computed<number | null>(() => num(props.value?.lng))

const latText = ref('')
const lngText = ref('')
watch(lat, (v) => { latText.value = v == null ? '' : String(v) }, { immediate: true })
watch(lng, (v) => { lngText.value = v == null ? '' : String(v) }, { immediate: true })

function num(v: unknown): number | null {
  if (v === null || v === undefined || v === '') return null
  const n = typeof v === 'number' ? v : parseFloat(String(v))
  return Number.isFinite(n) ? n : null
}
function round(n: number): number {
  return Math.round(n * 1e7) / 1e7
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
      writeCoords(p.lat, p.lng)
    })
  }
  map.setView(ll, map.getZoom() || (props.options?.defaultZoom || 13))
}

// 写回：直接把 {lat,lng} 作为本字段（geo）的值通过标准 input 通道发出。
function writeCoords(latVal: number, lngVal: number) {
  emit('input', { lat: round(latVal), lng: round(lngVal) })
}

async function search() {
  const q = (query.value || '').trim()
  if (!q || searching.value) return
  searching.value = true
  try {
    const url =
      'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=' +
      encodeURIComponent(q)
    const res = await fetch(url, { headers: { Accept: 'application/json' } })
    const data = await res.json()
    if (Array.isArray(data) && data.length) {
      const r = data[0]
      const la = parseFloat(r.lat)
      const ln = parseFloat(r.lon)
      if (Number.isFinite(la) && Number.isFinite(ln)) {
        if (map) {
          placeMarker(la, ln)
          map.setZoom(props.options?.defaultZoom || 15)
        }
        writeCoords(la, ln)
      }
    }
  } catch (_e) {
    // 网络/限流失败则静默忽略，运营仍可手动点选或输入坐标
  } finally {
    searching.value = false
  }
}

function onManualCoords() {
  const la = parseFloat(latText.value)
  const ln = parseFloat(lngText.value)
  if (Number.isFinite(la) && Number.isFinite(ln)) {
    if (map) placeMarker(la, ln)
    writeCoords(la, ln)
  }
}

// 地图/搜索写入后，同步把标记移动到新坐标
watch([lat, lng], ([la, ln]) => {
  if (map && la != null && ln != null) placeMarker(la, ln)
})

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

  if (lat.value != null && lng.value != null) placeMarker(lat.value, lng.value)

  map.on('click', (e: L.LeafletMouseEvent) => {
    const { lat: la, lng: ln } = e.latlng
    placeMarker(la, ln)
    writeCoords(la, ln)
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
.map-picker__coords {
  display: flex;
  gap: 12px;
  margin-top: 8px;
}
.map-picker__coords > * {
  flex: 1;
}
.map-picker__hint {
  display: block;
  margin-top: 6px;
  color: var(--theme--foreground-subdued);
}
</style>
