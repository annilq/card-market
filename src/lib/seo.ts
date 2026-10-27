// 站级 SEO 元数据的单一构造点。
//
// 这份文件解决三件事，都是「部署到公网才暴露、本地看不出来」的：
//
// 1. **绝对地址。** `hreflang` 与 `canonical` 必须是绝对 URL，写相对路径
//    搜索引擎会直接忽略（Google 明确不支持相对 alternate）。origin 在服务端
//    从当前请求取（反代后要读 x-forwarded-*），浏览器端取 `location.origin`，
//    两者的值在同一个部署下一致，因此 SSR 与客户端算出的标签不会打架。
// 2. **每页独立的 title / description / OG。** 根路由原来给所有页面发同一个
//    title，分享到 X 时每条链接长得一模一样，也没有 og:image。
// 3. **分享卡片。** 卡牌详情用卡图，其余页面回落到后台第一条 banner 图；
//    两者都没有时不伪造占位图，直接不发 og:image。
import { createIsomorphicFn } from '@tanstack/react-start'
import { assetUrl } from './directus'
import { DEFAULT_LOCALE, LOCALES, resolveLocaleParam } from './i18n/locales'
import type { Locale } from './i18n/locales'
import { translate } from './i18n/messages'

/** OG 卡片的标准尺寸。Directus 按这个尺寸裁切，避免分享卡片比例失控。 */
export const OG_IMAGE_WIDTH = 1200
export const OG_IMAGE_HEIGHT = 630

/**
 * 当前部署的 origin（`https://example.com`，无尾斜杠）。
 *
 * 服务端读请求（含反向代理头），客户端读 `location.origin`。动态 import 保证
 * 服务端模块不会进客户端 bundle。
 */
export const getSiteOrigin = createIsomorphicFn()
  .server(async () => {
    const { getRequestUrl } = await import('@tanstack/react-start/server')
    try {
      return getRequestUrl({ xForwardedHost: true, xForwardedProto: true }).origin
    } catch {
      // 拿不到请求上下文（例如构建期静态求值）：退回环境变量，再退回空串，
      // 由调用方决定「不发绝对地址标签」而不是发一个错的。
      return (import.meta.env.VITE_SITE_URL as string | undefined)?.replace(/\/$/, '') ?? ''
    }
  })
  .client(() => window.location.origin)

/** 从匹配链里取语言段。head() 拿不到 location，但能拿到整条 matches。 */
export function localeFromMatches(
  matches: ReadonlyArray<{ params?: Record<string, unknown> }>,
): Locale {
  for (const match of matches) {
    const raw = match.params?.locale
    if (typeof raw === 'string') {
      const resolved = resolveLocaleParam(raw)
      if (resolved) return resolved
    }
  }
  return DEFAULT_LOCALE
}

/** 同一页面在另一种语言下的等价位址（不含 origin）。 */
export function pathForLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]
  const rest =
    first && resolveLocaleParam(first) && first !== DEFAULT_LOCALE
      ? segments.slice(1)
      : segments
  const prefix = LOCALES[locale].prefix
  const joined = rest.join('/')
  if (!prefix) return joined ? `/${joined}` : '/'
  return joined ? `/${prefix}/${joined}` : `/${prefix}`
}

export interface HeadInput {
  locale: Locale
  pathname: string
  /** 页面标题，不含站名。首页传空字符串，直接用站点 title。 */
  title?: string
  description?: string
  /** 站名。来自后台 `site_settings.site_name`，取不到时用当前语言的兜底名。 */
  siteName: string
  /** 分享图绝对地址。没有就不发 og:image。 */
  image?: string | null
  /** 页面类型，默认 website；卡牌与公告详情用 article。 */
  type?: 'website' | 'article'
  /** 搜索结果、404 等不希望被收录的页面。 */
  noindex?: boolean
  /** 首页：用 LOCALES 里那条更完整的站点标题与描述。 */
  isHome?: boolean
}

interface MetaTag {
  title?: string
  name?: string
  property?: string
  content?: string
  media?: string
}

interface LinkTag {
  rel: string
  href: string
  hrefLang?: string
}

/**
 * 构造一条路由的 head。
 *
 * 标题规则：首页用 `站点标题`（已按语言写好），其余页面用 `页面标题 | 站名`。
 * 站名不翻译——它是专有名词，后台填什么就显示什么，三种语言下都一样。
 */
