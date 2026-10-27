import { createFileRoute, Link } from '@tanstack/react-router'
import { getAnnouncements } from '~/lib/directus'
import { formatDate, useLocale, useT } from '~/lib/i18n/react'

export const Route = createFileRoute('/{-$locale}/announcements/')({
  loader: async () => ({ items: await getAnnouncements() }),
  component: Announcements,
})

function Announcements() {
  const { items } = Route.useLoaderData()
  const t = useT()
  const locale = useLocale()
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold mb-2">{t('announcementsTitle')}</h1>
      {items.length === 0 && (
        <div className="text-sm text-faint">{t('noAnnouncements')}</div>
      )}
      {items.map((a) => (
        <Link
          key={a.id}
          to="/{-$locale}/announcements/$id"
          params={{ id: String(a.id) }}
          className="block rounded-lg border border-border bg-surface px-4 py-3 hover:shadow-sm"
        >
          <div className="flex items-center gap-2">
            {a.is_pinned && (
              <span className="text-[10px] bg-rose-500/15 text-rose-600 dark:text-rose-400 rounded px-1.5 py-0.5">
                {t('pinned')}
              </span>
            )}
            <span className="font-medium text-fg min-w-0 break-words">{a.title}</span>
          </div>
          <div className="text-xs text-faint mt-1">
            {formatDate(a.published_at, locale)}
          </div>
        </Link>
      ))}
    </div>
  )
}
