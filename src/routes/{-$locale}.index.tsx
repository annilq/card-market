import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  assetUrl,
  getAnnouncements,
  getBanners,
  getCards,
  getIps,
  getSeries,
} from '~/lib/directus'
import { CardCard } from '~/components/CardCard'
import { CatalogFilters } from '~/components/CatalogFilters'
import type { CatalogFilterValue } from '~/components/CatalogFilters'
import { HighValueStrip } from '~/components/HighValueStrip'
import { HomeNotices } from '~/components/HomeNotices'
import { isDefaultLocale, localizeHref } from '~/lib/i18n/locales'
import { useLocale, useT } from '~/lib/i18n/react'
import { buildHead, localeFromMatches, ogImage, ogImageFromFile, siteFromMatches, siteNameOf } from '~/lib/seo'
import type { Announcement, Banner, CardSort, Ip, Series } from '~/lib/types'

/** 首页卡牌列表每页数量。首页要露出 banner 与公告，因此比列表页的 24 少。 */
const HOME_PAGE_SIZE = 12

const SORTS: CardSort[] = ['price_desc', 'price_asc', 'newest', 'oldest']

/**
 * 首页筛选状态放在 URL 查询串里（`?ip=1&series=2&type=raw&sort=price_asc`）。
 *
 * 放在 URL 而不是组件 state 的三个理由：可分享（把筛好的结果发给别人）、
 * 可后退（浏览器返回键回到上一组筛选）、刷新不丢。loader 直接读它，
 * 因此筛选结果由服务端渲染，首屏就是过滤后的列表，不闪一下再收窄。
 */
interface HomeSearch {
  ip?: number
  series?: number
  type?: 'raw' | 'packaged'
  sort?: CardSort
}

const asId = (v: unknown): number | undefined => {
  if (v == null || v === '') return undefined
  const n = Number(v)
  return Number.isFinite(n) ? n : undefined
}

export const Route = createFileRoute('/{-$locale}/')({
  validateSearch: (s: Record<string, unknown>): HomeSearch => ({
    ip: asId(s.ip),
    series: asId(s.series),
    type: s.type === 'raw' || s.type === 'packaged' ? s.type : undefined,
    sort: SORTS.includes(s.sort as CardSort) ? (s.sort as CardSort) : undefined,
  }),
  loaderDeps: ({ search }) => ({
    ip: search.ip,
    series: search.series,
    type: search.type,
    sort: search.sort,
  }),
  // 筛选属于 search 变化，必须让 loader 重新请求 Directus
  shouldReload: true,
  loader: async ({ deps }): Promise<{
    banners: Banner[]
    announcements: Announcement[]
    ips: Ip[]
    series: Series[]
    highValue: Awaited<ReturnType<typeof getCards>>
    catalog: Awaited<ReturnType<typeof getCards>>
  }> => {
    const [banners, announcements, ips, series, highValue, catalog] =
      await Promise.all([
        getBanners(),
        getAnnouncements(),
        getIps(),
        getSeries(),
        getCards({ highValueOnly: true, sort: 'price_desc', limit: 8 }),
        getCards({
          ipIds: deps.ip ? [deps.ip] : undefined,
          seriesIds: deps.series ? [deps.series] : undefined,
          cardStatus: deps.type ? [deps.type] : undefined,
          sort: deps.sort ?? 'price_desc',
          limit: HOME_PAGE_SIZE,
        }),
      ])
    return { banners, announcements, ips, series, highValue, catalog }
  },
  // 首页：用 LOCALES 里那条完整的站点标题与描述，分享图取第一条 banner。
  // 筛选只改查询串，pathname 仍是 `/`，所以 canonical 始终指向首页本身，
  // 不会把同一份列表的十几种筛法算成十几种重复内容。
  head: async ({ matches }) => {
    const locale = localeFromMatches(matches)
    const site = siteFromMatches(matches)
    const banners = (matches[matches.length - 1]?.loaderData as
      | { banners?: Banner[] }
      | undefined)?.banners
    return buildHead({
      locale,
      pathname: '/',
      siteName: siteNameOf(site, locale),
      isHome: true,
      // 首页优先用第一条 banner；没有 banner 时退回根路由的兜底图（同一个字段，保持一致）。
      image: ogImageFromFile(banners?.[0]?.image) ?? ogImage(matches),
    })
  },
  component: Home,
})

