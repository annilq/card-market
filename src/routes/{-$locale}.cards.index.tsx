import { useRef, useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCards, getIps, getRarities, getSeries, getSubSeries } from '~/lib/directus'
import { CardCard } from '~/components/CardCard'
import { Pagination } from '~/components/Pagination'
import { useT } from '~/lib/i18n/react'
import { translate } from '~/lib/i18n/messages'
import { buildHead, localeFromMatches, ogImage, siteFromMatches, siteNameOf } from '~/lib/seo'
import { CARD_SORTS } from '~/lib/types'
import type { CardQuery, CardSort, Ip, Rarity, Series, SubSeries } from '~/lib/types'

// 数值型参数在 search 中：单选取标量 number，多选取 number[]（与 TanStack 默认
// 解析一致——单值 ip=1 解析为 number，多值 ip=1&ip=2 解析为数组，避免规范化重定向）。
interface CardSearch {
  ip?: number | number[]
  series?: number | number[]
  sub?: number | number[]
  rarity?: number | number[]
  hv?: boolean
  min?: number
  max?: number
  q?: string
  sort?: CardSort
  page?: number
}

const PAGE_SIZE = 24

const asNum = (v: unknown): number | number[] | undefined => {
  if (v == null || v === '') return undefined
  if (Array.isArray(v)) {
    const a = v.map(Number).filter((n) => !Number.isNaN(n))
    if (!a.length) return undefined
    return a.length === 1 ? a[0] : a
  }
  if (typeof v === 'number') return v
  if (typeof v === 'string') {
    if (v.includes(',')) {
      const a = v.split(',').map(Number).filter((n) => !Number.isNaN(n))
      if (!a.length) return undefined
      return a.length === 1 ? a[0] : a
    }
    return Number(v)
  }
  return undefined
}

const toArr = (v: number | number[] | undefined): number[] =>
  v == null ? [] : Array.isArray(v) ? v : [v]

const norm = (v: number | number[] | undefined): number[] | undefined =>
  v == null ? undefined : Array.isArray(v) ? v : [v]

export const Route = createFileRoute('/{-$locale}/cards/')({
  validateSearch: (s: Record<string, unknown>): CardSearch => ({
    ip: asNum(s.ip),
    series: asNum(s.series),
    sub: asNum(s.sub),
    rarity: asNum(s.rarity),
    hv: s.hv != null && s.hv !== '' && s.hv !== false ? true : undefined,
    min: s.min != null && s.min !== '' ? Number(s.min) : undefined,
    max: s.max != null && s.max !== '' ? Number(s.max) : undefined,
    q: s.q != null && s.q !== '' ? String(s.q) : undefined,
    sort: CARD_SORTS.includes(s.sort as CardSort)
      ? (s.sort as CardSort)
      : undefined,
    page: s.page != null && s.page !== '' ? Number(s.page) : undefined,
  }),
  loaderDeps: ({ search }) => ({
    ip: search.ip, series: search.series, sub: search.sub, rarity: search.rarity,
    hv: search.hv, min: search.min, max: search.max, q: search.q, sort: search.sort, page: search.page,
  }),
  // 筛选变化属于 search 变化，必须让 loader 重新执行（重新请求 Directus）
  shouldReload: true,
  loader: async ({ deps }): Promise<{
    result: Awaited<ReturnType<typeof getCards>>
    ips: Ip[]
    series: Series[]
    subSeries: SubSeries[]
    rarities: Rarity[]
  }> => {
    const search = deps as CardSearch
    const query: CardQuery = {
      ipIds: norm(search.ip),
      seriesIds: norm(search.series),
      subSeriesIds: norm(search.sub),
      rarityIds: norm(search.rarity),
      highValueOnly: !!search.hv,
      minPrice: search.min,
      maxPrice: search.max,
      q: search.q,
      sort: search.sort ?? 'price_desc',
      page: search.page ?? 1,
      limit: PAGE_SIZE,
    }
    const [result, ips, series, subSeries, rarities] = await Promise.all([
      getCards(query),
      getIps(),
      getSeries(),
      getSubSeries(),
      getRarities(),
    ])
    return { result, ips, series, subSeries, rarities }
  },
  // 列表页标题跟随当前筛选：带关键词时用「搜“X”」，否则用「卡牌」。
  // 搜索结果与分页都不收录（内容随 query 无穷组合，收录反而稀释索引）。
  head: async ({ matches, match }) => {
    const locale = localeFromMatches(matches)
    const site = siteFromMatches(matches)
    const search = (match.search ?? {}) as CardSearch
    const base = translate(locale, 'navCards')
    const title = search.q ? `${base} — ${search.q}` : base
    return buildHead({
      locale,
      pathname: '/cards',
      siteName: siteNameOf(site, locale),
      title,
      image: ogImage(matches),
      noindex: !!(search.q || search.page),
    })
  },
  component: CardList,
})

