import { useState } from 'react'
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { getCards, getIps, getRarities, getSeries, getSubSeries } from '~/lib/directus'
import { CardCard } from '~/components/CardCard'
import { Pagination } from '~/components/Pagination'
import { useT } from '~/lib/i18n/react'
import type { CardQuery, Ip, Rarity, Series, SubSeries } from '~/lib/types'

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
  sort?: 'price_desc' | 'price_asc' | 'newest'
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
    sort:
      s.sort === 'price_asc' || s.sort === 'newest'
        ? s.sort
        : s.sort === 'price_desc'
          ? 'price_desc'
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

  const patch = (p: Partial<CardSearch>) =>
    navigate({ to: '/{-$locale}/cards', search: { ...search, ...p, page: 1 } })

  const patchPage = (page: number) =>
    navigate({ to: '/{-$locale}/cards', search: { ...search, page } })

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

  return (
    // 右侧内容列用 minmax(0,1fr)：否则超长卡名/编号的 min-content 会顶宽整列。
    <div className="grid lg:grid-cols-[260px_minmax(0,1fr)] gap-6">
      <aside className="min-w-0 lg:sticky lg:top-20 lg:self-start">
        <div className="flex items-center justify-between mb-4 lg:mb-0">
          <h2 className="font-semibold">{t('filters')}</h2>
          <div className="flex items-center gap-3">
            {hasFilter && (
              <button onClick={clearAll} className="text-xs text-muted hover:underline">
                {t('clearAll')}
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen((v) => !v)}
              className="lg:hidden rounded-lg border border-border-strong px-3 py-1.5 text-sm text-muted"
            >
              {filtersOpen ? t('collapse') : t('expand')}
            </button>
          </div>
        </div>

        <div
          className={`${filtersOpen ? 'block' : 'hidden'} lg:block lg:mt-4 space-y-5 mt-4`}
        >
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

          <label className="flex items-center gap-2 text-sm text-muted">
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
                placeholder={t('minPrice')}
                defaultValue={search.min}
                onBlur={(e) => patch({ min: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full rounded border border-border-strong px-2 py-1 bg-surface text-fg placeholder:text-faint outline-none focus:border-muted"
              />
              <span className="text-faint">—</span>
              <input
                type="number"
                placeholder={t('maxPrice')}
                defaultValue={search.max}
                onBlur={(e) => patch({ max: e.target.value ? Number(e.target.value) : undefined })}
                className="w-full rounded border border-border-strong px-2 py-1 bg-surface text-fg placeholder:text-faint outline-none focus:border-muted"
              />
            </div>
          </div>
        </div>
      </aside>

      <section className="min-w-0">
        {/* 关键词输入已移到公共 header，这里只留排序，避免同一页面两套搜索框 */}
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={search.sort ?? 'price_desc'}
            onChange={(e) => patch({ sort: e.target.value as CardSearch['sort'] })}
            className="ml-auto rounded-lg border border-border-strong px-3 py-2 text-sm bg-surface text-fg outline-none focus:border-muted"
          >
            <option value="price_desc">{t('sortPriceDesc')}</option>
            <option value="price_asc">{t('sortPriceAsc')}</option>
            <option value="newest">{t('sortNewest')}</option>
          </select>
        </div>

        <div className="text-sm text-muted mb-3">{t('totalCount', { total })}</div>

        {result.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {result.items.map((c) => (
              <CardCard key={c.id} card={c} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-faint py-16 text-center border border-dashed border-border rounded-xl">
            {t('emptyFiltered')}
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
