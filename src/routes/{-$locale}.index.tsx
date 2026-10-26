import { useEffect, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import {
  assetUrl,
  getAnnouncements,
  getBanners,
  getCards,
  getIps,
} from '~/lib/directus'
import { CardCard } from '~/components/CardCard'
import { localizeHref } from '~/lib/i18n/locales'
import { formatDate, useLocale, useT } from '~/lib/i18n/react'
import type { Announcement, Banner, Ip } from '~/lib/types'

export const Route = createFileRoute('/{-$locale}/')({
  loader: async (): Promise<{
    banners: Banner[]
    announcements: Announcement[]
    ips: Ip[]
    featured: Awaited<ReturnType<typeof getCards>>
  }> => {
    const [banners, announcements, ips, featured] = await Promise.all([
      getBanners(),
      getAnnouncements(),
      getIps(),
      getCards({ sort: 'newest', limit: 8 }),
    ])
    return { banners, announcements, ips, featured }
  },
  component: Home,
})

function Home() {
  const { banners, announcements, ips, featured } = Route.useLoaderData()
  const navigate = useNavigate()
  const t = useT()
  const locale = useLocale()
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const timer = setInterval(
      () => setIdx((i) => (i + 1) % banners.length),
      5000,
    )
    return () => clearInterval(timer)
  }, [banners.length])

  return (
    <div className="space-y-10">
      {/* 搜索框 */}
      <section className="bg-surface rounded-2xl border border-border p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            navigate({ to: '/{-$locale}/cards', search: { q: q || undefined } })
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t('searchPlaceholder')}
            className="flex-1 rounded-lg border border-border-strong px-4 py-2.5 outline-none focus:border-muted bg-surface text-fg placeholder:text-faint"
          />
          <button
            type="submit"
            className="rounded-lg bg-accent text-on-accent px-5 py-2.5 hover:bg-accent/90"
          >
            {t('search')}
          </button>
        </form>
      </section>

      {/* Banner 轮播 */}
      {banners.length > 0 && (
        <section className="relative rounded-2xl overflow-hidden border border-border bg-slate-900 aspect-[21/9]">
          {banners.map((b, i) => {
            const src = assetUrl(b.image, { width: 1280, format: 'webp' })
            const inner = (
              <>
                {src && (
                  <img
                    src={src}
                    alt={b.title || 'banner'}
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                )}
                {(b.title || b.description) && (
                  <div className="absolute inset-0 flex flex-col justify-end p-6 text-white bg-gradient-to-t from-black/60 to-transparent">
                    {b.title && <div className="text-xl font-bold">{b.title}</div>}
                    {b.description && (
                      <div className="text-sm opacity-90">{b.description}</div>
                    )}
                  </div>
                )}
              </>
            )
            const el = (
              <div
                className={`absolute inset-0 transition-opacity duration-500 ${
                  i === idx ? 'opacity-100' : 'opacity-0'
                }`}
              >
                {inner}
              </div>
            )
            return b.link ? (
              b.link.startsWith('/') ? (
                // b.link 来自后台内容，绕过路由类型，需补语言段，否则会掉回默认语言。
                <Link key={b.id} to={localizeHref(b.link, locale) as '/{-$locale}/cards'}>
                  {el}
                </Link>
              ) : (
                <a
                  key={b.id}
                  href={b.link}
                  target="_blank"
                  rel="noreferrer"
                >
                  {el}
                </a>
              )
            ) : (
              <div key={b.id}>{el}</div>
            )
          })}
          {banners.length > 1 && (
            <div className="absolute bottom-3 right-4 flex gap-1.5">
              {banners.map((b, i) => (
                <button
                  key={b.id}
                  onClick={() => setIdx(i)}
                  aria-label={t('bannerAria', { n: i + 1 })}
                  className={`w-2 h-2 rounded-full ${
                    i === idx ? 'bg-white' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>
          )}
        </section>
      )}

      {/* 分类入口 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{t('browseByIp')}</h2>
        <div className="flex flex-wrap gap-2">
          {ips.map((ip) => (
            <Link
              key={ip.id}
              to="/{-$locale}/cards"
              search={{ ip: ip.id }}
              className="rounded-full border border-border-strong bg-surface px-4 py-1.5 text-sm hover:border-muted text-muted hover:text-fg"
            >
              {ip.name}
            </Link>
          ))}
          {ips.length === 0 && (
            <span className="text-sm text-faint">{t('noCategories')}</span>
          )}
        </div>
      </section>

      {/* 公告 */}
      {announcements.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">{t('latestAnnouncements')}</h2>
            <Link to="/{-$locale}/announcements" className="text-sm text-muted hover:underline">
              {t('viewAll')}
            </Link>
          </div>
          <ul className="space-y-2">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Link
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
                    <span className="font-medium text-fg">{a.title}</span>
                  </div>
                  <div className="text-xs text-faint mt-1">
                    {formatDate(a.published_at, locale)}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 精选卡牌 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">{t('latestCards')}</h2>
        {featured.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.items.map((c) => (
              <CardCard key={c.id} card={c} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-faint">{t('noCards')}</div>
        )}
      </section>
    </div>
  )
}
