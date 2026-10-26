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
import type { Announcement, Banner, Ip } from '~/lib/types'

export const Route = createFileRoute('/')({
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
  const [q, setQ] = useState('')
  const [idx, setIdx] = useState(0)

  useEffect(() => {
    if (banners.length <= 1) return
    const t = setInterval(
      () => setIdx((i) => (i + 1) % banners.length),
      5000,
    )
    return () => clearInterval(t)
  }, [banners.length])

  return (
    <div className="space-y-10">
      {/* 搜索框 */}
      <section className="bg-white rounded-2xl border border-slate-200 p-5">
        <form
          onSubmit={(e) => {
            e.preventDefault()
            navigate({ to: '/cards', search: { q: q || undefined } })
          }}
          className="flex gap-2"
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="搜索卡名或编号，如 皮卡丘 / 197"
            className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 outline-none focus:border-slate-500"
          />
          <button
            type="submit"
            className="rounded-lg bg-slate-900 text-white px-5 py-2.5 hover:bg-slate-700"
          >
            搜索
          </button>
        </form>
      </section>

      {/* Banner 轮播 */}
      {banners.length > 0 && (
        <section className="relative rounded-2xl overflow-hidden border border-slate-200 bg-slate-900 aspect-[21/9]">
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
                <Link key={b.id} to={b.link as '/cards'}>
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
                  aria-label={`banner ${i + 1}`}
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
        <h2 className="text-lg font-semibold mb-3">按 IP 浏览</h2>
        <div className="flex flex-wrap gap-2">
          {ips.map((ip) => (
            <Link
              key={ip.id}
              to="/cards"
              search={{ ip: ip.id }}
              className="rounded-full border border-slate-300 bg-white px-4 py-1.5 text-sm hover:border-slate-500"
            >
              {ip.name}
            </Link>
          ))}
          {ips.length === 0 && (
            <span className="text-sm text-slate-400">暂无分类</span>
          )}
        </div>
      </section>

      {/* 公告 */}
      {announcements.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-lg font-semibold">最新公告</h2>
            <Link to="/announcements" className="text-sm text-slate-500 hover:underline">
              全部 →
            </Link>
          </div>
          <ul className="space-y-2">
            {announcements.slice(0, 3).map((a) => (
              <li key={a.id}>
                <Link
                  to="/announcements/$id"
                  params={{ id: String(a.id) }}
                  className="block rounded-lg border border-slate-200 bg-white px-4 py-3 hover:shadow-sm"
                >
                  <div className="flex items-center gap-2">
                    {a.is_pinned && (
                      <span className="text-[10px] bg-rose-100 text-rose-700 rounded px-1.5 py-0.5">
                        置顶
                      </span>
                    )}
                    <span className="font-medium text-slate-900">{a.title}</span>
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {a.published_at
                      ? new Date(a.published_at).toLocaleDateString('zh-CN')
                      : '—'}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* 精选卡牌 */}
      <section>
        <h2 className="text-lg font-semibold mb-3">最新上架</h2>
        {featured.items.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {featured.items.map((c) => (
              <CardCard key={c.id} card={c} />
            ))}
          </div>
        ) : (
          <div className="text-sm text-slate-400">暂无卡牌</div>
        )}
      </section>
    </div>
  )
}
