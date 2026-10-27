import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Link,
  Scripts,
  useRouter,
  useRouterState,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { getSiteSettings } from '~/lib/directus'
import type { SiteSettings } from '~/lib/types'
import { INFO_PAGE_KEYS, INFO_PAGE_LABEL_KEY } from '~/lib/info-pages'
import { DEFAULT_LOCALE, LOCALES, isDefaultLocale, resolveLocaleParam } from '~/lib/i18n/locales'
import type { Locale } from '~/lib/i18n/locales'
import { useLocale, useT } from '~/lib/i18n/react'
import { GlobalSearch } from '~/components/GlobalSearch'
import '../styles.css'

// 在首屏绘制前同步主题，避免浅色闪一下。优先级：localStorage > 系统偏好。
const NO_FLASH_SCRIPT = `(function(){try{var t=localStorage.getItem('theme');var d=t?t==='dark':window.matchMedia('(prefers-color-scheme: dark)').matches;document.documentElement.classList.toggle('dark',d);}catch(e){}})();`

// 从匹配到的路由参数里取语言段。head() 拿不到 location，但能拿到整条 matches，
// 语言段就在其中（默认语言无段，取不到即回退默认）。
function localeFromMatches(
  matches: ReadonlyArray<{ params?: Record<string, unknown>; pathname: string }>,
): Locale {
  for (const match of matches) {
    const raw = match.params?.locale
    if (typeof raw === 'string') {
      const resolved = resolveLocaleParam(raw)
      if (resolved) return resolved
    }
  }
  return DEFAULT_LOCALE
}

// 当前页在「另一种语言」下的等价位址：去掉已有语言段，按目标语言重新加前缀。
function pathForLocale(pathname: string, locale: Locale): string {
  const segments = pathname.split('/').filter(Boolean)
  const first = segments[0]
  const rest = first && resolveLocaleParam(first) && first !== DEFAULT_LOCALE
    ? segments.slice(1)
    : segments
  const prefix = LOCALES[locale].prefix
  const joined = rest.join('/')
  if (!prefix) return joined ? `/${joined}` : '/'
  return joined ? `/${prefix}/${joined}` : `/${prefix}`
}

