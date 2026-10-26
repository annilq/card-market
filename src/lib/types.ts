// 业务集合的 TypeScript 类型定义（与 docs/development.md §4 一致）
// 注意：status 字段为 Directus 内置 draft/published/archived；
// messages 的 status 为自定义工单枚举（新/已处理/已归档/已标记垃圾），此处仅前端提交用。

export interface Ip {
  id: number
  name: string
  sort?: number
  status?: boolean
}

export interface Series {
  id: number
  name: string
  ip_id: number
  sort?: number
  status?: boolean
}

export interface SubSeries {
  id: number
  name: string
  series_id: number
  sort?: number
  status?: boolean
}

export interface Rarity {
  id: number
  name: string
  sort?: number
  status?: boolean
}

/** 裸卡 / 有包装 */
export type CardStatus = 'raw' | 'packaged'

export interface Card {
  id: number
  name: string
  ip_id: number
  series_id: number
  sub_series_id: number
  code: string | null
  rarity_id: number
  price: number | null
  description: string | null
  is_high_value: boolean
  card_status: CardStatus
  status: 'draft' | 'published' | 'archived'
  date_created: string | null
  date_updated: string | null
  // 创建人（directus_users 的 UUID 主键，系统自动维护）
  user_created?: string | null
  // 关联展开字段
  ip?: { name: string }
  series?: { name: string }
  sub_series?: { name: string }
  rarity?: { name: string }
  // 商品图片：directus_files id 数组（后端 M2M/cards_images，客户端已归一化）
  images?: (string | number)[]
}

export interface Banner {
  id: number
  title: string | null
  description: string | null
  image: string | number
  link: string | null
  sort: number
  status: string
}

export interface Announcement {
  id: number
  title: string
  body: string | null
  published_at: string | null
  is_pinned: boolean
  sort: number
  status: string
  created_at: string
  updated_at: string
}

export interface SiteSettings {
  id: number
  site_name: string
  logo: string | number | null
  intro: string | null
  x_account: string | null
  contact_email: string | null
  data_notice: string | null
  privacy_policy: string | null
}

/**
 * 审核用信息页（运营信息 / 个人信息收集 / 利用规则 / 数据使用）。
 * 用 page_key 定位而不是主键：页脚入口与前端路由 `/info/<page_key>` 都按标识匹配，
 * 后台可改标题与正文，但标识变更会让对应入口失效。
 */
export type InfoPageKey = 'operation' | 'personal-info' | 'terms' | 'data-usage'

export interface InfoPage {
  id: number
  page_key: InfoPageKey
  title: string
  body: string | null
  sort?: number
  status?: string
}

/** 店铺（独立模型，可多个；含定位坐标，前端以列表 + 地图展示） */
export interface Shop {
  id: number
  name: string
  address?: string | null
  lat?: number | null
  lng?: number | null
  phone?: string | null
  business_hours?: string | null
  description?: string | null
  image?: string | number | null
  sort?: number
  status?: string
}

export interface CardQuery {
  ipIds?: number[]
  seriesIds?: number[]
  subSeriesIds?: number[]
  rarityIds?: number[]
  highValueOnly?: boolean
  minPrice?: number
  maxPrice?: number
  q?: string
  sort?: 'price_desc' | 'price_asc' | 'newest'
  page?: number
  limit?: number
}

export interface CardListResult {
  items: Card[]
  total: number
}