export async function buildHead(input: HeadInput): Promise<{
  meta: MetaTag[]
  links: LinkTag[]
}> {
  const { locale, pathname, siteName, type = 'website', noindex, isHome } = input
  const origin = await getSiteOrigin()
  const localeMeta = LOCALES[locale]

  const title = isHome || !input.title
    ? localeMeta.title
    : `${input.title} | ${siteName}`
  const description = input.description || localeMeta.description
  // 分享地址要带语言段：`/ja/cards/1` 与 `/cards/1` 是两个页面，
  // 都用裸 pathname 会让三种语言的 og:url 撞成同一个地址。
  const localizedPath = pathForLocale(pathname, locale)
  const url = origin ? `${origin}${localizedPath}` : localizedPath

  // 说明：`og:locale:alternate` 这里不发。TanStack 的 head 按属性名去重
  // （同一个 `property` 只保留第一条），发两条只会剩一条，等于谎报。
  // 语言对应关系交给 `<link rel="alternate" hreflang>`，那是搜索引擎真正读的。
  const meta: MetaTag[] = [
    { title },
    { name: 'description', content: description },
    ...(noindex
      ? [{ name: 'robots', content: 'noindex, follow' }]
      : []),
    { property: 'og:site_name', content: siteName },
    { property: 'og:locale', content: localeMeta.intl },
    { property: 'og:type', content: type },
    { property: 'og:title', content: title },
    { property: 'og:description', content: description },
    { property: 'og:url', content: url },
    { name: 'twitter:card', content: input.image ? 'summary_large_image' : 'summary' },
    { name: 'twitter:title', content: title },
    { name: 'twitter:description', content: description },
    // 移动端地址栏配色跟着主题走，避免深色下浏览器 UI 刺眼。
    { name: 'theme-color', content: '#f8fafc', media: '(prefers-color-scheme: light)' },
    { name: 'theme-color', content: '#0b1120', media: '(prefers-color-scheme: dark)' },
  ]

  if (input.image) {
    meta.push(
      { property: 'og:image', content: input.image },
      { property: 'og:image:width', content: String(OG_IMAGE_WIDTH) },
      { property: 'og:image:height', content: String(OG_IMAGE_HEIGHT) },
      { name: 'twitter:image', content: input.image },
    )
  }

  // 绝对地址才有意义；origin 不可用时宁可不发，也不发一条爬虫会忽略的相对 hreflang。
  const links: LinkTag[] = []
  if (origin) {
    links.push({ rel: 'canonical', href: `${origin}${localizedPath}` })
    for (const [key, value] of Object.entries(LOCALES)) {
      links.push({
        rel: 'alternate',
        hrefLang: value.htmlLang,
        href: `${origin}${pathForLocale(pathname, key as Locale)}`,
      })
    }
    links.push({
      rel: 'alternate',
      hrefLang: 'x-default',
      href: `${origin}${pathForLocale(pathname, DEFAULT_LOCALE)}`,
    })
  }

  return { meta, links }
}

/** 站名：后台填了就用后台的，没填才回落到当前语言的兜底名。 */
export function siteNameOf(
  site: { site_name?: string | null } | null | undefined,
  locale: Locale,
): string {
  const name = site?.site_name?.trim()
  return name || translate(locale, 'defaultSiteName')
}

/**
 * 从匹配链里取根路由 loader 拿到的 site_settings。
 *
 * 各页面的 head() 拿不到自己的 loader 数据之外的上下文，但 `matches` 里有
 * 根路由那一条；取 `matches[0].loaderData.site` 即可，取不到就返回 null
 * （head() 可能在 loader 之前被调用，尤其 404 与首屏流式渲染）。
 */
export function siteFromMatches(
  matches: ReadonlyArray<{ loaderData?: unknown }>,
): { site_name?: string | null } | null {
  const root = matches[0]?.loaderData as { site?: { site_name?: string | null } | null } | undefined
  return root?.site ?? null
}

/**
 * 分享图：按 OG 尺寸从 Directus 裁一张。
 *
 * 用 `fit=cover` 而不是缩放——1200×630 是 1.91:1，卡图是 3:4，直接缩放会留白边。
 */
export function ogImageFromFile(fileId: string | number | null | undefined): string | null {
  return assetUrl(fileId, {
    width: OG_IMAGE_WIDTH,
    height: OG_IMAGE_HEIGHT,
    format: 'jpg',
    fit: 'cover',
  })
}

/**
 * 分享图：优先用页面自己的图（卡图），没有就用根路由预取到的第一张 banner。
 *
 * 为什么需要兜底：X 上分享一条没有 og:image 的链接只会渲染成一行灰字，
 * 而站里大多数页面（列表、公告、门店、留言、信息页）本身没有配图。
 * 根路由每次都会跑，顺手把 banner 一并取回来，省掉每个页面各发一次请求。
 */
export function ogImage(
  matches: ReadonlyArray<{ loaderData?: unknown }>,
  ownFileId?: string | number | null,
): string | null {
  if (ownFileId != null) return ogImageFromFile(ownFileId)
  const root = matches[0]?.loaderData as { fallbackImage?: string | number | null } | undefined
  return ogImageFromFile(root?.fallbackImage)
}

/** 富文本转纯文本摘要，供 meta description 使用。 */
export function plainText(html: string | null | undefined, max = 140): string {
  if (!html) return ''
  const text = html
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}

/** 价格在分享卡片上用整数日元：`¥880` 而不是 `¥880.00`。 */
export function formatPrice(value: number | null | undefined): string {
  if (value == null) return ''
  return `¥${new Intl.NumberFormat('ja-JP', { maximumFractionDigits: 0 }).format(Number(value))}`
}
