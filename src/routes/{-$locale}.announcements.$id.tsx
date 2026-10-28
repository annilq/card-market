import { createFileRoute, Link } from '@tanstack/react-router'
import { getAnnouncement, getAnnouncements } from '~/lib/directus'
import { formatDate, useLocale, useT } from '~/lib/i18n/react'
import { translate } from '~/lib/i18n/messages'
import { buildHead, localeFromMatches, ogImage, plainText, siteFromMatches, siteNameOf } from '~/lib/seo'
import type { Announcement } from '~/lib/types'

export const Route = createFileRoute('/{-$locale}/announcements/$id')({
  // 同时取回公告列表：正文底部要给出「其他公告」，让读到最后的人有下一步。
  // 列表本身很小（客户一个人运营），多这一个请求换来一条真实的续读路径。
  loader: async ({ params }): Promise<{
    item: Awaited<ReturnType<typeof getAnnouncement>>
    others: Awaited<ReturnType<typeof getAnnouncements>>
  }> => {
    const [item, all] = await Promise.all([
      getAnnouncement(params.id),
      getAnnouncements(),
    ])
    return {
      item,
      others: all.filter((a) => String(a.id) !== String(params.id)).slice(0, 2),
    }
  },
  // 公告详情：标题用公告标题，描述取正文前 140 字纯文本。
  head: async ({ matches, params }) => {
    const locale = localeFromMatches(matches)
    const site = siteFromMatches(matches)
    const item = (matches[matches.length - 1]?.loaderData as
      | { item?: Announcement | null }
      | undefined)?.item
    const siteName = siteNameOf(site, locale)
    if (!item) {
      return buildHead({
        locale,
        pathname: `/announcements/${params.id}`,
        siteName,
        title: translate(locale, 'announcementNotFound'),
        noindex: true,
      })
    }
    return buildHead({
      locale,
      pathname: `/announcements/${params.id}`,
      siteName,
      title: item.title,
      description: plainText(item.body) || undefined,
      image: ogImage(matches),
      type: 'article',
    })
  },
  component: AnnouncementDetail,
})

function AnnouncementDetail() {
  const { item, others } = Route.useLoaderData()
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
    // 正文铺满整条内容列：参考图实测正文 357→1559（1200px），不是窄栏。
    <article>
      <Link
        to="/{-$locale}/announcements"
        className="inline-flex items-center py-1 text-xs text-muted transition-colors duration-150 hover:text-fg hover:underline"
      >
        {t('backToAnnouncementsArrow')}
      </Link>
      {/* 标题 ~28px：参考图里公告标题实测约 29px，比 24px 更接近。
          置顶徽章前置到标题同一行，日期另起一行右对齐——这是参考图的排版。 */}
      <h1 className="mt-2 flex flex-wrap items-center gap-2 break-words text-[28px] font-bold leading-snug">
        {item.is_pinned && (
          <span className="rounded bg-pinned-bg px-1.5 py-0.5 text-[11px] font-medium text-pinned">
            {t('pinned')}
          </span>
        )}
        {item.title}
      </h1>
      {/* 未设发布时间就不渲染日期行：一排「—」比没有日期更吵。 */}
      {item.published_at && (
        <div className="mt-2 flex justify-end text-xs text-faint tabular-nums">
          <time dateTime={item.published_at}>
            {formatDate(item.published_at, locale)}
          </time>
        </div>
      )}
      {item.body && (
        // 富文本由管理员在后台维护（受信任来源）；XSS 防护见 development.md §4.4 次要项。
        // 首段由 `.prose > p:first-of-type` 提到 17px——读者真正开始读的地方。
        <div
          className="prose mt-6 text-body [&_a]:text-link [&_a]:underline [&_a]:underline-offset-2 [&_img]:rounded-lg [&_h2]:text-fg [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-6 [&_h2]:mb-1.5 [&_h3]:text-fg [&_h3]:font-semibold [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5"
          dangerouslySetInnerHTML={{ __html: item.body }}
        />
      )}

      {/* 其他公告：读到最后的人需要下一步，而不是只剩页脚。 */}
      {others.length > 0 && (
        <section className="mt-12 border-t border-border pt-5">
          <h2 className="text-sm font-semibold text-muted">
            {t('otherAnnouncements')}
          </h2>
          <ul className="mt-2 divide-y divide-border">
            {others.map((a) => (
              <li key={a.id}>
                <Link
                  to="/{-$locale}/announcements/$id"
                  params={{ id: String(a.id) }}
                  viewTransition
                  className="flex min-h-11 items-center gap-3 py-2.5 text-sm text-fg transition-colors duration-150 hover:text-muted"
                >
                  <span className="min-w-0 flex-1 truncate">{a.title}</span>
                  {a.published_at && (
                    <span className="shrink-0 text-xs text-faint tabular-nums">
                      {formatDate(a.published_at, locale)}
                    </span>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  )
}
