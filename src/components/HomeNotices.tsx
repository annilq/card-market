import { Link } from '@tanstack/react-router'
import { formatDate, useLocale, useT } from '~/lib/i18n/react'
import type { Announcement } from '~/lib/types'

export function HomeNotices({ items }: { items: Announcement[] }) {
  const t = useT()
  const locale = useLocale()
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{t('homeNotices')}</h2>
        <Link
          to="/{-$locale}/announcements"
          className="text-sm text-muted hover:underline"
        >
          {t('viewAll')}
        </Link>
      </div>
      <ul className="rounded-xl border border-border bg-surface divide-y divide-border">
        {items.slice(0, 3).map((a) => (
          <li key={a.id}>
            <Link
              to="/{-$locale}/announcements/$id"
              params={{ id: String(a.id) }}
              className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-2"
            >
              {/* 未设发布时间（发布即展示）的公告不占日期位，避免一排「—」 */}
              {a.published_at && (
                <span className="w-28 shrink-0 whitespace-nowrap text-xs text-faint tabular-nums">
                  {formatDate(a.published_at, locale)}
                </span>
              )}
              {a.is_pinned && (
                <span className="shrink-0 text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded px-1.5 py-0.5">
                  {t('pinned')}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {a.title}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
