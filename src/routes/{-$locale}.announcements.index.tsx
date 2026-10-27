import { createFileRoute, Link } from '@tanstack/react-router'
import { getAnnouncements } from '~/lib/directus'
import { formatDate, useLocale, useT } from '~/lib/i18n/react'
import { translate } from '~/lib/i18n/messages'
import { buildHead, localeFromMatches, ogImage, siteFromMatches, siteNameOf } from '~/lib/seo'

export const Route = createFileRoute('/{-$locale}/announcements/')({
  loader: async () => ({ items: await getAnnouncements() }),
  head: async ({ matches }) => {
    const locale = localeFromMatches(matches)
    return buildHead({
      locale,
      pathname: '/announcements',
      siteName: siteNameOf(siteFromMatches(matches), locale),
      title: translate(locale, 'announcementsTitle'),
      image: ogImage(matches),
    })
  },
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
              <span className="text-[11px] bg-pinned-bg text-pinned rounded px-1.5 py-0.5">
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
