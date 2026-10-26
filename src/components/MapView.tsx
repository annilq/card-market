import { useEffect, useRef } from 'react'
import type { Shop } from '~/lib/types'
// 仅引入样式；Leaflet 的 JS 必须在浏览器端动态加载（见 useEffect），
// 避免 SSR 阶段访问 window 导致构建/渲染报错。
import 'leaflet/dist/leaflet.css'

type MapInstance = {
  setView: (c: [number, number], z: number) => void
  remove: () => void
  fitBounds: (b: unknown, o?: unknown) => void
  on: (e: string, cb: () => void) => void
}
type MarkerInstance = { on: (e: string, cb: () => void) => void }

const PIN_HTML = `
  <div style="transform:translate(-50%,-100%)">
    <svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M14 0C6.27 0 0 6.27 0 14c0 9.5 12.1 20.4 12.7 20.9a2 2 0 0 0 2.6 0C15.9 34.4 28 23.5 28 14 28 6.27 21.73 0 14 0Z" fill="#0f172a"/>
      <circle cx="14" cy="14" r="5.5" fill="#fff"/>
    </svg>
  </div>`

export function MapView({
  shops,
  selectedId,
  onSelect,
}: {
  shops: Shop[]
  selectedId?: number | null
  onSelect?: (id: number) => void
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<MapInstance | null>(null)
  const markersRef = useRef<Record<number, MarkerInstance>>({})
  // 记录已初始化的店铺集合，避免重复建图
  const initedForRef = useRef<string>('')

  const key = shops.map((s) => s.id).join(',')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const el = containerRef.current
    if (!el) return

    let cancelled = false
    ;(async () => {
      const L = (await import('leaflet')).default
      if (cancelled || !el || !containerRef.current) return

      const toNum = (v: unknown) =>
        typeof v === 'number' ? v : parseFloat(String(v))
      const points = shops
        .map((s) => {
          const lat = toNum(s.lat)
          const lng = toNum(s.lng)
          return Number.isFinite(lat) && Number.isFinite(lng)
            ? { id: s.id, lat, lng }
            : null
        })
        .filter((p): p is { id: number; lat: number; lng: number } => p !== null)

      const initKey = initedForRef.current
      if (!mapRef.current || initKey !== key) {
        el.innerHTML = ''
        const map = L.map(el, { scrollWheelZoom: true }) as unknown as MapInstance
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; OpenStreetMap',
        }).addTo(map as unknown as MapInstance)
        mapRef.current = map
        markersRef.current = {}
        initedForRef.current = key

        for (const p of points) {
          const marker = L.marker([p.lat, p.lng], {
            icon: L.divIcon({
              className: '',
              html: PIN_HTML,
              iconSize: [28, 36],
              iconAnchor: [14, 36],
            }),
          }).addTo(map as unknown as MapInstance) as unknown as MarkerInstance
          if (onSelect) marker.on('click', () => onSelect(p.id))
          markersRef.current[p.id] = marker
        }

        if (points.length > 0) {
          const bounds = L.latLngBounds(
            points.map((p) => [p.lat, p.lng] as [number, number]),
          )
          ;(map as unknown as MapInstance).fitBounds(bounds, { padding: [48, 48] })
        } else {
          map.setView([35.68, 139.76], 11)
        }
      }
    })()

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  // 选中店铺时平移到对应标记
  useEffect(() => {
    if (selectedId == null) return
    const el = containerRef.current
    if (!el || typeof window === 'undefined') return
    ;(async () => {
      const L = (await import('leaflet')).default
      const shop = shops.find((s) => s.id === selectedId)
      const lat = shop ? parseFloat(String(shop.lat)) : NaN
      const lng = shop ? parseFloat(String(shop.lng)) : NaN
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        mapRef.current?.setView([lat, lng], 15)
      }
    })()
  }, [selectedId, shops])

  return <div ref={containerRef} className="h-full w-full" />
}