function Home() {
  const { banners, announcements, ips, series, highValue, catalog } =
    Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const t = useT()
  const locale = useLocale()
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(
      () => setIdx((i) => (i + 1) % banners.length),
      5000,
    )
    return () => clearInterval(timer)
  }, [banners.length])

  const filterValue: CatalogFilterValue = {
    ipId: search.ip,
    seriesId: search.series,
    cardStatus: search.type,
    sort: search.sort ?? 'price_desc',
  }

  // 改任一筛选都写回 URL。换 IP 时顺手清掉系列：新 IP 下可能没有原系列，
  // 留着会是「已选但下拉里没有」的旧值，界面与结果对不上。
  const onFilterChange = (next: Partial<CatalogFilterValue>) => {
    const merged: HomeSearch = {
      ip: next.ipId !== undefined ? next.ipId : search.ip,
      series: next.seriesId !== undefined ? next.seriesId : search.series,
      type: next.cardStatus !== undefined ? next.cardStatus : search.type,
      sort: next.sort !== undefined ? next.sort : search.sort,
    }
    if ('ipId' in next) merged.series = undefined
    if ('seriesId' in next && next.seriesId != null) {
      // 选了具体系列时把 IP 补成它的父级，两个下拉就不会互相矛盾
      const parent = series.find((s) => s.id === next.seriesId)
      if (parent) merged.ip = parent.ip_id
    }
    navigate({ to: '/{-$locale}', search: merged })
  }

  return (
    <div className="space-y-10">
      {/* Banner 轮播 */}
      {banners.length > 0 && (
        <section className="relative rounded-2xl overflow-hidden border border-border bg-accent aspect-[21/9]">
          {banners.map((b, i) => {
            const src = assetUrl(b.image, { width: 1280, format: 'webp' })
            const inner = (
              <>
                {src && (
                  <img
                    src={src}
                    alt={b.title || 'banner'}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {/* 图上文字：压一层足够深的渐隐黑色再写字。
                    之前是 from-black/60，深色主题下与图片的深色区域叠在一起，
                    实测对比度只有 1.23:1——文字几乎消失。改成底部实心、向上渐隐。 */}
                {(b.title || b.description) && (
                  <div className="absolute inset-0 flex flex-col justify-end p-6 text-white bg-gradient-to-t from-black/85 via-black/55 to-transparent">
                    {b.title && (
                      <div className="text-xl font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {b.title}
                      </div>
                    )}
                    {b.description && (
                      <div className="text-sm text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {b.description}
                      </div>
                    )}
                  </div>
                )}
              </>
            )
            const el = (
              <div
                className={`absolute inset-0 transition-opacity duration-500 ${
                  i === idx ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {inner}
              </div>
            )
            return b.link ? (
              b.link.startsWith('/') ? (
                // b.link 来自后台内容，绕过路由类型，需补语言段，否则会掉回默认语言。
                <Link key={b.id} to={localizeHref(b.link, locale) as '/{-$locale}/cards'}>
                  {el}
                </Link>
              ) : (
                <a
                  key={b.id}
                  href={b.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {el}
                </a>
              )
            ) : (
              <div key={b.id}>{el}</div>
            )
          })}
          {banners.length > 1 && (
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setIdx(i)}
                  aria-label={t('bannerAria', { n: i + 1 })}
                  className={`w-2 h-2 rounded-full ${
                    i === idx ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 通知公告 */}
      {announcements.length > 0 && <HomeNotices items={announcements} />}

      {/* 高价买取 */}
      {highValue.items.length > 0 && (
        <HighValueStrip items={highValue.items} />
      )}

      {/* 卡牌列表：四联筛选 + 结果。原来的「按 IP 浏览」胶囊按钮被这四个下拉取代，
          它只能选 IP 一项，且选完要跳到 /cards，这里就地筛选。 */}
      <section>
        <CatalogFilters
          value={filterValue}
          ips={ips}
          series={series}
          onChange={onFilterChange}
          localeParams={{ locale: isDefaultLocale(locale) ? undefined : locale }}
        />

        <div className="mt-4 mb-3 text-sm text-muted">
          {t('catalogCount', { total: catalog.total })}
        </div>

        {catalog.items.length > 0 ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {catalog.items.map((c) => (
              <CardCard key={c.id} card={c} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-16 text-center text-sm text-faint">
            {t('catalogEmpty')}
          </div>
        )}
      </section>
    </div>
  )
}
