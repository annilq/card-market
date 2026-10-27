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
  const arrow =
    'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border-strong px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg disabled:opacity-40 disabled:hover:bg-transparent transition'

  return (
    <nav aria-label={t('paginationAria')} className="mt-8 flex justify-center">
      <div className="flex items-center gap-1.5">
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
                  ? 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg bg-accent text-on-accent px-3 text-sm font-semibold'
                  : 'inline-flex h-9 min-w-9 items-center justify-center rounded-lg border border-border-strong px-3 text-sm text-muted hover:bg-surface-2 hover:text-fg transition'
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
