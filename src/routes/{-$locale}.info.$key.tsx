import { createFileRoute, Link, notFound } from '@tanstack/react-router'
import { getInfoPage } from '~/lib/directus'
import { INFO_PAGE_LABEL_KEY, resolveInfoPageKey } from '~/lib/info-pages'
import { useT } from '~/lib/i18n/react'
import { translate } from '~/lib/i18n/messages'
import { buildHead, localeFromMatches, ogImage, plainText, siteFromMatches, siteNameOf } from '~/lib/seo'
import { renderRichText } from '~/lib/richtext'

// 审核用信息页：/info/operation | /info/personal-info | /info/terms | /info/data-usage
// 语言段照旧由上级 `{-$locale}` 继承（`/ja/info/terms`）。
// 内容由 Directus 的 info_pages 驱动，页面结构（标题层级、间距）由前端固定。
export const Route = createFileRoute('/{-$locale}/info/$key')({
  beforeLoad: ({ params }) => {
    // 未登记的标识直接 404，避免把任意路径段当成信息页渲染
    if (!resolveInfoPageKey(params.key)) throw notFound()
  },
  loader: async ({ params }) => ({ page: await getInfoPage(params.key) }),
  head: async ({ matches, params }) => {
    const locale = localeFromMatches(matches)
    const key = resolveInfoPageKey(params.key)
    const page = (matches[matches.length - 1]?.loaderData as
      | { page?: { title?: string | null; body?: string | null } | null }
      | undefined)?.page
    // 未登记的标识走 beforeLoad 的 notFound，这里 key 一定是合法的；
    // 但页面可能尚未发布，此时标题仍用界面文案，描述留空由 buildHead 兜底。
    const title = page?.title || (key ? translate(locale, INFO_PAGE_LABEL_KEY[key]) : '')
    return buildHead({
      locale,
      pathname: `/info/${params.key}`,
      siteName: siteNameOf(siteFromMatches(matches), locale),
      title: title || undefined,
      description: plainText(renderRichText(page?.body)) || undefined,
      image: ogImage(matches),
    })
  },
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
    // 与公告详情一致：正文铺满整条内容列（参考图实测 1200px），不设窄栏。
    <article>
      <div className="text-xs text-faint">{t('infoNavTitle')}</div>
      {/* 28px：参考图里信息页标题实测约 30px，与公告标题同一档。 */}
      <h1 className="mt-1 break-words text-[28px] font-bold leading-snug">{title}</h1>
      {page?.body ? (
        // 富文本由管理员在后台维护（受信任来源），经 renderRichText 统一转 HTML 并做 DOMPurify 清洗，与公告详情一致。
        // h2 从 16px 提到 18px：审核类长文靠小标题分段，16px 与正文同尺寸时分不出层级。
        <div
          className="prose mt-6 text-body [&_a]:text-link [&_a]:underline [&_a]:underline-offset-2 [&_h1]:text-fg [&_h1]:text-xl [&_h1]:font-semibold [&_h1]:mt-7 [&_h1]:mb-2 [&_h2]:text-fg [&_h2]:text-lg [&_h2]:font-semibold [&_h2]:mt-7 [&_h2]:mb-2 [&_h3]:text-fg [&_h3]:font-semibold [&_h3]:mt-5 [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_strong]:font-semibold [&_em]:italic [&_blockquote]:border-l-2 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_code]:rounded [&_code]:bg-muted/10 [&_code]:px-1 [&_hr]:border-border [&_p]:leading-relaxed"
          dangerouslySetInnerHTML={{ __html: renderRichText(page.body) }}
        />
      ) : (
        <p className="mt-4 text-sm text-muted">{t('infoPageNotFound')}</p>
      )}
      <div className="mt-10 border-t border-border pt-5">
        <Link
          to="/{-$locale}"
          className="inline-flex items-center py-1 text-sm text-muted transition-colors duration-150 hover:text-fg hover:underline"
        >
          {t('backHomeArrow')}
        </Link>
      </div>
    </article>
  )
}
