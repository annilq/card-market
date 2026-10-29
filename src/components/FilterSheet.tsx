import { useEffect, useRef, useState } from 'react'
import { useT } from '~/lib/i18n/react'
import type { CardSort, Series, SubSeries } from '~/lib/types'

/**
 * 右侧滑出的筛选面板。样式与结构来自设计图实测：
 * 面板占视口右侧 71%（533 宽的稿上实测 378px），整块是品牌红底白字；
 * 「分类」是二级选择——左侧 32% 宽的竖直 tab 列选主系列，右侧列选子系列，
 * 子系列列表第一项是「全部」，用来只选主系列而不选任何子系列。
 *
 * 选择即生效、生效即关闭：设计图里面板底部没有「确定 / 重置」按钮，
 * 所以不做「选完还要再点一次确定」这道手。
 */

/** 面板当前开的是哪一个筛选。三个筛选共用同一个面板，只是内容不同。 */
export type FilterField = 'series' | 'type' | 'sort'

export interface FilterSheetValue {
  seriesId: number | undefined
  subSeriesId: number | undefined
  cardStatus: 'raw' | 'packaged' | undefined
  sort: CardSort
}

export interface FilterOption {
  /** 空串表示「全部」。 */
  value: string
  label: string
}

function CloseIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  )
}

// 行高 48px：设计图实测行距 51px，48 仍在 WCAG 2.5.8 的 24px 之上且够手指点。
const row =
  'flex h-12 w-full items-center px-4 text-left text-base transition-colors duration-150'

export function FilterSheet({
  field,
  title,
  series,
  subSeries,
  value,
  options,
  onPick,
  onClose,
}: {
  field: FilterField
  title: string
  /** 主系列（调用方已按 IP 收窄）。 */
  series: Series[]
  /** 全部子系列；面板内按当前主系列再过滤。 */
  subSeries: SubSeries[]
  value: FilterSheetValue
  /** 类型 / 排序的一级选项。分类不走这个字段。 */
  options: FilterOption[]
  onPick: (next: Partial<FilterSheetValue>) => void
  onClose: () => void
}) {
  const t = useT()
  const panelRef = useRef<HTMLDivElement>(null)
  // 二级面板里当前看的是哪个主系列。它只是面板内的浏览位置，
  // 不写回 URL——真正生效是在右侧选中子系列（或「全部」）的那一刻。
  const [tabId, setTabId] = useState<number | undefined>(
    value.seriesId ?? series[0]?.id,
  )

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null
    // 焦点进面板：读屏与键盘用户打开的是对话框，而不是身后那张页面。
    panelRef.current?.focus()
    // 面板打开时锁住背景滚动，否则手指在面板里滑动会把身后的页面一起带走。
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      // 关闭后把焦点还回去，键盘用户才不会掉到文档开头。
      previous?.focus?.()
    }
  }, [onClose])

  const subs = tabId ? subSeries.filter((s) => s.series_id === tabId) : []

  const pickSeries = (subId: number | undefined) => {
    onPick({ seriesId: tabId, subSeriesId: subId })
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50">
      {/* 遮罩：点它关闭。用 div + aria-hidden，因为它不是可聚焦控件，
          键盘用户走 Esc 或面板右上角那个关闭按钮。 */}
      <div
        aria-hidden="true"
        onClick={onClose}
        className="sheet-fade absolute inset-0 bg-black/45"
      />

      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        className="sheet-in absolute inset-y-0 right-0 flex w-[min(420px,88vw)] flex-col bg-brand text-white outline-none"
      >
        <div className="flex h-14 shrink-0 items-center justify-between px-4">
          <span className="text-base font-bold">{title}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('filterSheetClose')}
            className="inline-flex h-9 w-9 items-center justify-center rounded text-white transition hover:bg-white/15"
          >
            <CloseIcon />
          </button>
        </div>

        {field === 'series' ? (
          series.length === 0 ? (
            // 该 IP 下还没有主系列（后台没建）。给一句话而不是两列空栏：
            // 空的两列会被读成「加载中」或「点不动」，说清楚是没数据。
            <div className="min-h-0 flex-1 p-4 text-sm text-white/90">
              {t('noCategories')}
            </div>
          ) : (
            // 二级：左竖 tab 选主系列，右列选子系列。
            // 两列各自滚动——主系列或子系列都可能很长，整体滚动会把另一列顶出视野。
            <div className="flex min-h-0 flex-1">
              <div className="w-[32%] shrink-0 overflow-y-auto bg-black/15">
                {series.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => setTabId(s.id)}
                    aria-current={s.id === tabId}
                    className={`${row} px-3 text-sm ${
                      s.id === tabId
                        ? 'bg-black/15 font-bold'
                        : 'font-medium text-white/85'
                    }`}
                  >
                    <span className="line-clamp-2">{s.name}</span>
                  </button>
                ))}
              </div>
              <div className="min-w-0 flex-1 overflow-y-auto">
                {/* 「全部」置顶：只选主系列、不选任何子系列时用这一项。 */}
                <button
                  type="button"
                  onClick={() => pickSeries(undefined)}
                  className={`${row} ${
                    tabId === value.seriesId && value.subSeriesId == null
                      ? 'bg-white/20 font-bold'
                      : 'font-medium'
                  }`}
                >
                  <span className="truncate">{t('facetAll')}</span>
                </button>
                {subs.map((s) => (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => pickSeries(s.id)}
                    className={`${row} ${
                      s.id === value.subSeriesId
                        ? 'bg-white/20 font-bold'
                        : 'font-medium'
                    }`}
                  >
                    <span className="truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>
          )
        ) : (
          // 一级：类型与排序没有第二层，直接一列。
          <div className="min-h-0 flex-1 overflow-y-auto">
            {options.map((o) => (
              <button
                key={o.value || '__all'}
                type="button"
                onClick={() => {
                  if (field === 'type') {
                    onPick({
                      cardStatus: o.value
                        ? (o.value as 'raw' | 'packaged')
                        : undefined,
                    })
                  } else {
                    onPick({ sort: o.value as CardSort })
                  }
                  onClose()
                }}
                className={`${row} ${
                  (field === 'type' ? o.value === (value.cardStatus ?? '') : o.value === value.sort)
                    ? 'bg-white/20 font-bold'
                    : 'font-medium'
                }`}
              >
                <span className="truncate">{o.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
