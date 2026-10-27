import { Link } from '@tanstack/react-router'
import { useT } from '~/lib/i18n/react'
import { DEFAULT_CARD_SORT } from '~/lib/types'
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
// 宽度统一，但要放得下最长的那条选项。实测可用内宽（扣掉左右内边距与
// 右侧箭头位）必须 ≥ 111px：英文 "Price: high to low" 要 111px、
// 日文「タイプ」选项「パッケージあり」要 98px、中文「价格：高→低」要 83px。
// w-32(128px) 只剩 78px 可用，三种语言都会被截断；给到 w-44(176px) 才够。
// 桌面固定 w-44；手机上改成占满剩余宽度（flex-1），否则 176px 的框在
// 390 宽的屏幕上会留下一大块空白。
const uiSelect =
  'h-10 w-full min-w-0 flex-1 sm:w-44 sm:flex-none appearance-none rounded-lg border border-border-strong bg-surface px-3 pr-9 text-sm text-fg outline-none transition hover:border-muted focus:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted'

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
  onReset,
  localeParams,
}: {
  value: CatalogFilterValue
  ips: Ip[]
  series: Series[]
  onChange: (next: Partial<CatalogFilterValue>) => void
  /** 清空全部筛选。是否可用由调用方判断（没有筛选时按钮禁用）。 */
  onReset: () => void
  /** 当前语言段。显式传入，避免 `to="/{-$locale}/..."` 从非法路径段继承出二次 404。 */
  localeParams: { locale: string | undefined }
}) {
  const t = useT()

  // 有没有可重置的东西：三个筛选为空且排序是默认值时才禁用按钮。
  // 用禁用而不是隐藏，按钮位置才不会在筛选前后跳动。
  const isDirty =
    value.ipId != null ||
    value.seriesId != null ||
    value.cardStatus != null ||
    value.sort !== DEFAULT_CARD_SORT
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
        { value: DEFAULT_CARD_SORT, label: t('sortPriceDesc') },
        { value: 'price_asc', label: t('sortPriceAsc') },
        { value: 'newest', label: t('sortNewest') },
        { value: 'oldest', label: t('sortOldest') },
      ],
      onPick: (raw: string) => onChange({ sort: raw as CardSort }),
    },
  ]

  return (
    <div role="group" aria-label={t('catalogFilters')}>
      {/* 标题行：右侧是「重置」与「全部」。与站内「通知公告」「高价买取」的
          标题行同一套排版，三个区块的「全部」用同一种纯文字加箭头样式。
          「重置」是操作而不是导航，用 button；没有可重置的筛选时禁用。 */}
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold">{t('catalogFilters')}</h2>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={onReset}
            disabled={!isDirty}
            className="text-sm text-muted transition hover:text-fg hover:underline disabled:cursor-default disabled:text-faint disabled:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t('catalogReset')}
          </button>
          <Link
            to="/{-$locale}/cards"
            params={localeParams}
            className="text-sm text-muted transition hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t('viewAll')}
          </Link>
        </div>
      </div>

      {/* 标签与下拉框同一行（参考图就是这个排版）。
          手机单列：标签在左、下拉占满剩余宽度；≥1024 四列并排。
          标签按语言给最小宽度：中日文三到四字，英文 Category / Series / Type
          更长，不分开设的话英文下下拉框会被标签挤窄、四列也参差不齐。
          标签与下拉的间距用 gap-1.5（6px）：之前是 gap-2（8px）再叠加标签
          固定 80px 宽度，中英文短标签后面会空出一大段。 */}
      {/* 手机：每行一个筛选（w-full），标签在左、下拉占满整行剩余宽度。
          平板起才并排：≥640 两列，≥1024 四列，每列宽度由内容决定。 */}
      <div className="flex flex-col gap-2.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-x-5">
        {fields.map((f) => (
          <label
            key={f.id}
            className="flex w-full min-w-0 items-center gap-1.5 sm:w-auto"
          >
            {/* 标签宽度按语言自适应（不设固定宽度）：固定 80px 时「分类」「类型」
                只有 24px 宽，后面会空出 56px，看起来就是标签与下拉间距过大。
                改成由内容决定宽度后，同一行内四个下拉会因标签长短不同而左边缘
                不齐——这是有意的取舍：对齐四列只是视觉整齐，紧贴标签才是
                用户实际感知到的问题。 */}
            <span className="shrink-0 whitespace-nowrap text-xs text-subtle">
              {f.label}
            </span>
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
