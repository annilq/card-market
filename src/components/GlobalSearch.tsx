import { useNavigate, useRouterState } from '@tanstack/react-router'
import { useT } from '~/lib/i18n/react'

// 输入值以 URL 为唯一来源：非受控输入 + key 随 q 变化重新挂载，
// 这样从站内链接跳到 /cards?q=... 时字段会刷新，且 SSR 与客户端渲染一致。
export function GlobalSearch() {
  const t = useT()
  const navigate = useNavigate()
  const q = useRouterState({
    select: (s) => {
      const raw = (s.location.search as Record<string, unknown>).q
      return typeof raw === 'string' ? raw : undefined
    },
  })

  return (
    <form
      // 参考图顶栏：560×40 白输入框 + 80×40 浅灰「检索」按钮，两者分开，各带 4px 圆角。
      onSubmit={(e) => {
        e.preventDefault()
        const value = String(new FormData(e.currentTarget).get('q') ?? '')
        // 从列表页提交时保留 ip/series/rarity 等筛选，只重置分页。
        navigate({
          to: '/{-$locale}/cards',
          search: (prev) => ({ ...prev, q: value.trim() || undefined, page: 1 }),
        })
      }}
      className="flex w-full items-center gap-2.5"
    >
      {/* 提示文案盖在输入框上，而不是用 placeholder 属性：属性值固定，
          没法按宽度换。完整文案实测 247px 宽，手机输入框内宽只有 110–220px，
          必然被裁成「罕见…」，所以窄屏用短文案、xl 起用完整文案。
          input 用一个空格占位，:placeholder-shown 才能判断「是否为空」。 */}
      <div className="relative min-w-0 flex-1">
        <input
          key={q ?? ''}
          name="q"
          type="text"
          defaultValue={q ?? ''}
          aria-label={t('searchPlaceholder')}
          placeholder=" "
          className="peer h-10 w-full rounded border-0 bg-white px-3.5 text-sm text-fg outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3.5 hidden items-center truncate text-sm text-subtle peer-placeholder-shown:flex"
        >
          <span className="xl:hidden">{t('searchPlaceholderShort')}</span>
          <span className="hidden xl:inline">{t('searchPlaceholder')}</span>
        </span>
      </div>
      <button
        type="submit"
        className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded bg-surface-2 px-4 text-sm text-fg transition hover:bg-border-strong"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        {t('search')}
      </button>
    </form>
  )
}
