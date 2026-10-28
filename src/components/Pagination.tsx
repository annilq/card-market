import { useT } from '~/lib/i18n/react'
import { pageWindow } from '~/lib/pagination'

/**
 * 页码分页：‹ 1 2 … 20 ›。只负责渲染与回报页码，
 * 跳转（以及保留筛选条件）留在路由里，组件本身不认识 router。
 */
export function Pagination({
  page,
  totalPages,
  onPage,
}: {
  page: number
  totalPages: number
  onPage: (page: number) => void
}) {
  const t = useT()
  if (totalPages <= 1) return null

  const slots = pageWindow(page, totalPages)
  // 窄屏（<390）放不下「9 个 36px 控件 + 间距」共 372px。两种处理方式：
  // 换行（325 时两行）或收缩。选收缩：分页是一条整体语义，换行会读成两组页码。
  // 最窄 28px（320 时），仍高于 WCAG 2.5.8 的 24px 最小点击尺寸；360 以上回到 32/36px。
  // 参考图：当前页是一颗品牌红方块，其余页码没有边框，只有文字。
  const arrow =
    'inline-flex h-9 min-w-7 min-[360px]:min-w-8 sm:min-w-9 items-center justify-center rounded px-1.5 min-[360px]:px-2 sm:px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent transition'
  const pageBtn =
    'inline-flex h-9 min-w-7 min-[360px]:min-w-8 sm:min-w-9 items-center justify-center rounded px-1.5 min-[360px]:px-2 sm:px-3 text-sm transition'

  return (
    <nav aria-label={t('paginationAria')} className="mt-8 flex justify-center">
      <div className="flex items-center justify-center gap-1 max-w-full">
        <button
          type="button"
          onClick={() => onPage(page - 1)}
          disabled={page <= 1}
          aria-label={t('prevPage')}
          className={arrow}
        >
          ‹
        </button>

        {slots.map((n, i) =>
          n === null ? (
            <span
              key={`gap-${i}`}
              aria-hidden="true"
              className="px-1 text-sm text-faint"
            >
              …
            </span>
          ) : (
            <button
              key={n}
              type="button"
              onClick={() => onPage(n)}
              aria-label={t('pageAria', { n })}
              aria-current={n === page ? 'page' : undefined}
              className={
                n === page
                  ? `${pageBtn} bg-brand font-semibold text-white`
                  : `${pageBtn} text-fg hover:bg-surface-2`
              }
            >
              {n}
            </button>
          ),
        )}

        <button
          type="button"
          onClick={() => onPage(page + 1)}
          disabled={page >= totalPages}
          aria-label={t('nextPage')}
          className={arrow}
        >
          ›
        </button>
      </div>
    </nav>
  )
}
