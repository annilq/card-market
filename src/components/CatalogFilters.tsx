import { useState } from 'react'
import { Link } from '@tanstack/react-router'
import { FilterSheet } from '~/components/FilterSheet'
import type { FilterField, FilterOption } from '~/components/FilterSheet'
import { useT } from '~/lib/i18n/react'
import { DEFAULT_CARD_SORT } from '~/lib/types'
import type { CardSort, Ip, Series, SubSeries } from '~/lib/types'

/**
 * 首页的筛选：IP 用 tab 条，分类 / 类型 / 排序用「点击 → 右侧滑出面板」。
 *
 * 三个筛选原本是原生 `<select>`，改成面板是交互设计师的要求：select 在手机上
 * 唤起系统滚轮，样式不可控，也放不下「主系列 → 子系列」两级。面板则能把
 * 第二级做成竖直 tab，与附件设计一致。
 *
 * 面板只负责「选了什么就回报什么」，筛选状态仍由调用方持有（首页放在 URL 里）。
 */
export interface CatalogFilterValue {
  ipId: number | undefined
  seriesId: number | undefined
  subSeriesId: number | undefined
  cardStatus: 'raw' | 'packaged' | undefined
  sort: CardSort
}

function ChevronIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
      className="shrink-0"
    >
      <path d="m9 6 6 6-6 6" />
    </svg>
  )
}

// 触发控件：整颗是按钮，标签与当前值同行，右侧一个 chevron 表示「会展开」。
// 高度 40px：与顶栏 IP tab 同高，一排控件才不会高低不齐。
function FilterButton({
  label,
  current,
  onClick,
}: {
  label: string
  current: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="inline-flex h-10 min-w-0 max-w-full items-center gap-1.5 rounded px-3 text-sm transition-colors duration-150 hover:bg-surface-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
    >
      <span className="shrink-0 font-bold text-fg">{label}</span>
      <span className="min-w-0 truncate text-muted">{current}</span>
      <ChevronIcon />
    </button>
  )
}

// 40px 高：参考图实测 tab 从 y1476 到 1515。整颗是点击目标，
// 纯文字行只有 20px，低于 WCAG 2.5.8 的 24px。
function IpTab({
  active,
  onClick,
  label,
}: {
  active: boolean
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`inline-flex h-10 items-center px-5 text-xl transition-colors duration-150 ${
        active
          ? 'bg-brand text-white'
          : 'bg-[#F2E2E3] text-gray-400 hover:bg-[#f6dadc]'
      }`}
    >
      {label}
    </button>
  )
}

export function CatalogFilters({
  value,
  ips,
  series,
  subSeries,
  onChange,
  onReset,
  localeParams,
}: {
  value: CatalogFilterValue
  ips: Ip[]
  series: Series[]
  subSeries: SubSeries[]
  onChange: (next: Partial<CatalogFilterValue>) => void
  /** 清空全部筛选。是否可用由调用方判断（没有筛选时按钮禁用）。 */
  onReset: () => void
  /** 当前语言段。显式传入，避免 `to="/{-$locale}/..."` 从非法路径段继承出二次 404。 */
  localeParams: { locale: string | undefined }
}) {
  const t = useT()
  const [openField, setOpenField] = useState<FilterField | null>(null)

  // 有没有可重置的东西：筛选为空且排序是默认值时才禁用按钮。
  // 用禁用而不是隐藏，按钮位置才不会在筛选前后跳动。
  const isDirty =
    value.ipId != null ||
    value.seriesId != null ||
    value.subSeriesId != null ||
    value.cardStatus != null ||
    value.sort !== DEFAULT_CARD_SORT

  // 「分类」跟着 IP 收窄：选了宝可梦就只列宝可梦的主系列。
  // 没选 IP 时列全部，这样单用「分类」也能查。
  const seriesOptions = value.ipId
    ? series.filter((s) => s.ip_id === value.ipId)
    : series

  const currentSeries = series.find((s) => s.id === value.seriesId)
  const currentSub = subSeries.find((s) => s.id === value.subSeriesId)

  const seriesText = currentSeries
    ? currentSub
      ? `${currentSeries.name} / ${currentSub.name}`
      : `${currentSeries.name} / ${t('facetAll')}`
    : t('facetAll')

  const typeOptions: FilterOption[] = [
    { value: '', label: t('facetAll') },
    { value: 'raw', label: t('typeRaw') },
    { value: 'packaged', label: t('typePackaged') },
  ]
  const sortOptions: FilterOption[] = [
    { value: DEFAULT_CARD_SORT, label: t('sortPriceDesc') },
    { value: 'price_asc', label: t('sortPriceAsc') },
    { value: 'newest', label: t('sortNewest') },
    { value: 'oldest', label: t('sortOldest') },
  ]

  return (
    <div role="group" aria-label={t('catalogFilters')}>
      {/* IP tab 条：参考图里「宝可梦 / 海贼王」那一排就是 IP 选择。
          用它替代原来的「回购分类」下拉是必要的：两者筛的是同一件事，
          同时存在就是同一个筛选两个入口、且会互相打架。 */}
      <div className="mb-4 flex flex-wrap items-center justify-between">
        <div>
          <IpTab
            active={value.ipId == null}
            onClick={() => onChange({ ipId: undefined })}
            label={t('facetAllIps')}
          />
          {ips.map((ip) => (
            <IpTab
              key={ip.id}
              active={value.ipId === ip.id}
              onClick={() => onChange({ ipId: ip.id })}
              label={ip.name}
            />
          ))}
        </div>
        <div className="mb-3 flex items-center justify-between gap-3">
          <Link
            to="/{-$locale}/cards"
            params={localeParams}
            className="text-sm text-muted transition hover:text-fg hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
          >
            {t('viewAll')}
          </Link>
        </div>
      </div>

      {/* 三个筛选改成触发控件：点一下，右侧滑出选择面板。
          仍是一行排列，不再是四个下拉——面板把宽度还给了筛选值本身。 */}
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <FilterButton
          label={t('filterSeries')}
          current={seriesText}
          onClick={() => setOpenField('series')}
        />
        <FilterButton
          label={t('filterType')}
          current={
            value.cardStatus
              ? value.cardStatus === 'raw'
                ? t('typeRaw')
                : t('typePackaged')
              : t('facetAll')
          }
          onClick={() => setOpenField('type')}
        />
        <FilterButton
          label={t('filterSort')}
          current={
            sortOptions.find((o) => o.value === value.sort)?.label ??
            t('sortPriceDesc')
          }
          onClick={() => setOpenField('sort')}
        />

        {/* 「重置」仍在这一排的末尾：改完筛选之后手就在这一带。
            没有可重置项时禁用而不是隐藏，按钮位置才不会在筛选前后跳动。 */}
        <button
          type="button"
          onClick={onReset}
          disabled={!isDirty}
          className="ml-auto shrink-0 whitespace-nowrap py-1 text-sm text-muted transition hover:text-fg hover:underline disabled:cursor-default disabled:text-faint disabled:no-underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          {t('catalogReset')}
        </button>
      </div>

      {openField && (
        <FilterSheet
          field={openField}
          title={
            openField === 'series'
              ? t('filterSeries')
              : openField === 'type'
                ? t('filterType')
                : t('filterSort')
          }
          series={seriesOptions}
          subSeries={subSeries}
          value={value}
          options={openField === 'type' ? typeOptions : sortOptions}
          onPick={onChange}
          onClose={() => setOpenField(null)}
        />
      )}
    </div>
  )
}
