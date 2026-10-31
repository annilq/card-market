import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { assetUrl, getCard, postMessage } from '~/lib/directus'
import { formatYen } from '~/lib/format'
import { useT } from '~/lib/i18n/react'
import { translate } from '~/lib/i18n/messages'
import { buildHead, localeFromMatches, ogImage, siteFromMatches, siteNameOf } from '~/lib/seo'
import type { Card } from '~/lib/types'

// 详情页「咨询此卡」跳过来时带上的卡牌标识。
// 只放 id：卡名/价格由 loader 现取，避免 URL 里出现可被篡改、且会过期的旧价格。
interface MessageSearch {
  card?: string
}

// URL 里的卡牌 id 一律按**字符串**处理，并且只接受安全字符。
//
// 为什么不用纯数字：TanStack 的默认 search 序列化会把能 JSON.parse 的字符串
// 再 stringify 一遍（`card` 变成 `card=%221%22`，响应 307），来回重定向很脆弱。
// 用 `c-1` 这种以字母开头的 id，解析与序列化都是恒等映射，`?card=c-1` 原样进出。
const CARD_ID_PATTERN = /^c-\d+$/

const asCardId = (v: unknown): string | undefined => {
  if (typeof v !== 'string') return undefined
  const raw = v.trim()
  return CARD_ID_PATTERN.test(raw) ? raw : undefined
}

/** `?card=c-1` → `1`（Directus 主键） */
function cardIdFromSearchParam(param: string): string {
  return param.slice(2)
}

export const Route = createFileRoute('/{-$locale}/message')({
  validateSearch: (s: Record<string, unknown>): MessageSearch => {
    const card = asCardId(s.card)
    return card ? { card } : {}
  },
  loaderDeps: ({ search }) => ({ card: search.card }),
  loader: async ({ deps }): Promise<{ card: Card | null }> =>
    deps.card ? { card: await getCard(cardIdFromSearchParam(deps.card)) } : { card: null },
  head: async ({ matches }) => {
    const locale = localeFromMatches(matches)
    return buildHead({
      locale,
      pathname: '/message',
      siteName: siteNameOf(siteFromMatches(matches), locale),
      title: translate(locale, 'contactTitle'),
      description: translate(locale, 'contactIntro'),
      image: ogImage(matches),
    })
  },
  component: MessageForm,
})

