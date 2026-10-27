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
    <div>
      <h1 className="text-2xl font-bold">{t('announcementsTitle')}</h1>

      {items.length === 0 ? (
        // 空状态给下一步，而不是一行灰字：这个站的主任务是找卡，
        // 公告没有内容时把人送回卡牌列表比让他停在一句「暂无公告」前面有用。
        <div className="mt-8 rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-faint">{t('noAnnouncements')}</p>
          <Link
            to="/{-$locale}/cards"
            className="mt-4 inline-flex items-center rounded-lg border border-border-strong px-3 py-1.5 text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
          >
            {t('browseCards')}
          </Link>
        </div>
      ) : (
        // 归档页：单一容器 + 发丝分隔线（与首页的三条摘要刻意不同——那边是
        // 「三条摘要读成一个对象」，这边是「一份可扫的清单」）。
        // 未设发布时间的不再渲染「—」：一排破折号比没有日期更吵。
        <ul className="mt-5 rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
          {items.map((a) => (
            <li key={a.id}>
              <Link
                to="/{-$locale}/announcements/$id"
                params={{ id: String(a.id) }}
                viewTransition
                className="group flex min-h-14 items-center gap-3 px-4 py-3.5 transition-colors duration-150 hover:bg-surface-2"
              >
                <span
                  aria-hidden="true"
                  className={`h-5 w-0.5 shrink-0 rounded-full transition-colors duration-150 ${
                    a.is_pinned ? 'bg-pinned' : 'bg-transparent group-hover:bg-fg'
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    {a.is_pinned && (
                      <span className="shrink-0 text-[11px] bg-pinned-bg text-pinned rounded px-1.5 py-0.5">
                        {t('pinned')}
                      </span>
                    )}
                    <span className="min-w-0 font-medium text-fg break-words">
                      {a.title}
                    </span>
                  </div>
                  {a.published_at && (
                    <div className="mt-1 text-xs text-faint tabular-nums">
                      {formatDate(a.published_at, locale)}
                    </div>
                  )}
                </div>
                <svg
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  className="shrink-0 text-faint transition-transform duration-150 group-hover:translate-x-0.5 motion-reduce:transform-none"
                  aria-hidden="true"
                >
                  <path d="m9 6 6 6-6 6" />
                </svg>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
