// Directus REST 客户端（前端，公开角色读取 + 留言创建）
// 服务端 SSR 与浏览器端共用：统一走公开地址 VITE_DIRECTUS_URL。
import {
  aggregate,
  createDirectus,
  createItem,
  readItem,
  readItems,
  readSingleton,
  rest,
} from '@directus/sdk'
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

const client = createDirectus(BASE).with(rest())

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

// SDK 对 404 与网络错误抛异常，页面需要降级渲染，故在边界统一转成 null。
async function safeRequest<T>(run: () => Promise<T>): Promise<T | null> {
  try {
    return await run()
  } catch (err) {
    console.error('[directus]', err)
    return null
  }
}

// cards.images 是 M2M（junction: cards_images → directus_files），
// 请求 images.directus_files_id 拿到 [{ directus_files_id: 'uuid' }]，
// normalizeCard 再归一化为 id 数组，页面组件无需感知关联结构。
// 关联字段按外键列名展开（ip_id.name），Directus 只在 ip_id 上返回对象；
// normalizeCard 再摊平成 ip/series/rarity，页面组件只认这个形状。
const CARD_FIELDS = [
  '*',
  'ip_id.name',
  'series_id.name',
  'sub_series_id.name',
  'rarity_id.name',
  'images.directus_files_id',
]

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
  const res = await safeRequest(() =>
    client.request(
      readItems('rarities', {
        fields: ['id'],
        filter: { name: { _icontains: keyword } },
      }),
    ),
  )
  return ((res ?? []) as Array<{ id: number }>).map((r) => r.id)
}

export async function getCards(q: CardQuery): Promise<CardListResult> {
  const rarityIds = await rarityIdsMatching(q.q)
  const filter = buildCardFilter(q, rarityIds)
  const items = await safeRequest(() =>
    client.request(
      readItems('cards', {
        fields: CARD_FIELDS,
        filter,
        sort: cardSortValue(q.sort),
        page: q.page ?? 1,
        limit: q.limit ?? 24,
      }),
    ),
  )
  if (!items) return { items: [], total: 0 }
  // SDK 只返回响应 data，丢弃 meta.filter_count，故单独聚合一次取总数。
  const counts = await safeRequest(() =>
    client.request(
      aggregate('cards', { aggregate: { count: '*' }, query: { filter } }),
    ),
  )
  const count = Array.isArray(counts)
    ? Number((counts as Array<{ count?: string | null }>)[0]?.count ?? NaN)
    : NaN
  return {
    items: (items as Card[]).map(normalizeCard),
    total: Number.isNaN(count) ? items.length : count,
  }
}

export async function getCard(id: string | number): Promise<Card | null> {
  const res = await safeRequest(() =>
    client.request(
      readItem('cards', id, {
        fields: CARD_FIELDS,
        filter: { status: { _eq: 'published' } },
      }),
    ),
  )
  return res ? normalizeCard(res as Card) : null
}

export async function getIps(): Promise<Ip[]> {
  const res = await safeRequest(() =>
    client.request(
      readItems('ips', {
        fields: ['id', 'name', 'sort'],
        filter: { status: { _eq: true } },
        sort: ['sort'],
      }),
    ),
  )
  return (res as Ip[] | null) ?? []
}

export async function getSeries(): Promise<Series[]> {
  const res = await safeRequest(() =>
    client.request(
      readItems('series', {
        fields: ['id', 'name', 'ip_id', 'sort'],
        filter: { status: { _eq: true } },
        sort: ['sort'],
      }),
    ),
  )
  return (res as Series[] | null) ?? []
}

export async function getSubSeries(): Promise<SubSeries[]> {
  const res = await safeRequest(() =>
    client.request(
      readItems('sub_series', {
        fields: ['id', 'name', 'series_id', 'sort'],
        filter: { status: { _eq: true } },
        sort: ['sort'],
      }),
    ),
  )
  return (res as SubSeries[] | null) ?? []
}

export async function getRarities(): Promise<Rarity[]> {
  const res = await safeRequest(() =>
    client.request(
      readItems('rarities', {
        fields: ['id', 'name', 'sort'],
        filter: { status: { _eq: true } },
        sort: ['sort'],
      }),
    ),
  )
  return (res as Rarity[] | null) ?? []
}

