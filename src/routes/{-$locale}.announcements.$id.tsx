import { createFileRoute, Link } from '@tanstack/react-router'
import { getAnnouncement } from '~/lib/directus'
import { formatDate, useLocale, useT } from '~/lib/i18n/react'

export const Route = createFileRoute('/{-$locale}/announcements/$id')({
  loader: async ({ params }): Promise<{
    item: Awaited<ReturnType<typeof getAnnouncement>>
  }> => ({ item: await getAnnouncement(params.id) }),
  component: AnnouncementDetail,
})

function AnnouncementDetail() {
  const { item } = Route.useLoaderData()
  const t = useT()
  const locale = useLocale()
  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">{t('announcementNotFound')}</p>
        <Link to="/{-$locale}/announcements" className="text-fg underline">
          {t('backToAnnouncements')}
        </Link>
      </div>
    )
  }
  return (
    <article className="max-w-2xl mx-auto">
      <Link to="/{-$locale}/announcements" className="text-sm text-muted hover:underline">
        {t('backToAnnouncementsArrow')}
      </Link>
      <h1 className="text-2xl font-bold mt-3">{item.title}</h1>
      <div className="text-xs text-faint mt-1">
        {formatDate(item.published_at, locale)}
      </div>
      {item.body && (
        // 富文本由管理员在后台维护（受信任来源）；XSS 防护见 development.md §4.4 次要项
        <div
          className="prose mt-4 text-body [&_a]:text-sky-600 dark:[&_a]:text-sky-400 [&_img]:rounded-lg"
          dangerouslySetInnerHTML={{ __html: item.body }}
        />
      )}
    </article>
  )
}