function CardList() {
  const { result, ips, series, subSeries, rarities } = Route.useLoaderData()
  const search = Route.useSearch()
  const navigate = useNavigate()
  const t = useT()

  const ipSel = new Set(toArr(search.ip))
  const seriesSel = new Set(toArr(search.series))
  const subSel = new Set(toArr(search.sub))
  const raritySel = new Set(toArr(search.rarity))

  // resetScroll: false：勾一个分面只该换结果，不该把视口拽回页顶。
  // 筛选栏在桌面是 sticky、在手机是折叠面板，用户滚到列表中部再改筛选时，
  // 回到页顶等于把刚才的浏览位置丢掉，还得重新滚下来看结果。
  const patch = (p: Partial<CardSearch>) => {
    setChanged(true)
    navigate({
      to: '/{-$locale}/cards',
      search: { ...search, ...p, page: 1 },
      resetScroll: false,
    })
  }

  // 切页后把视口带回网格顶端：`scrollRestoration` 只在「后退/前进」时恢复，
  // 向前翻页会停在页脚，键盘用户下一次 Tab 会落在页脚链接上。
  // 同时把焦点交给网格容器（tabIndex=-1），读屏会从「共 N 张」重新读起。
  const gridTopRef = useRef<HTMLElement>(null)
  const patchPage = (page: number) => {
    setChanged(true)
    // 翻页是例外：这里要的是「回到网格顶端」，而不是页顶，
    // 因此关掉默认的 resetScroll，再自己 scrollIntoView 到网格（见下）。
    navigate({
      to: '/{-$locale}/cards',
      search: { ...search, page },
      resetScroll: false,
    })
    requestAnimationFrame(() => {
      gridTopRef.current?.scrollIntoView({ block: 'start', behavior: 'auto' })
      gridTopRef.current?.focus({ preventScroll: true })
    })
  }

  const toggleMulti = (
    key: 'ip' | 'series' | 'sub' | 'rarity',
    id: number,
  ) => {
    const cur = new Set(toArr(search[key]))
    if (cur.has(id)) cur.delete(id)
    else cur.add(id)
    const arr = Array.from(cur)
    const val: number | number[] | undefined =
      arr.length === 0 ? undefined : arr.length === 1 ? arr[0] : arr
    const next: Partial<CardSearch> = { [key]: val }

    // 级联清理：取消 IP → 清其下系列与子系列；取消系列 → 清其下子系列
    if (key === 'ip') {
      if (!cur.has(id)) {
        const removedSeries = series.filter((s) => s.ip_id === id).map((s) => s.id)
        const ns = new Set(toArr(search.series))
        removedSeries.forEach((s) => ns.delete(s))
        next.series = ns.size ? (ns.size === 1 ? Array.from(ns)[0] : Array.from(ns)) : undefined
        const nsub = new Set(toArr(search.sub))
        subSeries
          .filter((ss) => removedSeries.includes(ss.series_id))
          .forEach((ss) => nsub.delete(ss.id))
        next.sub = nsub.size ? (nsub.size === 1 ? Array.from(nsub)[0] : Array.from(nsub)) : undefined
      }
    } else if (key === 'series') {
      if (!cur.has(id)) {
        const nsub = new Set(toArr(search.sub))
        subSeries.filter((ss) => ss.series_id === id).forEach((ss) => nsub.delete(ss.id))
        next.sub = nsub.size ? (nsub.size === 1 ? Array.from(nsub)[0] : Array.from(nsub)) : undefined
      }
    }
    patch(next)
  }

  const clearAll = () =>
    navigate({
      to: '/{-$locale}/cards',
      search: { q: search.q || undefined, sort: search.sort },
      resetScroll: false,
    })

  const seriesEnabled = (s: Series) =>
    ipSel.size === 0 || ipSel.has(s.ip_id)
  const subEnabled = (ss: SubSeries) => {
    if (seriesSel.size > 0) return seriesSel.has(ss.series_id)
    if (ipSel.size > 0) {
      const parent = series.find((s) => s.id === ss.series_id)
      return parent ? ipSel.has(parent.ip_id) : false
    }
    return true
  }

  const [filtersOpen, setFiltersOpen] = useState(false)
  // 只在「用户改过筛选/翻过页」之后才播入场动画。
  // 首屏不播：页面加载时整块淡入属于「加载编排」，Read/Operate 面不该有；
  // 而且 SSR 首帧若先透明再淡入，慢网络上会读成内容在闪。
  const [changed, setChanged] = useState(false)
  const total = result.total
  const page = search.page ?? 1
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const hasFilter =
    toArr(search.ip).length +
      toArr(search.series).length +
      toArr(search.sub).length +
      toArr(search.rarity).length >
      0 ||
    !!search.hv ||
    search.min != null ||
    search.max != null ||
    !!search.q

  // 活跃筛选总数：筛选栏收起来时，这个数字是唯一的线索。
  const activeCount =
    toArr(search.ip).length +
    toArr(search.series).length +
    toArr(search.sub).length +
    toArr(search.rarity).length +
    (search.hv ? 1 : 0) +
    (search.min != null || search.max != null ? 1 : 0) +
    (search.q ? 1 : 0)

  // facet 上的计数：客户最常问的是「这一档到底有几张」。
  // 计数来自当前结果集不方便（Directus 不返回分面统计），所以这里不做，
  // 只显示「已选 n」——不编造数字比显示一个错数字重要。
  const facetBody = (
    <div className="space-y-5">
      <Facet title={t('facetIp')} items={ips} sel={ipSel} onToggle={(id) => toggleMulti('ip', id)} />
      <Facet
        title={t('facetSeries')}
        items={series}
        sel={seriesSel}
        enabled={seriesEnabled}
        onToggle={(id) => toggleMulti('series', id)}
      />
      <Facet
        title={t('facetSubSeries')}
        items={subSeries}
        sel={subSel}
        enabled={subEnabled}
        onToggle={(id) => toggleMulti('sub', id)}
      />
      <Facet
        title={t('facetRarity')}
        items={rarities}
        sel={raritySel}
        onToggle={(id) => toggleMulti('rarity', id)}
      />

      <label className="flex min-h-9 items-center gap-2 text-sm text-muted">
        <input
          type="checkbox"
          checked={!!search.hv}
          onChange={(e) => patch({ hv: e.target.checked ? true : undefined })}
        />
        {t('highValueOnly')}
      </label>

      <div className="space-y-1 text-sm">
        <div className="font-medium">{t('priceRange')}</div>
        <div className="flex items-center gap-2">
          <input
            type="number"
            inputMode="numeric"
            placeholder={t('minPrice')}
            defaultValue={search.min}
            onBlur={(e) => patch({ min: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border border-border-strong px-2 py-1.5 bg-surface text-fg placeholder:text-faint outline-none transition-colors duration-150 focus:border-muted"
          />
          <span className="text-faint">—</span>
          <input
            type="number"
            inputMode="numeric"
            placeholder={t('maxPrice')}
            defaultValue={search.max}
            onBlur={(e) => patch({ max: e.target.value ? Number(e.target.value) : undefined })}
            className="w-full rounded-lg border border-border-strong px-2 py-1.5 bg-surface text-fg placeholder:text-faint outline-none transition-colors duration-150 focus:border-muted"
          />
        </div>
      </div>

      {hasFilter && (
        <button
          type="button"
          onClick={clearAll}
          className="text-xs text-muted underline-offset-2 hover:text-fg hover:underline"
        >
          {t('clearAll')}
        </button>
      )}
    </div>
  )

  const sortSelect = (
    <select
      value={search.sort ?? 'price_desc'}
      onChange={(e) => patch({ sort: e.target.value as CardSearch['sort'] })}
      aria-label={t('filterSort')}
      className="h-9 rounded-lg border border-border-strong bg-surface px-2 text-sm text-fg outline-none transition-colors duration-150 hover:border-muted focus:border-muted"
    >
      <option value="price_desc">{t('sortPriceDesc')}</option>
      <option value="price_asc">{t('sortPriceAsc')}</option>
      <option value="newest">{t('sortNewest')}</option>
      <option value="oldest">{t('sortOldest')}</option>
    </select>
  )

  return (
    // 右侧内容列用 minmax(0,1fr)：否则超长卡名/编号的 min-content 会顶宽整列。
    <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
      {/* 桌面筛选栏：常驻、粘在头部下方。手机上整条轨道不渲染，
          改由内容列顶部的工具条承担（见下）——否则「筛选 / 展开」那两行
          会在首屏占掉 ~120px，把第一张卡推到折线以下。 */}
      <aside className="hidden min-w-0 lg:sticky lg:top-20 lg:block lg:self-start">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">{t('filters')}</h2>
          {hasFilter && (
            <span className="rounded-full bg-surface-2 px-2 py-0.5 text-xs text-muted tabular-nums">
              {activeCount}
            </span>
          )}
        </div>
        {facetBody}
      </aside>

      <section
        ref={gridTopRef}
        tabIndex={-1}
        className="min-w-0 scroll-mt-20 outline-none"
      >
        {/* 工具条：筛选开关 + 结果计数 + 排序，一行 36px。
            手机首屏的第一张卡因此从约 300px 提到约 130px。 */}
        <div className="mb-4 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border-strong px-3 text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg lg:hidden"
          >
            {t('filters')}
            {activeCount > 0 && (
              <span className="rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent tabular-nums">
                {activeCount}
              </span>
            )}
          </button>
          <span className="text-sm text-muted tabular-nums">
            {t('totalCount', { total })}
          </span>
          <div className="ml-auto">{sortSelect}</div>
        </div>

        {/* 手机折叠体：默认不占位（连 `mt` 也不占），展开后才插入。 */}
        {filtersOpen && (
          <div className="mb-4 rounded-xl border border-border bg-surface p-4 lg:hidden">
            {facetBody}
          </div>
        )}

        {result.items.length > 0 ? (
          // key 跟着筛选与页码走：换页/换筛选时网格重挂载，`grid-enter` 播一次。
          <div
            key={`${search.page ?? 1}-${search.ip}-${search.series}-${search.sub}-${search.rarity}-${search.hv}-${search.min}-${search.max}-${search.q}-${search.sort}`}
            className={`grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4 ${changed ? 'grid-enter' : ''}`}
          >
            {result.items.map((c) => (
              <CardCard key={c.id} card={c} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-border py-16 text-center">
            <p className="text-sm text-faint">{t('emptyFiltered')}</p>
            {hasFilter && (
              <button
                type="button"
                onClick={clearAll}
                className="mt-4 inline-flex items-center rounded-lg border border-border-strong px-3 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
              >
                {t('clearAll')}
              </button>
            )}
          </div>
        )}

        <Pagination page={page} totalPages={totalPages} onPage={patchPage} />
      </section>
    </div>
  )
}

function Facet({
  title,
  items,
  sel,
  enabled,
  onToggle,
}: {
  title: string
  items: { id: number; name: string }[]
  sel: Set<number>
  enabled?: (item: { id: number; name: string }) => boolean
  onToggle: (id: number) => void
}) {
  if (items.length === 0) return null
  return (
    <div>
      <div className="font-medium text-sm mb-2">{title}</div>
      <div className="space-y-1 max-h-52 overflow-auto pr-1">
        {items.map((it) => {
          const isEnabled = enabled ? enabled(it) : true
          return (
            <label
              key={it.id}
              className={`flex items-center gap-2 text-sm ${isEnabled ? '' : 'opacity-30'}`}
            >
              <input
                type="checkbox"
                checked={sel.has(it.id)}
                disabled={!isEnabled}
                onChange={() => onToggle(it.id)}
              />
              {it.name}
            </label>
          )
        })}
      </div>
    </div>
  )
}