export async function getBanners(): Promise<Banner[]> {
  const res = await safeRequest(() =>
    client.request(
      readItems('banners', {
        fields: ['id', 'title', 'description', 'image', 'link', 'sort'],
        filter: { status: { _eq: 'published' } },
        sort: ['sort'],
      }),
    ),
  )
  return (res as Banner[] | null) ?? []
}

export async function getAnnouncements(): Promise<Announcement[]> {
  const now = new Date().toISOString()
  const res = await safeRequest(() =>
    client.request(
      readItems('announcements', {
        fields: ['id', 'title', 'body', 'published_at', 'is_pinned'],
        filter: {
          status: { _eq: 'published' },
          _or: [
            { published_at: { _null: true } },
            { published_at: { _lte: now } },
          ],
        },
        sort: ['-is_pinned', '-published_at'],
      }),
    ),
  )
  return (res as Announcement[] | null) ?? []
}

export async function getAnnouncement(
  id: string | number,
): Promise<Announcement | null> {
  const res = await safeRequest(() =>
    client.request(
      readItem('announcements', id, {
        fields: ['id', 'title', 'body', 'published_at', 'is_pinned'],
      }),
    ),
  )
  return (res as Announcement | null) ?? null
}

export async function getSiteSettings(): Promise<SiteSettings | null> {
  // 单例集合：Directus 返回 data 为对象（非数组）
  const res = await safeRequest(() =>
    client.request(readSingleton('site_settings', { fields: ['*'] })),
  )
  if (!res) return null
  const data = res as unknown as SiteSettings | SiteSettings[]
  const item = Array.isArray(data) ? data[0] : data
  return item ?? null
}

// 审核用信息页：运营信息 / 个人信息收集 / 利用规则 / 数据使用。
// 页脚入口与路由都按 page_key 定位，故排序按后台 sort 字段（保持运营约定的展示顺序）。
const INFO_PAGE_FIELDS = ['id', 'page_key', 'title', 'body', 'sort']

export async function getInfoPages(): Promise<InfoPage[]> {
  const res = await safeRequest(() =>
    client.request(
      readItems('info_pages', {
        fields: INFO_PAGE_FIELDS,
        filter: { status: { _eq: 'published' } },
        sort: ['sort'],
      }),
    ),
  )
  return (res as InfoPage[] | null) ?? []
}

/** 按标识取单个信息页；未发布或不存在的页返回 null（页面据此显示 404 面板）。 */
export async function getInfoPage(
  pageKey: string,
): Promise<InfoPage | null> {
  const res = await safeRequest(() =>
    client.request(
      readItems('info_pages', {
        fields: INFO_PAGE_FIELDS,
        filter: {
          page_key: { _eq: pageKey },
          status: { _eq: 'published' },
        },
        limit: 1,
      }),
    ),
  )
  return (res as InfoPage[] | null)?.[0] ?? null
}

const SHOP_FIELDS = ['*', 'image']

export async function getShops(): Promise<Shop[]> {
  const res = await safeRequest(() =>
    client.request(
      readItems('shops', {
        fields: SHOP_FIELDS,
        filter: { status: { _eq: 'published' } },
        sort: ['sort'],
      }),
    ),
  )
  return (res as Shop[] | null) ?? []
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
    await client.request(
      createItem('messages', {
        content: input.content,
        contact_name: input.contact_name || null,
        contact_info: input.contact_info || null,
        // 关联卡牌：访客从卡牌详情「咨询此卡」进来时带入；直接留言时 undefined → null。
        // 必须在 Public Create 权限的 fields 白名单内（见 bootstrap.mjs），否则会被 Directus 静默丢弃。
        card: input.card ?? null,
      }),
    )
    return { ok: true }
  } catch (err) {
    // error 只用来记录与排查，**不要直接渲染给访客**：里面是 SDK 的异常信息。
    // 界面文案由页面按语言给出。
    return {
      ok: false,
      error: err instanceof Error ? `${err.name}: ${err.message}` : String(err),
    }
  }
}
