import { Link } from '@tanstack/react-router'
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

// 下拉本身也补焦点环：只靠 border 变色在深色主题下几乎看不出焦点在哪。
const uiSelect =
  'h-10 w-full appearance-none rounded-lg border border-border-strong bg-surface px-3 pr-9 text-sm text-fg outline-none transition hover:border-muted focus:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted'

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
  localeParams,
}: {
  value: CatalogFilterValue
  ips: Ip[]
  series: Series[]
  onChange: (next: Partial<CatalogFilterValue>) => void
  /** 当前语言段。显式传入，避免 `to="/{-$locale}/..."` 从非法路径段继承出二次 404。 */
  localeParams: { locale: string | undefined }
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
    <div role="group" aria-label={t('catalogFilters')}>
      {/* 标题与「全部卡牌」同一行：与站内「通知公告」「高价买取」两个区块的
          标题行结构一致，读者不用为同一个位置学两种排版。
          文案用「全部卡牌」而不是「全部」：这里的「全部」在筛选语境里
          容易被读成「清空筛选」，而它其实是跳到卡牌列表页。
          跳转用 Link 而不是 button：它是导航，键盘与读屏都该按链接对待。 */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('catalogFilters')}</h2>
        <Link
          to="/{-$locale}/cards"
          params={localeParams}
          className="inline-flex items-center rounded-full border border-border-strong bg-surface px-3.5 py-1.5 text-sm text-muted transition hover:border-muted hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t('catalogBrowseAll')}
        </Link>
      </div>

      {/* 标签与下拉框同一行（参考图就是这个排版）。
          手机单列：标签在左、下拉占满剩余宽度；≥1024 四列并排。
          标签按语言给最小宽度：中日文三到四字，英文 Category / Series / Type
          更长，不分开设的话英文下下拉框会被标签挤窄、四列也参差不齐。 */}
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
        {fields.map((f) => (
          <label key={f.id} className="flex min-w-0 items-center gap-2">
            {/* 标签最小宽度：中文「回购分类」四字 48px、英文 Category 52px、
                日文 買取カテゴリ 72px。统一给到 5rem(80px)，三种语言下
                下拉框左边缘才会对齐，四列宽度也一致。 */}
            <span className="w-20 shrink-0 text-xs text-subtle">{f.label}</span>
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
    </div>
  )
}
