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
import { assetUrl, getSiteSettings } from '~/lib/directus'
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

// X（原 Twitter）图标。用官方简化字形：
// 与旁边的 SHOP 图标同为 18px 描边风格会显得太轻，因此这里用实心路径，
// 让两个交易入口在视觉重量上一致。
function XIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231 5.45-6.231Zm-1.161 17.52h1.833L7.084 4.126H5.117l11.966 15.644Z" />
    </svg>
  )
}

// 店铺图标：遮阳棚 + 店门。18px 下不带文字时容易被看成打印机，
// 因此右侧搭配 SHOP 字样（参考站也是一图标一字，红色块上写着 SHOP）。
function ShopIcon() {
  return (
    <svg
      width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor"
      strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"
    >
      {/* 遮阳棚：一道横梁 + 四个下垂的棚布 */}
      <path d="M3.5 9.5V5.5h17v4" />
      <path d="M3.5 9.5a2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2 0 2.6 2.6 0 0 0 5.2 0" />
      {/* 店面主体与门 */}
      <path d="M5.5 12.5V20h13v-7.5" />
      <path d="M9.8 20v-4.2h4.4V20" />
    </svg>
  )
}

// X 图标与店铺图标共用同一套外壳尺寸，保证顶栏右侧那两个按钮在所有宽度一致。
const iconBtn =
  'inline-flex h-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 hover:text-fg transition'

const iconBtnSquare = `${iconBtn} w-9`

// 页脚 logo：site_settings.logo 是 Directus 文件 id，走后台上传。
// 未上传时占住同样的尺寸（h-16 w-40）而不是整块消失，否则后台一传 logo，
// 版权区高度会跳一下。占位不画虚线框、不写「LOGO」字样：那两种画法
// 对访客都像「图片挂了」，而这里只是运营还没传图。
// 图片按高度优先缩放：竖版素材会自己缩窄，不会把版权区撑高。
function FooterLogo({
  logo,
  name,
}: {
  logo: string | number | null
  name: string
}) {
  const src = assetUrl(logo, { height: 64, format: 'webp' })
  if (!src) return <div aria-hidden="true" className="h-16 w-40" />
  return (
    <div className="flex h-16 w-40 items-center justify-center">
      <img
        src={src}
        alt={name}
        className="max-h-16 w-auto max-w-40 object-contain"
        loading="lazy"
      />
    </div>
  )
}

// 后台没配 x_account 时整颗按钮不渲染：宁可少一个图标，也不给死链。
function SocialIcon({ href, label }: { href: string | null; label: string }) {
  if (!href) return null
  return (
    <a href={href} target="_blank" rel="me noreferrer" aria-label={label} className={iconBtnSquare}>
      <XIcon />
    </a>
  )
}

