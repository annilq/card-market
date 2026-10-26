import { createFileRoute, notFound, Outlet } from '@tanstack/react-router'
import { resolveLocaleParam } from '~/lib/i18n/locales'

// 所有页面都挂在这个布局下，语言段是路径里的可选第一段：
// `/cards`（默认语言，无段）与 `/ja/cards`（日语）都能匹配。
// 未知语言段（如 `/foo/cards`）在这里统一拒绝，避免它被当成语言渲染出页面。
export const Route = createFileRoute('/{-$locale}')({
  beforeLoad: ({ params }) => {
    const locale = resolveLocaleParam(params.locale)
    if (locale === null) throw notFound()
    return { locale }
  },
  component: LocaleLayout,
})

function LocaleLayout() {
  return <Outlet />
}
