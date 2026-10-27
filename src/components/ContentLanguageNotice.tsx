import { useRouterState } from '@tanstack/react-router'
import { DEFAULT_LOCALE, LOCALES, isDefaultLocale } from '~/lib/i18n/locales'
import { useLocale, useT } from '~/lib/i18n/react'

/**
 * 内容语言说明。
 *
 * 界面是多语言的（导航、按钮、标签都跟着 URL 语言段走），但**后台内容是单一语言的**：
 * 卡牌名、公告正文、门店地址、信息页正文都来自 Directus 的同一条记录，
 * 不随语言段变化。上线初期这些内容由客户用中文录入。
 *
 * 所以日语/英语页面上「界面是日语、内容却是中文」不是 bug，是一条需要说明的边界。
 * 这个组件只出现在**真的会渲染后台内容**的页面上；留言表单与 404 全是界面文案，
 * 在那里挂一条「内容是中文的」只会误导。
 *
 * 如果将来客户把后台内容补成三语（PRODUCT.md 里记为待定），删掉这个组件即可。
 */
export function ContentLanguageNotice() {
  const locale = useLocale()
  const t = useT()
  const pathname = useRouterState({ select: (s) => s.location.pathname })

  if (isDefaultLocale(locale)) return null

  // 去掉语言段后的站内路径：`/ja/cards/1` → `/cards/1`
  const rest = pathname.split('/').filter(Boolean)
  const bare = rest.length && LOCALES[locale].prefix === rest[0]
    ? `/${rest.slice(1).join('/')}`
    : pathname

  // 只在这些路由上出现：它们渲染 Directus 的既有内容。
  const showsCmsContent =
    bare === '/' ||
    bare.startsWith('/cards') ||
    bare.startsWith('/announcements') ||
    bare.startsWith('/shops') ||
    bare.startsWith('/info/')
  if (!showsCmsContent) return null

  // 切到默认语言的同一路径。查询串不跟过去——这条链接的用途是「看原文」。
  const target = bare === '/' ? '/' : bare

  return (
    <p className="mb-6 rounded-lg border border-border bg-surface px-3 py-2 text-xs text-muted">
      {t('contentLanguageNotice')}{' '}
      <a
        href={target}
        hrefLang={LOCALES[DEFAULT_LOCALE].htmlLang}
        className="underline hover:text-fg"
      >
        {t('contentLanguageSwitch')}
      </a>
    </p>
  )
}
