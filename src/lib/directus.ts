// Directus REST 客户端（前端，公开角色读取 + 留言创建）
// 服务端 SSR 与浏览器端共用：统一走公开地址 VITE_DIRECTUS_URL。
import type {
  Announcement,
  Banner,
  Card,
  CardListResult,
  CardQuery,
  InfoPage,
  Ip,
  Rarity,
  Series,
  Shop,
  SiteSettings,
  SubSeries,
} from './types'

const BASE: string =
  (import.meta.env.VITE_DIRECTUS_URL as string | undefined) ||
  'http://localhost:8055'

export const DIRECTUS_BASE = BASE

/** 构造图片资产 URL（Directus 文件接口，可加缩略图/格式转换，见 development.md §5.3） */
export function assetUrl(
  fileId: string | number | null | undefined,
  opts?: {
    width?: number
    height?: number
    format?: 'webp' | 'jpg'
    // 只给社交分享图用：OG 卡片要固定 1200×630 的裁切，其他场景保持原始比例。
    fit?: 'cover' | 'contain'
  },
): string | null {
  if (fileId == null) return null
  const p = new URLSearchParams()
  if (opts?.width) p.set('width', String(opts.width))
  if (opts?.height) p.set('height', String(opts.height))
  if (opts?.format) p.set('format', opts.format)
  if (opts?.fit) p.set('fit', opts.fit)
  const q = p.toString()
  return `${BASE}/assets/${fileId}${q ? `?${q}` : ''}`
}

interface DirectusList<T> {
  data: T[]
  meta: { filter_count: number; total_count?: number }
}
interface DirectusItem<T> {
  data: T
}

async function dGet<T>(path: string): Promise<T | null> {
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { Accept: 'application/json' },
    })
    if (res.status === 404) return null
    if (!res.ok) throw new Error(`Directus ${res.status} @ ${path}`)
    return (await res.json()) as T
  } catch (err) {
    // SSR 与客户端统一：抓取失败时返回 null，由页面降级渲染
    console.error('[directus]', err)
    return null
  }
}

// cards.images 是 M2M（junction: cards_images → directus_files），
// 请求 images.directus_files_id 拿到 [{ directus_files_id: 'uuid' }]，
// normalizeCard 再归一化为 id 数组，页面组件无需感知关联结构。
// 关联字段按外键列名展开（ip_id.name），Directus 只在 ip_id 上返回对象；
// normalizeCard 再摊平成 ip/series/rarity，页面组件只认这个形状。
const CARD_FIELDS =
  '*,ip_id.name,series_id.name,sub_series_id.name,rarity_id.name,images.directus_files_id'

interface CardImageJunction {
  directus_files_id?: string | { id?: string } | null
}

interface NamedRef {
  name: string
}

function normalizeCard(raw: Card): Card {
  const rawImages = (raw.images ?? []) as unknown as Array<
    CardImageJunction | string | null
  >
  const images = rawImages
    .map((item) => {
      if (!item) return null
      if (typeof item === 'string') return item
      const rel = item.directus_files_id
      if (typeof rel === 'string') return rel
      return rel?.id ?? null
    })
    .filter((v): v is string => typeof v === 'string' && v.length > 0)
  const asNamed = (v: unknown): NamedRef | undefined =>
    v && typeof v === 'object' && typeof (v as NamedRef).name === 'string'
      ? { name: (v as NamedRef).name as string }
      : undefined
  return {
    ...raw,
    images,
    ip: asNamed(raw.ip_id),
    series: asNamed(raw.series_id),
    sub_series: asNamed(raw.sub_series_id),
    rarity: asNamed(raw.rarity_id),
  }
}

function cardSortValue(sort: CardQuery['sort']): string {
  switch (sort) {
    case 'price_asc':
      return 'price'
    // “最新上架”按真实创建时间倒序（cards.date_created 现已由系统自动维护）
    case 'newest':
      return '-date_created'
    case 'oldest':
      return 'date_created'
    case 'price_desc':
    default:
      return '-price'
  }
}

