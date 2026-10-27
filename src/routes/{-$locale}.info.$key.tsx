import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getInfoPage } from '~/lib/directus'
import { INFO_PAGE_LABEL_KEY, resolveInfoPageKey } from '~/lib/info-pages'
import { useT } from '~/lib/i18n/react'

// 审核用信息页：/info/operation | /info/personal-info | /info/terms | /info/data-usage
// 语言段照旧由上级 `{-$locale}` 继承（`/ja/info/terms`）。
// 内容由 Directus 的 info_pages 驱动，页面结构（标题层级、间距）由前端固定。
export const Route = createFileRoute('/{-$locale}/info/$key')({
  beforeLoad: ({ params }) => {
    // 未登记的标识直接 404，避免把任意路径段当成信息页渲染
    if (!resolveInfoPageKey(params.key)) throw notFound()
  },
  loader: async ({ params }) => ({ page: await getInfoPage(params.key) }),
  component: InfoPage,
})

function InfoPage() {
  const { page } = Route.useLoaderData()
  const { key } = Route.useParams()
  const t = useT()
  const infoKey = resolveInfoPageKey(key) ?? 'operation'
  // 后台未发布时仍给出可读标题（来自界面文案），并提示内容尚未发布，
  // 而不是把整个页面变成 404——页脚入口必须始终能落到一个有效页面（审计要求）。
  const title = page?.title || t(INFO_PAGE_LABEL_KEY[infoKey])
  return (
    <article className="max-w-2xl mx-auto">
      <div className="text-xs text-faint mb-1">{t('infoNavTitle')}</div>
      <h1 className="text-2xl font-bold break-words">{title}</h1>
      {page?.body ? (
        // 富文本由管理员在后台维护（受信任来源），与公告详情一致
        <div
          className="prose mt-4 text-body [&_a]:text-sky-600 dark:[&_a]:text-sky-400 [&_h2]:text-fg [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-5 [&_h2]:mb-1 [&_h3]:text-fg [&_img]:rounded-lg"
          dangerouslySetInnerHTML={{ __html: page.body }}
        />
      ) : (
        <p className="mt-4 text-sm text-muted">{t('infoPageNotFound')}</p>
      )}
      <div className="mt-8">
        <Link to="/{-$locale}" className="text-sm text-muted hover:underline">
          {t('backHomeArrow')}
        </Link>
      </div>
    </article>
  )
}
