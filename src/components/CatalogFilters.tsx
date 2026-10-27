import { useT } from '~/lib/i18n/react'
import type { CardSort, Ip, Series } from '~/lib/types'

/**
 * 首页的四联筛选：回购分类（IP）· 分类（系列）· 类型（卡品状态）· 排序。
 *
 * 全都是原生 `<select>`，不是自定义下拉：原生控件在手机上直接唤起系统选择器、
 * 键盘可操作、读屏可读，也不需要自己实现点击外部关闭与焦点管理。
 * 四个控件是同一体的一个数组在渲染，避免四份几乎相同的 JSX 各自漂移。
 *
 * 筛选状态由调用方持有（首页放在 URL 查询串里），本组件只负责「选了什么就回报什么」。
 */
export interface CatalogFilterValue {
  ipId: number | undefined
  seriesId: number | undefined
  cardStatus: 'raw' | 'packaged' | undefined
  sort: CardSort
}

const uiSelect =
  'h-10 w-full appearance-none rounded-lg border border-border-strong bg-surface px-3 pr-9 text-sm text-fg outline-none transition hover:border-muted focus:border-muted'

// 原生 select 的箭头在深色主题下不可控，统一叠一个 chevron。
// 走内联 style 而不是 Tailwind 任意值：任意值里的引号与 % 编码在构建时
// 会被改写（实测生成的 background-image 是 none），内联不会被处理。
const chevronStyle = {
  backgroundImage:
    "url(\"data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")",
  backgroundRepeat: 'no-repeat',
  backgroundPosition: 'right 0.75rem center',
  backgroundSize: '16px 16px',
} as const

export function CatalogFilters({
  value,
  ips,
  series,
  onChange,
}: {
  value: CatalogFilterValue
  ips: Ip[]
  series: Series[]
  onChange: (next: Partial<CatalogFilterValue>) => void
}) {
  const t = useT()

  // 「分类」跟着「回购分类」收窄：选了宝可梦就只列宝可梦的系列。
  // 没选 IP 时列全部，这样单用「分类」也能查。
  const seriesOptions = value.ipId
    ? series.filter((s) => s.ip_id === value.ipId)
    : series

  const fields = [
    {
      id: 'ip',
      label: t('filterIp'),
      value: value.ipId == null ? '' : String(value.ipId),
      allLabel: t('facetAllIps'),
      options: ips.map((ip) => ({ value: String(ip.id), label: ip.name })),
      onPick: (raw: string) =>
        // 换 IP 时清掉不再属于它的系列，否则会留下一个选不中的旧值。
        onChange({ ipId: raw ? Number(raw) : undefined }),
    },
    {
      id: 'series',
      label: t('filterSeries'),
      value: value.seriesId == null ? '' : String(value.seriesId),
      allLabel: t('facetAll'),
      options: seriesOptions.map((s) => ({ value: String(s.id), label: s.name })),
      onPick: (raw: string) => onChange({ seriesId: raw ? Number(raw) : undefined }),
    },
    {
      id: 'type',
      label: t('filterType'),
      value: value.cardStatus ?? '',
      allLabel: t('facetAll'),
      options: [
        { value: 'raw', label: t('typeRaw') },
        { value: 'packaged', label: t('typePackaged') },
      ],
      onPick: (raw: string) =>
        onChange({ cardStatus: raw ? (raw as 'raw' | 'packaged') : undefined }),
    },
    {
      id: 'sort',
      label: t('filterSort'),
      // 排序没有「全部」这一档：它总得是一个确定的顺序。
      value: value.sort,
      allLabel: null as string | null,
      options: [
        { value: 'price_desc', label: t('sortPriceDesc') },
        { value: 'price_asc', label: t('sortPriceAsc') },
        { value: 'newest', label: t('sortNewest') },
        { value: 'oldest', label: t('sortOldest') },
      ],
      onPick: (raw: string) => onChange({ sort: raw as CardSort }),
    },
  ]

  return (
    <section aria-label={t('catalogFilters')}>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {fields.map((f) => (
          <label key={f.id} className="block min-w-0">
            <span className="mb-1 block text-xs text-subtle">{f.label}</span>
            <select
              value={f.value}
              onChange={(e) => f.onPick(e.target.value)}
              className={uiSelect}
              style={chevronStyle}
            >
              {f.allLabel && <option value="">{f.allLabel}</option>}
              {f.options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
        ))}
      </div>
    </section>
  )
}