function buildCardFilter(
  q: CardQuery,
  rarityIds: number[] = [],
): Record<string, unknown> {
  const filter: Record<string, unknown> = { status: { _eq: 'published' } }
  if (q.ipIds?.length) filter.ip_id = { _in: q.ipIds }
  if (q.seriesIds?.length) filter.series_id = { _in: q.seriesIds }
  if (q.subSeriesIds?.length) filter.sub_series_id = { _in: q.subSeriesIds }
  if (q.rarityIds?.length) filter.rarity_id = { _in: q.rarityIds }
  if (q.cardStatus?.length) filter.card_status = { _in: q.cardStatus }
  if (q.highValueOnly) filter.is_high_value = { _eq: true }
  if (q.minPrice != null || q.maxPrice != null) {
    filter.price = {
      _between: [q.minPrice ?? 0, q.maxPrice ?? 999999],
    }
  }
  if (q.q && q.q.trim()) {
    const term = q.q.trim()
    // 关键词覆盖卡名、编号与稀有度名。稀有度名要转成 id 才能参与过滤：
    // Directus 不支持对关联字段做 _icontains（实测 403 does not exist）。
    const terms: Record<string, unknown>[] = [
      { name: { _icontains: term } },
      { code: { _icontains: term } },
    ]
    if (rarityIds.length) terms.push({ rarity_id: { _in: rarityIds } })
    filter._or = terms
  }
  return filter
}

/** 稀有度名里命中关键词的 id（如搜「HR」）。没有关键词或没命中返回空数组。 */
async function rarityIdsMatching(term: string | undefined): Promise<number[]> {
  const keyword = term?.trim()
  if (!keyword) return []
  const params = new URLSearchParams()
  params.set('fields', 'id')
  params.set('filter', JSON.stringify({ name: { _icontains: keyword } }))
  const res = await dGet<DirectusList<{ id: number }>>(`/items/rarities?${params}`)
  return (res?.data ?? []).map((r) => r.id)
}

export async function getCards(q: CardQuery): Promise<CardListResult> {
  const params = new URLSearchParams()
  params.set('fields', CARD_FIELDS)
  params.set('meta', 'filter_count')
  params.set('page', String(q.page ?? 1))
  params.set('limit', String(q.limit ?? 24))
  params.set('sort', cardSortValue(q.sort))

  const rarityIds = await rarityIdsMatching(q.q)
  params.set('filter', JSON.stringify(buildCardFilter(q, rarityIds)))

  const res = await dGet<DirectusList<Card>>(`/items/cards?${params}`)
  if (!res) return { items: [], total: 0 }
  return {
    items: res.data.map(normalizeCard),
    total: res.meta?.filter_count ?? res.data.length,
  }
}

export async function getCard(id: string | number): Promise<Card | null> {
  const params = new URLSearchParams()
  params.set('fields', CARD_FIELDS)
  params.set('filter', JSON.stringify({ status: { _eq: 'published' } }))
  const res = await dGet<DirectusItem<Card>>(`/items/cards/${id}?${params}`)
  return res?.data ? normalizeCard(res.data) : null
}

export async function getIps(): Promise<Ip[]> {
  const res = await dGet<DirectusList<Ip>>(
    '/items/ips?filter[status][_eq]=true&sort=sort&fields=id,name,sort',
  )
  return res?.data ?? []
}

export async function getSeries(): Promise<Series[]> {
  const res = await dGet<DirectusList<Series>>(
    '/items/series?filter[status][_eq]=true&sort=sort&fields=id,name,ip_id,sort',
  )
  return res?.data ?? []
}

export async function getSubSeries(): Promise<SubSeries[]> {
  const res = await dGet<DirectusList<SubSeries>>(
    '/items/sub_series?filter[status][_eq]=true&sort=sort&fields=id,name,series_id,sort',
  )
  return res?.data ?? []
}

export async function getRarities(): Promise<Rarity[]> {
  const res = await dGet<DirectusList<Rarity>>(
    '/items/rarities?filter[status][_eq]=true&sort=sort&fields=id,name,sort',
  )
  return res?.data ?? []
}

