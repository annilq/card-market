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
      onSubmit={(e) => {
        e.preventDefault()
        const value = String(new FormData(e.currentTarget).get('q') ?? '')
        // 从列表页提交时保留 ip/series/rarity 等筛选，只重置分页。
        navigate({
          to: '/{-$locale}/cards',
          search: (prev) => ({ ...prev, q: value.trim() || undefined, page: 1 }),
        })
      }}
      className="flex w-full items-center gap-2"
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
          className="peer h-9 w-full rounded-lg border border-border-strong bg-surface px-3 text-sm text-fg outline-none focus:border-muted"
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-y-0 left-3 hidden items-center truncate text-sm text-faint peer-placeholder-shown:flex"
        >
          <span className="xl:hidden">{t('searchPlaceholderShort')}</span>
          <span className="hidden xl:inline">{t('searchPlaceholder')}</span>
        </span>
      </div>
      <button
        type="submit"
        className="h-9 shrink-0 rounded-lg bg-accent px-4 text-sm text-on-accent hover:bg-accent/90"
      >
        {t('search')}
      </button>
    </form>
  )
}