export const Route = createRootRoute({
  head: ({ matches }) => {
    const locale = localeFromMatches(matches)
    const meta = LOCALES[locale]
    // 取最深的那个匹配的 pathname 作为当前页，用于生成各语言等价位址。
    const pathname = matches[matches.length - 1]?.pathname ?? '/'
    return {
      meta: [
        { charSet: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
        { title: meta.title },
        { name: 'description', content: meta.description },
        { property: 'og:locale', content: meta.intl },
      ],
      links: [
        // 各语言版本互相声明，便于搜索引擎按语言收录；默认语言为 x-default。
        ...Object.entries(LOCALES).map(([key, value]) => ({
          rel: 'alternate',
          hrefLang: value.htmlLang,
          href: pathForLocale(pathname, key as Locale),
        })),
        { rel: 'alternate', hrefLang: 'x-default', href: pathForLocale(pathname, DEFAULT_LOCALE) },
      ],
      // 首屏前同步主题，避免闪烁。通过 head().scripts 注入，
      // 由 <HeadContent /> 渲染，React 19 不会报 “script in component” 的 hydration 错误。
      scripts: [{ children: NO_FLASH_SCRIPT }],
    }
  },
  loader: async (): Promise<{ site: SiteSettings | null }> => {
    const site = await getSiteSettings()
    return { site }
  },
  component: RootComponent,
  // 文档外壳（<html>/<head>/<body>）只在这一层渲染一次。
  // 404 与 500 也走这里，因此它们只需给出「main 里的内容」，
  // 不能再自己套一层文档——否则 SSR 会输出两份 <html>，
  // 水合失败后 main 被清空，页面只剩 header/footer。
  shellComponent: RootDocument,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
})

function RootComponent() {
  return <Outlet />
}

// 未匹配路由（含爬虫乱扫的路径、以及不支持的语言段）：给出站内 404，而不是默认的裸 "Not Found"
function NotFoundPage() {
  const t = useT()
  // 404 也可能是「未知语言段」造成的（如 /nope、/de/cards）。此时 params.locale
  // 是那个非法值，直接用它生成链接会得到 /nope/cards 这类二次 404。
  // 这里把非法/缺失的语言段归一成 undefined（默认语言），链接才会回到站内真实页面。
  const locale = useLocale()
  const localeParam = isDefaultLocale(locale) ? undefined : locale
  return (
    <div className="text-center py-24">
      <div className="text-6xl font-black text-slate-200 dark:text-slate-800 tracking-tight">
        404
      </div>
      <p className="mt-4 text-muted">{t('notFoundBody')}</p>
      <div className="mt-6 flex items-center justify-center gap-4 text-sm">
        <Link
          to="/{-$locale}"
          params={{ locale: localeParam }}
          className="inline-flex items-center rounded-full bg-accent text-on-accent px-4 py-1.5 hover:bg-accent/90"
        >
          {t('backHome')}
        </Link>
        <Link
          to="/{-$locale}/cards"
          params={{ locale: localeParam }}
          className="text-muted underline"
        >
          {t('browseCards')}
        </Link>
      </div>
    </div>
  )
}

// 渲染/加载异常兜底，避免整页白屏
function ErrorPage({ error, reset }: ErrorComponentProps) {
  const t = useT()
  const message = error instanceof Error ? error.message : String(error)
  const locale = useLocale()
  const localeParam = isDefaultLocale(locale) ? undefined : locale
  return (
    <div className="text-center py-24">
      <div className="text-6xl font-black text-slate-200 dark:text-slate-800 tracking-tight">
        500
      </div>
      <p className="mt-4 text-muted">{t('errorBody')}</p>
      <p className="mt-2 text-xs text-faint break-all max-w-xl mx-auto">
        {message}
      </p>
      <div className="mt-6 flex items-center justify-center gap-4 text-sm">
        <button
          onClick={reset}
          className="inline-flex items-center rounded-full bg-accent text-on-accent px-4 py-1.5 hover:bg-accent/90"
        >
          {t('reload')}
        </button>
        <Link
          to="/{-$locale}"
          params={{ locale: localeParam }}
          className="text-muted underline"
        >
          {t('backHome')}
        </Link>
      </div>
    </div>
  )
}

function ThemeToggle({ className = '' }: { className?: string }) {
  const t = useT()
  // 仅用于 aria-label。服务端与首帧都取 false，挂载后再从 DOM 读真实值，
  // 因此不会出现「渲染期读 document」导致的水合不一致。
  const [dark, setDark] = useState(false)

  useEffect(() => {
    setDark(document.documentElement.classList.contains('dark'))
  }, [])

  const toggle = () => {
    const next = !document.documentElement.classList.contains('dark')
    document.documentElement.classList.toggle('dark', next)
    try {
      localStorage.setItem('theme', next ? 'dark' : 'light')
    } catch {
      /* ignore */
    }
    setDark(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? t('themeToLight') : t('themeToDark')}
      aria-pressed={dark}
      className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 hover:text-fg transition ${className}`}
    >
      {/* 月亮：深色时显示。两个图标同时渲染，由 CSS 决定可见性，
          因此没有「首帧图标不对、水合后跳变」的问题。 */}
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="hidden dark:block"
        aria-hidden="true"
      >
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
      </svg>
      {/* 太阳：浅色时显示 */}
      <svg
        width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        className="block dark:hidden"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="4" />
        <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
      </svg>
    </button>
  )
}

// 语言切换：留在当前页面，只换语言段。用相对路由 + params reducer，
// 这样当前路径的其余参数与查询串原样保留（含筛选态）。
function LocaleSwitcher() {
  const locale = useLocale()
  const t = useT()
  const router = useRouter()
  return (
    <label className="inline-flex items-center">
      <span className="sr-only">{t('switchLanguage')}</span>
      <select
        value={locale}
        onChange={(e) => {
          const next = e.target.value as Locale
          router.navigate({
            to: '.',
            params: (prev: Record<string, unknown>) => ({
              ...prev,
              // 默认语言不带路径段：传 undefined 让可选段整体消失，
              // 传 'zh' 会生成 `/zh/...`，而那是未知语言段（404）。
              locale: isDefaultLocale(next) ? undefined : next,
            }),
            search: true,
            replace: true,
          })
        }}
        className="h-9 rounded-lg border border-border bg-surface px-2 text-sm text-muted hover:bg-surface-2 hover:text-fg transition outline-none focus:border-muted"
      >
        {Object.entries(LOCALES).map(([key, value]) => (
          <option key={key} value={key}>
            {value.label}
          </option>
        ))}
      </select>
    </label>
  )
}

// 文档外壳：由 shellComponent 调用，`children` 是当前匹配到的页面内容。
// 它包住的不只是正常页面，也包括 404 / 500，所以这里是唯一渲染 <html> 的地方。
function RootDocument({ children }: Readonly<{ children: ReactNode }>) {
  // 注意：shellComponent 里不能直接 useLoaderData()——404/500 时根路由的 loader
  // 数据未必就绪。从 router state 的第一个 match（即根路由）取，取不到就退化成
  // null（站名与页脚文案都有兜底）。
  const site = useRouterState({
    select: (s) =>
      (s.matches[0]?.loaderData as { site?: SiteSettings | null } | undefined)?.site ?? null,
  })
  const locale = useLocale()
  const t = useT()
  // 显式传 locale 参数：`to="/{-$locale}/..."` 默认会从「当前匹配的 params」继承语言段，
  // 而 404 页（如 /nope、/de/cards）里那个段是非法值，继承下来就会生成 /nope/cards
  // 这类二次 404 链接。这里统一用已解析出的合法 locale（默认语言为 undefined，不带段）。
  const localeParams = { locale: isDefaultLocale(locale) ? undefined : locale }
  const siteName = site?.site_name || t('defaultSiteName')
  const nav = [
    { to: '/{-$locale}/cards' as const, label: t('navCards') },
    { to: '/{-$locale}/announcements' as const, label: t('navAnnouncements') },
    { to: '/{-$locale}/shops' as const, label: t('navShops') },
  ]
  const [menuOpen, setMenuOpen] = useState(false)
  return (
    <html lang={LOCALES[locale].htmlLang} suppressHydrationWarning>
      <head>
        {/* 避免浏览器自动请求 /favicon.ico 产生 404 控制台错误 */}
        <link rel="icon" href="data:," />
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-30 bg-surface/90 backdrop-blur border-b border-border">
          <div className="mx-auto max-w-6xl px-4">
            <div className="h-14 flex items-center gap-3 sm:gap-6">
              <Link to="/{-$locale}" params={localeParams} className="font-bold text-lg text-fg truncate">
                {siteName}
              </Link>

              {/* 桌面端导航 */}
              <nav className="hidden sm:flex items-center gap-5 text-sm text-muted">
                {nav.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    params={localeParams}
                    activeProps={{ className: 'text-fg font-semibold' }}
                    className="hover:text-fg transition"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>

              {/* 宽屏把搜索放在同一行（参考站的头图布局），窄屏落到第二行 */}
              <div className="ml-auto hidden lg:flex flex-1 min-w-0 max-w-xl">
                <GlobalSearch />
              </div>

              <div className="ml-auto flex items-center gap-2">
                <LocaleSwitcher />
                <ThemeToggle />
                <Link
                  to="/{-$locale}/message"
                  params={localeParams}
                  className="hidden sm:inline-flex items-center rounded-full bg-accent text-on-accent text-sm px-4 py-1.5 hover:bg-accent/90 transition"
                >
                  {t('navContact')}
                </Link>

                {/* 移动端汉堡按钮 */}
                <button
                  type="button"
                  aria-label={t('openMenu')}
                  aria-expanded={menuOpen}
                  onClick={() => setMenuOpen((v) => !v)}
                  className="sm:hidden inline-flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    {menuOpen ? (
                      <path d="M6 6l12 12M18 6L6 18" />
                    ) : (
                      <path d="M4 7h16M4 12h16M4 17h16" />
                    )}
                  </svg>
                </button>
              </div>
            </div>

            {/* 窄屏把搜索放到第二行：手机上没有下拉菜单也要够得着 */}
            <div className="py-2 lg:hidden">
              <GlobalSearch />
            </div>
          </div>

          {/* 移动端下拉菜单 */}
          {menuOpen && (
            <div className="sm:hidden border-t border-border bg-surface">
              <nav className="mx-auto max-w-6xl px-4 py-2 flex flex-col">
                {nav.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    params={localeParams}
                    onClick={() => setMenuOpen(false)}
                    activeProps={{ className: 'text-fg font-semibold' }}
                      className="py-2.5 text-sm text-muted hover:text-fg border-b border-border last:border-0"
                  >
                    {n.label}
                  </Link>
                ))}
                <Link
                  to="/{-$locale}/message"
                  params={localeParams}
                  onClick={() => setMenuOpen(false)}
                  className="mt-2 mb-1 inline-flex items-center justify-center rounded-full bg-accent text-on-accent text-sm px-4 py-2 hover:bg-accent/90"
                >
                  {t('navContact')}
                </Link>
              </nav>
            </div>
          )}
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-border bg-surface mt-10">
          <div className="mx-auto max-w-6xl px-4 py-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm text-muted">
            <div>
              <div className="font-semibold text-fg mb-1">{siteName}</div>
              {site?.intro && <p className="text-subtle">{site.intro}</p>}
            </div>
            <div className="space-y-1">
              {site?.contact_email && (
                <div>{t('emailLabel', { email: site.contact_email })}</div>
              )}
              {site?.x_account && <div>X：{site.x_account}</div>}
              <div className="text-faint">{t('shopsHint')}</div>
            </div>
            <div className="space-y-1">
              {site?.data_notice && <div>{site.data_notice}</div>}
              {site?.privacy_policy && (
                <div
                  className="text-subtle"
                  dangerouslySetInnerHTML={{ __html: site.privacy_policy }}
                />
              )}
            </div>
          </div>

          {/* 审核用信息页入口：运营信息 / 个人信息收集 / 利用规则 / 数据使用。
              顺序由前端固定（lib/info-pages.ts），不依赖后台是否已录数据。
              入口文字走界面语言翻译（与头部导航一致）：不翻译 Directus 内容这条边界
              只针对正文与标题，页脚的链接文字属于界面 chrome。 */}
          <nav
            aria-label={t('infoNavTitle')}
            className="mx-auto max-w-6xl px-4 py-3 border-t border-border flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted"
          >
            {INFO_PAGE_KEYS.map((key) => (
              <Link
                key={key}
                to="/{-$locale}/info/$key"
                params={{ key, ...localeParams }}
                className="hover:text-fg hover:underline transition"
              >
                {t(INFO_PAGE_LABEL_KEY[key])}
              </Link>
            ))}
          </nav>

          <div className="text-center text-xs text-faint py-4">
            {t('copyright', {
              year: new Date().getFullYear(),
              site: siteName,
            })}
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