export async function getBanners(): Promise<Banner[]> {
  const res = await dGet<DirectusList<Banner>>(
    '/items/banners?filter[status][_eq]=published&sort=sort&fields=id,title,description,image,link,sort',
  )
  return res?.data ?? []
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const now = new Date().toISOString()
  const filter = JSON.stringify({
    status: { _eq: 'published' },
    _or: [{ published_at: { _null: true } }, { published_at: { _lte: now } }],
  })
  const res = await dGet<DirectusList<Announcement>>(
    `/items/announcements?sort=-is_pinned,-published_at&fields=id,title,body,published_at,is_pinned&filter=${encodeURIComponent(
      filter,
    )}`,
  )
  return res?.data ?? []
}

export async function getAnnouncement(
  id: string | number,
): Promise<Announcement | null> {
  const res = await dGet<DirectusItem<Announcement>>(
    `/items/announcements/${id}?fields=id,title,body,published_at,is_pinned`,
  )
  return res?.data ?? null
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  // 单例集合：Directus 返回 data 为对象（非数组）
  const res = await dGet<{ data: SiteSettings | SiteSettings[] }>(
    '/items/site_settings?limit=1&fields=*',
  )
  if (!res) return null
  const item = Array.isArray(res.data) ? res.data[0] : res.data
  return item ?? null
}

// 审核用信息页：运营信息 / 个人信息收集 / 利用规则 / 数据使用。
// 页脚入口与路由都按 page_key 定位，故排序按后台 sort 字段（保持运营约定的展示顺序）。
const INFO_PAGE_FIELDS = 'id,page_key,title,body,sort'

export async function getInfoPages(): Promise<InfoPage[]> {
  const params = new URLSearchParams()
  params.set('fields', INFO_PAGE_FIELDS)
  params.set('filter', JSON.stringify({ status: { _eq: 'published' } }))
  params.set('sort', 'sort')
  const res = await dGet<DirectusList<InfoPage>>(`/items/info_pages?${params}`)
  return res?.data ?? []
}

/** 按标识取单个信息页；未发布或不存在的页返回 null（页面据此显示 404 面板）。 */
export async function getInfoPage(
  pageKey: string,
): Promise<InfoPage | null> {
  const params = new URLSearchParams()
  params.set('fields', INFO_PAGE_FIELDS)
  params.set(
    'filter',
    JSON.stringify({
      page_key: { _eq: pageKey },
      status: { _eq: 'published' },
    }),
  )
  params.set('limit', '1')
  const res = await dGet<DirectusList<InfoPage>>(`/items/info_pages?${params}`)
  return res?.data?.[0] ?? null
}

const SHOP_FIELDS =
  '*,image'

export async function getShops(): Promise<Shop[]> {
  const params = new URLSearchParams()
  params.set('fields', SHOP_FIELDS)
  params.set('filter', JSON.stringify({ status: { _eq: 'published' } }))
  params.set('sort', 'sort')
  const res = await dGet<DirectusList<Shop>>(`/items/shops?${params}`)
  return res?.data ?? []
}

export interface MessageInput {
  content: string
  contact_name?: string
  contact_info?: string
  /** 关联卡牌主键：从卡牌详情「咨询此卡」进入时带入，后台据此确认留言针对哪张卡片；直接留言则为空 */
  card?: number | string
}

/** 访客留言：直连 Directus public create（见 development.md §4.5 / ticket 07） */
export async function postMessage(
  input: MessageInput,
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${BASE}/items/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        content: input.content,
        contact_name: input.contact_name || null,
        contact_info: input.contact_info || null,
        // 关联卡牌：访客从卡牌详情「咨询此卡」进来时带入；直接留言时 undefined → null。
        // 必须在 Public Create 权限的 fields 白名单内（见 bootstrap.mjs），否则会被 Directus 静默丢弃。
        card: input.card ?? null,
      }),
    })
    if (!res.ok) {
      const text = await res.text().catch(() => '')
      // error 只用来记录与排查，**不要直接渲染给访客**：里面是 HTTP 状态码
      // 与 Directus 的原始响应体。界面文案由页面按语言给出。
      return { ok: false, error: `HTTP ${res.status} ${text.slice(0, 500)}` }
    }
    return { ok: true }
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    }
  }
}
