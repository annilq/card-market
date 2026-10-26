import { createFileRoute, Link } from '@tanstack/react-router'
import { getAnnouncement } from '~/lib/directus'

export const Route = createFileRoute('/announcements/$id')({
  loader: async ({ params }): Promise<{
    item: Awaited<ReturnType<typeof getAnnouncement>>
  }> => ({ item: await getAnnouncement(params.id) }),
  component: AnnouncementDetail,
})

function AnnouncementDetail() {
  const { item } = Route.useLoaderData()
  if (!item) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">未找到该公告。</p>
        <Link to="/announcements" className="text-slate-900 underline">
          返回公告列表
        </Link>
      </div>
    )
  }
  return (
    <article className="max-w-2xl mx-auto">
      <Link to="/announcements" className="text-sm text-slate-500 hover:underline">
        ← 公告列表
      </Link>
      <h1 className="text-2xl font-bold mt-3">{item.title}</h1>
      <div className="text-xs text-slate-400 mt-1">
        {item.published_at
          ? new Date(item.published_at).toLocaleDateString('zh-CN')
          : '—'}
      </div>
      {item.body && (
        // 富文本由管理员在后台维护（受信任来源）；XSS 防护见 development.md §4.4 次要项
        <div
          className="prose mt-4 text-slate-700 [&_a]:text-sky-600 [&_img]:rounded-lg"
          dangerouslySetInnerHTML={{ __html: item.body }}
        />
      )}
    </article>
  )
}
