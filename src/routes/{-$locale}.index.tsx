import { useEffect, useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  assetUrl,
  getAnnouncements,
  getBanners,
  getCards,
  getIps,
} from '~/lib/directus'
import { CardCard } from '~/components/CardCard'
import { HighValueStrip } from '~/components/HighValueStrip'
import { HomeNotices } from '~/components/HomeNotices'
import { localizeHref } from '~/lib/i18n/locales'
import { useLocale, useT } from '~/lib/i18n/react'
import type { Announcement, Banner, Ip } from '~/lib/types'

export const Route = createFileRoute('/{-$locale}/')({
  loader: async (): Promise<{
    banners: Banner[]
    announcements: Announcement[]
    ips: Ip[]
    highValue: Awaited<ReturnType<typeof getCards>>
    featured: Awaited<ReturnType<typeof getCards>>
  }> => {
    const [banners, announcements, ips, highValue, featured] = await Promise.all(
      [
        getBanners(),
        getAnnouncements(),
        getIps(),
        getCards({ highValueOnly: true, sort: 'price_desc', limit: 8 }),
        getCards({ sort: 'newest', limit: 8 }),
      ],
    )
    return { banners, announcements, ips, highValue, featured }
  },
  component: Home,
})

function Home() {
  const { banners, announcements, ips, highValue, featured } =
    Route.useLoaderData()
  const t = useT()
  const locale = useLocale()
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

      {/* 通知公告 */}
      {announcements.length > 0 && <HomeNotices items={announcements} />}

      {/* 高价买取 */}
      {highValue.items.length > 0 && (
        <HighValueStrip items={highValue.items} />
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
