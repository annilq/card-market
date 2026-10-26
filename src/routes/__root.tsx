import type { ReactNode } from 'react'
import {
  Outlet,
  createRootRoute,
  HeadContent,
  Link,
  Scripts,
} from '@tanstack/react-router'
import type { ErrorComponentProps } from '@tanstack/react-router'
import { getSiteSettings } from '~/lib/directus'
import type { SiteSettings } from '~/lib/types'
import '../styles.css'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: '卡牌展示与回购信息' },
    ],
  }),
  loader: async (): Promise<{ site: SiteSettings | null }> => {
    const site = await getSiteSettings()
    return { site }
  },
  component: RootComponent,
  notFoundComponent: NotFoundPage,
  errorComponent: ErrorPage,
})

function RootComponent() {
  const { site } = Route.useLoaderData()
  return (
    <RootDocument site={site}>
      <Outlet />
    </RootDocument>
  )
}

// 未匹配路由（含爬虫乱扫的路径）：给出站内 404，而不是默认的裸 "Not Found"
function NotFoundPage() {
  const { site } = Route.useLoaderData()
  return (
    <RootDocument site={site ?? null}>
      <div className="text-center py-24">
        <div className="text-6xl font-black text-slate-200 tracking-tight">404</div>
        <p className="mt-4 text-slate-600">页面不存在或已被删除。</p>
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <Link
            to="/"
            className="inline-flex items-center rounded-full bg-slate-900 text-white px-4 py-1.5 hover:bg-slate-700"
          >
            返回首页
          </Link>
          <Link to="/cards" className="text-slate-600 underline">
            浏览卡牌
          </Link>
        </div>
      </div>
    </RootDocument>
  )
}

// 渲染/加载异常兜底，避免整页白屏
function ErrorPage({ error, reset }: ErrorComponentProps) {
  const { site } = Route.useLoaderData()
  const message = error instanceof Error ? error.message : String(error)
  return (
    <RootDocument site={site ?? null}>
      <div className="text-center py-24">
        <div className="text-6xl font-black text-slate-200 tracking-tight">500</div>
        <p className="mt-4 text-slate-600">页面加载出错了，请稍后重试。</p>
        <p className="mt-2 text-xs text-slate-400 break-all max-w-xl mx-auto">
          {message}
        </p>
        <div className="mt-6 flex items-center justify-center gap-4 text-sm">
          <button
            onClick={reset}
            className="inline-flex items-center rounded-full bg-slate-900 text-white px-4 py-1.5 hover:bg-slate-700"
          >
            重新加载
          </button>
          <Link to="/" className="text-slate-600 underline">
            返回首页
          </Link>
        </div>
      </div>
    </RootDocument>
  )
}

function RootDocument({
  children,
  site,
}: Readonly<{ children: ReactNode; site: SiteSettings | null }>) {
  const siteName = site?.site_name || '卡牌展示站'
  const nav = [
    { to: '/', label: '首页' },
    { to: '/cards', label: '卡牌' },
    { to: '/announcements', label: '公告' },
    { to: '/shops', label: '店铺' },
  ]
  return (
    <html lang="zh-CN">
      <head>
        <HeadContent />
      </head>
      <body className="min-h-screen flex flex-col">
        <header className="sticky top-0 z-20 bg-white/90 backdrop-blur border-b border-slate-200">
          <div className="mx-auto max-w-6xl px-4 h-14 flex items-center gap-6">
            <Link to="/" className="font-bold text-lg text-slate-900">
              {siteName}
            </Link>
            <nav className="hidden sm:flex items-center gap-5 text-sm text-slate-600">
              {nav.map((n) => (
                <Link
                  key={n.to}
                  to={n.to}
                  activeProps={{ className: 'text-slate-900 font-semibold' }}
                  activeOptions={{ exact: n.to === '/' }}
                >
                  {n.label}
                </Link>
              ))}
            </nav>
            <div className="ml-auto">
              <Link
                to="/message"
                className="inline-flex items-center rounded-full bg-slate-900 text-white text-sm px-4 py-1.5 hover:bg-slate-700"
              >
                留言咨询
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 mx-auto w-full max-w-6xl px-4 py-6">
          {children}
        </main>

        <footer className="border-t border-slate-200 bg-white mt-10">
          <div className="mx-auto max-w-6xl px-4 py-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm text-slate-600">
            <div>
              <div className="font-semibold text-slate-900 mb-1">{siteName}</div>
              {site?.intro && <p className="text-slate-500">{site.intro}</p>}
            </div>
            <div className="space-y-1">
              {site?.contact_email && <div>邮箱：{site.contact_email}</div>}
              {site?.x_account && <div>X：{site.x_account}</div>}
              <div className="text-slate-400">
                店铺地址与营业时间见「店铺」页
              </div>
            </div>
            <div className="space-y-1">
              {site?.data_notice && <div>{site.data_notice}</div>}
              {site?.privacy_policy && (
                <div
                  className="text-slate-500"
                  dangerouslySetInnerHTML={{ __html: site.privacy_policy }}
                />
              )}
            </div>
          </div>
          <div className="text-center text-xs text-slate-400 py-4">
            © {new Date().getFullYear()} {siteName} · 内容由 Directus 驱动
          </div>
        </footer>
        <Scripts />
      </body>
    </html>
  )
}
