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
import { useReducedMotion } from '~/lib/use-reduced-motion'
import { useLocale, useT } from '~/lib/i18n/react'
import { buildHead, localeFromMatches, ogImage, ogImageFromFile, siteFromMatches, siteNameOf } from '~/lib/seo'
import { DEFAULT_CARD_SORT } from '~/lib/types'
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
  // 轮播的三个开关：只在能自动动、鼠标没停在上面、也没被用户手动停掉时才走。
  // 自动轮播是「无用户操作就改变内容」，无障碍上必须能被停住——悬停暂停、
  // 减少动态时干脆不走、点圆点后重新计时。
  const [paused, setPaused] = useState(false)
  // 同列表页：首屏不播网格入场，只在用户改过筛选之后播。
  const [changed, setChanged] = useState(false)
  const reduced = useReducedMotion()

  useEffect(() => {
    if (banners.length <= 1 || paused || reduced) return
    const timer = setInterval(
      () => setIdx((i) => (i + 1) % banners.length),
      5000,
    )
    return () => clearInterval(timer)
  }, [banners.length, paused, reduced])

  const filterValue: CatalogFilterValue = {
    ipId: search.ip,
    seriesId: search.series,
    cardStatus: search.type,
    sort: search.sort ?? DEFAULT_CARD_SORT,
  }

  // 重置 = 把查询串整个清空，回到默认排序与全部卡牌。
  // 与筛选区的「重置」按钮共用同一个动作；它也标记 changed，
  // 让结果网格播一次入场（这是用户操作的结果，不是页面加载）。
  const onReset = () => {
    setChanged(true)
    // resetScroll: false：改筛选只是换列表内容，视口不该被拽回页顶——
    // 用户是滚到筛选区再改的，回到顶部等于把他刚看过的上下文丢掉。
    navigate({ to: '/{-$locale}', search: {}, resetScroll: false })
  }

  // 改任一筛选都写回 URL。换 IP 时顺手清掉系列：新 IP 下可能没有原系列，
  // 留着会是「已选但下拉里没有」的旧值，界面与结果对不上。
  //
  // 合并必须用 `'key' in next` 判断，不能用 `next.x !== undefined`：
  // 选回「全部」时调用方传的就是 `{ ipId: undefined }`，按 !== undefined 判断
  // 会被当成「这一项没变」而沿用 search 里的旧值——筛选因此永远清不掉，
  // 「全部」看着像点了没反应。
  const onFilterChange = (next: Partial<CatalogFilterValue>) => {
    setChanged(true)
    const merged: HomeSearch = {
      ip: 'ipId' in next ? next.ipId : search.ip,
      series: 'seriesId' in next ? next.seriesId : search.series,
      type: 'cardStatus' in next ? next.cardStatus : search.type,
      sort: 'sort' in next ? next.sort : search.sort,
    }
    if ('ipId' in next) merged.series = undefined
    if ('seriesId' in next && next.seriesId != null) {
      // 选了具体系列时把 IP 补成它的父级，两个下拉就不会互相矛盾
      const parent = series.find((s) => s.id === next.seriesId)
      if (parent) merged.ip = parent.ip_id
    }
    navigate({ to: '/{-$locale}', search: merged, resetScroll: false })
  }

  // 活跃筛选：把 URL 里的选择摊成可逐个移除的 chip。
  // 四个下拉本身只显示「当前值」，不显示「还剩几项在生效」；用户改了两处之后
  // 很难一眼看出结果为什么少了。chips 与结果计数同一行，答案就在结果旁边。
  const activeChips: { key: string; label: string; clear: HomeSearch }[] = []
  if (search.ip != null) {
    const ip = ips.find((v) => v.id === search.ip)
    if (ip)
      activeChips.push({
        key: 'ip',
        label: ip.name,
        clear: { ...search, ip: undefined, series: undefined },
      })
  }
  if (search.series != null) {
    const s = series.find((v) => v.id === search.series)
    if (s)
      activeChips.push({
        key: 'series',
        label: s.name,
        clear: { ...search, series: undefined },
      })
  }
  if (search.type) {
    activeChips.push({
      key: 'type',
      label: search.type === 'raw' ? t('typeRaw') : t('typePackaged'),
      clear: { ...search, type: undefined },
    })
  }
  return (
    <div className="space-y-10">
      {/* Banner 轮播。悬停暂停（鼠标停在图上时不该被换走），
          减少动态时完全不自动，只保留手动圆点。 */}
      {banners.length > 0 && (
        <section
          className="relative rounded-2xl overflow-hidden border border-border bg-accent aspect-[21/9]"
          onMouseEnter={() => setPaused(true)}
          onMouseLeave={() => setPaused(false)}
          onFocus={() => setPaused(true)}
          onBlur={() => setPaused(false)}
        >
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
                  <div className="absolute inset-0 flex flex-col justify-end p-4 sm:p-6 text-white bg-gradient-to-t from-black/85 via-black/55 to-transparent">
                    {b.title && (
                      <div className="text-lg sm:text-xl font-bold drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                        {b.title}
                      </div>
                    )}
                    {b.description && (
                      <div className="text-sm text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)] line-clamp-2">
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
                aria-hidden={i !== idx}
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
            // 圆点从 8px 视觉尺寸扩到 24px 触控区（WCAG 2.5.8）：
            // 视觉上仍是小点，但热区覆盖整块 24×24。当前项用宽度而非颜色区分，
            // 灰度或色觉差异下同样可辨。
            <div className="absolute bottom-1 right-2 flex">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  type="button"
                  onClick={() => {
                    setIdx(i)
                    setPaused(true)
                  }}
                  aria-label={t('bannerAria', { n: i + 1 })}
                  aria-current={i === idx ? 'true' : undefined}
                  className="group/dot flex h-6 w-6 items-center justify-center"
                >
                  <span
                    className={`h-1.5 rounded-full transition-all duration-200 ${
                      i === idx
                        ? 'w-4 bg-white'
                        : 'w-1.5 bg-white/50 group-hover/dot:bg-white/80'
                    }`}
                  />
                </button>
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
          onReset={onReset}
          localeParams={{ locale: isDefaultLocale(locale) ? undefined : locale }}
        />

        {/* 结果头：计数 + 活跃筛选 chips 同一行。 */}
        <div className="mt-4 mb-3 flex flex-wrap items-center gap-x-3 gap-y-2">
          <span className="text-sm text-muted">
            {t('catalogCount', { total: catalog.total })}
          </span>
          {activeChips.map((c) => (
            <button
              key={c.key}
              type="button"
              onClick={() => {
                setChanged(true)
                navigate({ to: '/{-$locale}', search: c.clear, resetScroll: false })
              }}
              className="inline-flex items-center gap-1 rounded-full border border-border-strong bg-surface px-2.5 py-1 text-xs text-muted transition-colors duration-150 hover:border-fg hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
            >
              {c.label}
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          ))}
        </div>

        {catalog.items.length > 0 ? (
          // key 跟着筛选走：换筛选时网格重新挂载，`grid-enter` 才播一次。
          // 不逐格 stagger——12 个格子逐格延迟会读成「加载慢」而不是「列表换了」。
          <div
            key={`${search.ip}-${search.series}-${search.type}-${search.sort}`}
            className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${changed ? 'grid-enter' : ''}`}
          >
            {catalog.items.map((c) => (
              <CardCard key={c.id} card={c} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-faint">{t('catalogEmpty')}</p>
            {activeChips.length > 0 && (
              <button
                type="button"
                onClick={onReset}
                className="mt-4 inline-flex items-center rounded-lg border border-border-strong px-3 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
              >
                {t('catalogReset')}
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  )
}