function MessageForm() {
  const t = useT()
  const { card } = Route.useLoaderData()
  const navigate = useNavigate()
  /** 用户主动移除的卡牌：只在本次访问里生效，不写回 URL。 */
  const [dismissed, setDismissed] = useState(false)

  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [info, setInfo] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<'ok' | 'error' | null>(null)

  const contentRef = useRef<HTMLTextAreaElement>(null)
  const successRef = useRef<HTMLDivElement>(null)

  // 提交成功后把焦点移到回执上：屏幕阅读器会读到，键盘用户也不会停在已清空的表单里。
  // 同时滚动到它：手机上回执在表单上方，而提交时用户已经滚到按钮处，
  // 只 focus() 不滚动的话焦点会落在屏幕外——看起来像「什么都没发生」。
  useEffect(() => {
    if (result !== 'ok') return
    successRef.current?.focus({ preventScroll: true })
    successRef.current?.scrollIntoView({ block: 'center', behavior: 'smooth' })
  }, [result])

  const attachedCard = dismissed ? null : card

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    const text = content.trim()
    if (!text || submitting) return
    setSubmitting(true)
    setResult(null)
    const res = await postMessage({
      content: text,
      contact_name: name.trim() || undefined,
      contact_info: info.trim() || undefined,
      // 用户若点击叉号移除了卡片上下文，attachedCard 为 null，card 不发送，留言即与卡牌无关。
      card: attachedCard?.id,
    })
    setSubmitting(false)
    if (res.ok) {
      setContent('')
      setName('')
      setInfo('')
      setResult('ok')
    } else {
      // 具体原因只进控制台：访客需要的是「发生了什么 + 下一步做什么」，
      // 不是 `TypeError: Failed to fetch` 或 Directus 的 403 响应体。
      console.error('[message] submit failed', res.error)
      setResult('error')
    }
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-2xl font-bold">{t('contactTitle')}</h1>
      <p className="mt-2 text-sm text-muted leading-relaxed">{t('contactIntro')}</p>

      {/* 状态区常驻在 DOM 里（而不是按需插入），aria-live 才有机会播报变化。
          成功用 status（礼貌播报），失败用 alert（立即打断），因为失败需要行动。 */}
      <div aria-live="polite" aria-atomic="true">
        {result === 'ok' && (
          <div
            ref={successRef}
            tabIndex={-1}
            className="banner-enter rounded-lg bg-success/15 text-success px-4 py-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
          >
            {t('submitOk')}
          </div>
        )}
      </div>
      <div role="alert">
        {result === 'error' && (
          <div className="banner-enter rounded-lg bg-danger-bg text-danger px-4 py-3 text-sm">
            {t('submitFail')}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="mt-6 space-y-5">
        {/* 咨询对象：从卡牌详情「咨询此卡」进来时显示，可移除。
            没有它，用户在详情页点「咨询」后必须手打一遍卡名——全站唯一转化路径丢上下文。 */}
        {attachedCard && (
          <div className="flex items-center gap-3 rounded-xl border border-border bg-surface p-3">
            <div className="h-[72px] w-14 shrink-0 overflow-hidden rounded-lg bg-surface-2">
              {assetUrl(attachedCard.images?.[0], { width: 88, format: 'webp' }) ? (
                <img
                  src={assetUrl(attachedCard.images?.[0], { width: 88, format: 'webp' }) as string}
                  alt={attachedCard.name}
                  className="h-full w-full object-cover"
                />
              ) : null}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-xs text-faint">{t('cardContextLabel')}</div>
              <div className="truncate text-sm font-medium text-fg">{attachedCard.name}</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs">
                {attachedCard.code && (
                  <span className="text-faint">
                    {t('cardCodeShort', { code: attachedCard.code })}
                  </span>
                )}
                {attachedCard.price != null && (
                  // 价格在这一块里也用价格的令牌与字重：用户要确认的正是
                  // 「我咨询的是这张、这个价」，压成一行灰色小字等于把答案藏起来。
                  <span className="text-price font-semibold tabular-nums">
                    {t('priceTag', { price: formatYen(attachedCard.price) })}
                  </span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setDismissed(true)}
              aria-label={t('cardContextRemove')}
              title={t('cardContextRemove')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted hover:bg-surface-2 hover:text-fg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>
        )}

        <div>
          {/* label 用 htmlFor 关联：之前只有视觉相邻，读屏软件听到的是 placeholder。 */}
          <label htmlFor="message-content" className="mb-1 block text-sm text-muted">
            {t('messageContent')}{' '}
            {/* 必填标记不用红：红在这个系统里是钱与错误。必填是中性信息，
                用墨色 + 星号即可，留给错误信息一点颜色余量。 */}
            <span className="text-faint text-xs">
              <span aria-hidden="true" className="mr-0.5">*</span>
              {t('requiredMark')}
            </span>
          </label>
          <textarea
            id="message-content"
            name="content"
            ref={contentRef}
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            required
            aria-required="true"
            className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-fg placeholder:text-faint outline-none focus:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
            placeholder={t('messagePlaceholder')}
          />
          {/* 回复时限放在提交之前：这是访客决定要不要等下去的信息。 */}
          <p className="mt-1 text-xs text-faint">{t('replyHint')}</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="message-name" className="mb-1 block text-sm text-muted">
              {t('contactName')}{' '}
              <span className="text-xs text-faint">{t('optionalMark')}</span>
            </label>
            <input
              id="message-name"
              name="contact_name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              autoComplete="name"
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-fg placeholder:text-faint outline-none focus:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
              placeholder={t('contactName')}
            />
          </div>
          <div>
            <label htmlFor="message-info" className="mb-1 block text-sm text-muted">
              {t('contactInfo')}{' '}
              <span className="text-xs text-faint">{t('optionalMark')}</span>
            </label>
            <input
              id="message-info"
              name="contact_info"
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              autoComplete="email"
              className="w-full rounded-lg border border-border-strong bg-surface px-3 py-2 text-fg placeholder:text-faint outline-none focus:border-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
              placeholder={t('contactInfoPlaceholder')}
            />
          </div>
        </div>
        {/* 说的是「为什么需要」，不是重复字段名。 */}
        <p className="text-xs text-faint">{t('contactHint')}</p>

        <div className="flex flex-wrap items-center gap-4">
          <button
            type="submit"
            disabled={submitting}
            aria-busy={submitting}
            // 锁定宽度：文案从「提交留言」变「提交中…」时按钮不该跟着变宽，
            // 否则旁边那个次要动作会横向跳一格。
            className="inline-flex min-w-32 items-center justify-center gap-2 rounded-lg bg-accent px-5 py-2.5 text-sm text-on-accent transition-colors duration-150 hover:bg-accent/90 disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
          >
            {submitting && (
              <svg
                width="14" height="14" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"
                className="animate-spin motion-reduce:hidden" aria-hidden="true"
              >
                <path d="M12 3a9 9 0 1 0 9 9" />
              </svg>
            )}
            {submitting ? t('submitting') : t('submitMessage')}
          </button>
          <button
            type="button"
            onClick={() => navigate({ to: '/{-$locale}/cards' })}
            className="text-sm text-muted hover:text-fg hover:underline"
          >
            {t('browseCards')}
          </button>
        </div>
      </form>

      {/* 返回首页与提交区分开：它和「浏览卡牌」同属次要出口，但不在同一个
          动作组里，挤在提交按钮下方 8px 会读成表单的一部分。 */}
      <div className="mt-8 border-t border-border pt-5">
        <Link
          to="/{-$locale}"
          className="inline-flex items-center py-1 text-sm text-muted transition-colors duration-150 hover:text-fg hover:underline"
        >
          {t('backHomeArrow')}
        </Link>
      </div>
    </div>
  )
}