function ShopLink({
  localeParams,
  label,
  withText = false,
}: {
  localeParams: { locale: string | undefined }
  label: string
  /** 宽屏带 SHOP 字样：单靠图标在 16px 下辨识度不够。 */
  withText?: boolean
}) {
  return (
    <Link
      to="/{-$locale}/shops"
      params={localeParams}
      aria-label={label}
      activeProps={{ className: 'bg-surface-2 text-fg' }}
      className={
        // 文字只在 ≥1024 出现；再窄就退化成和 X 一样的方形图标。
        withText ? `${iconBtnSquare} lg:w-auto lg:gap-1.5 lg:px-2.5` : iconBtnSquare
      }
    >
      <ShopIcon />
      {withText && (
        <span className="hidden text-xs font-semibold tracking-wide lg:inline">SHOP</span>
      )}
    </Link>
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
  // 店铺不再占一个文字导航项，改由搜索右侧的 SHOP 图标进入；留言咨询移到页脚。
  // 两者都还在全站可达，只是把主视线让给「浏览卡牌 / 看公告」。
  const nav = [
    { to: '/{-$locale}/cards' as const, label: t('navCards') },
    { to: '/{-$locale}/announcements' as const, label: t('navAnnouncements') },
  ]
  // 社交账号只在后台维护（site_settings.x_account，形如 @cardmarket），
  // 这里拼成可点击的主页地址；没配就整颗图标不渲染，不留死链。
  const xHandle = site?.x_account?.replace(/^@/, '').trim()
  const xUrl = xHandle ? `https://x.com/${xHandle}` : null
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

              {/* 桌面端导航。链接本身撑到 32px 高：纯文字行只有 16px，
                  低于 WCAG 2.5.8 的 24px，鼠标和触屏都更难命中。 */}
              <nav className="hidden sm:flex items-center gap-5 text-sm text-muted">
                {nav.map((n) => (
                  <Link
                    key={n.to}
                    to={n.to}
                    params={localeParams}
                    activeProps={{ className: 'text-fg font-semibold' }}
                    className="inline-flex items-center py-2 hover:text-fg transition"
                  >
                    {n.label}
                  </Link>
                ))}
              </nav>

              {/* 搜索 + 两个交易图标是同一组（参考图里就是「搜索框 | X | SHOP」）。
                  ≥1024 并进第一行；不足 1024 时第一行要放导航与设置，剩下的宽度
                  只够 54px 的搜索框（实测），所以整组下移成第二行，搜索才有整行可用。 */}
              <div className="ml-auto hidden min-w-0 flex-1 max-w-xl lg:flex">
                <GlobalSearch />
              </div>

              {/* 交易入口：X 与 SHOP 紧贴搜索右侧。做成图标比文字省宽度，
                  也不与「卡牌 / 公告」这两个内容导航抢注意力。
                  SHOP 字样只在 ≥1024 出现，其余宽度是方形图标。 */}
              <div className="ml-auto hidden shrink-0 items-center gap-1.5 lg:flex">
                <SocialIcon href={xUrl} label={t('xAccountLabel')} />
                <ShopLink localeParams={localeParams} label={t('navShops')} withText />
              </div>

              {/* 辅助设置放最右并压低权重：语言与主题是偏好，不是导航，
                  点击频率远低于搜索与店铺，不该占主视线。
                  手机上空间不够，收进抽屉（见下方 menuOpen 区块）。 */}
              <div className="ml-auto flex items-center gap-2">
                <div className="hidden sm:flex items-center gap-2">
                  <LocaleSwitcher />
                  <ThemeToggle />
                </div>

                {/* 移动端汉堡按钮：导航与设置都在抽屉里，顶栏只留必要项 */}
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

            {/* <1024：搜索与它的两个图标作为一组放在第二行，整行宽度都给它 */}
            <div className="flex items-center gap-1.5 py-2 lg:hidden">
              <div className="flex min-w-0 flex-1">
                <GlobalSearch />
              </div>
              <SocialIcon href={xUrl} label={t('xAccountLabel')} />
              <ShopLink localeParams={localeParams} label={t('navShops')} />
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
                  to="/{-$locale}/shops"
                  params={localeParams}
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-sm text-muted hover:text-fg border-b border-border"
                >
                  {t('navShops')}
                </Link>
                <Link
                  to="/{-$locale}/message"
                  params={localeParams}
                  onClick={() => setMenuOpen(false)}
                  className="py-2.5 text-sm text-muted hover:text-fg border-b border-border"
                >
                  {t('navContact')}
                </Link>

                {/* 桌面端在最右的两个设置项，手机收进抽屉，
                    否则 320 宽下一行放不下 logo + 搜索按钮 + 语言下拉 + 主题 + 汉堡 */}
                <div className="flex items-center justify-between gap-3 pt-3 pb-1">
                  <span className="text-xs text-faint">{t('preferences')}</span>
                  <div className="flex items-center gap-2">
                    <LocaleSwitcher />
                    <ThemeToggle />
                  </div>
                </div>
              </nav>
            </div>
          )}
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-border bg-surface mt-10">
          {/* 站内入口：留言咨询 + 审核要求的四个信息页。
              留言从 header 移到这里，与其余站内链接同一行，顺序前端固定。
              入口文字走界面语言翻译（与头部导航一致）：不翻译 Directus 内容这条边界
              只针对正文与标题，页脚的链接文字属于界面 chrome。
              用 inline-flex + py-1.5 把点击高度抬到 28px：
              纯文本行只有 16px，低于 WCAG 2.5.8 的 24px。 */}
          <nav
            aria-label={t('footerNavTitle')}
            className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-5 gap-y-1 px-4 py-6 text-xs text-muted"
          >
            <Link
              to="/{-$locale}/message"
              params={localeParams}
              className="inline-flex items-center py-1.5 hover:text-fg hover:underline transition"
            >
              {t('navContact')}
            </Link>
            {INFO_PAGE_KEYS.map((key) => (
              <Link
                key={key}
                to="/{-$locale}/info/$key"
                params={{ key, ...localeParams }}
                className="inline-flex items-center py-1.5 hover:text-fg hover:underline transition"
              >
                {t(INFO_PAGE_LABEL_KEY[key])}
              </Link>
            ))}
          </nav>

          {/* 版权区与上面链接区用一道分割线隔开，中间是 logo 与版权。
              logo 读 site_settings.logo（Directus 文件 id），后台没传时退化成
              同尺寸的占位框，不塌成 0 高，保证换 logo 前后版面不跳。 */}
          <div className="border-t border-border">
            <div className="mx-auto flex max-w-6xl flex-col items-center gap-3 px-4 py-8">
              <FooterLogo logo={site?.logo ?? null} name={siteName} />
              <p className="text-center text-xs text-faint">
                {t('copyright', {
                  year: new Date().getFullYear(),
                  site: siteName,
                })}
              </p>
            </div>
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
