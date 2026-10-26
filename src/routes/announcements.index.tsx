import { createFileRoute, Link } from '@tanstack/react-router'
import { getAnnouncements } from '~/lib/directus'

export const Route = createFileRoute('/announcements/')({
  loader: async () => ({ items: await getAnnouncements() }),
  component: Announcements,
})

function Announcements() {
  const { items } = Route.useLoaderData()
  return (
    <div className="space-y-3">
      <h1 className="text-xl font-bold mb-2">公告</h1>
      {items.length === 0 && (
        <div className="text-sm text-slate-400">暂无公告</div>
      )}
      {items.map((a) => (
        <Link
          key={a.id}
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
      ))}
    </div>
  )
}
