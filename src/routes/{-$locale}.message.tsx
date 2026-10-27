import { useEffect, useRef, useState } from 'react'
import { createFileRoute, Link, useNavigate } from '@tanstack/react-router'
import { assetUrl, getCard, postMessage } from '~/lib/directus'
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
  useEffect(() => {
    if (result === 'ok') successRef.current?.focus()
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
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-xl font-bold">{t('contactTitle')}</h1>
      <p className="text-sm text-muted">{t('contactIntro')}</p>

      {/* 状态区常驻在 DOM 里（而不是按需插入），aria-live 才有机会播报变化。
          成功用 status（礼貌播报），失败用 alert（立即打断），因为失败需要行动。 */}
      <div aria-live="polite" aria-atomic="true">
        {result === 'ok' && (
          <div
            ref={successRef}
            tabIndex={-1}
            className="rounded-lg bg-success/15 text-success px-4 py-3 text-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
          >
            {t('submitOk')}
          </div>
        )}
      </div>
      <div role="alert">
        {result === 'error' && (
          <div className="rounded-lg bg-danger-bg text-danger px-4 py-3 text-sm">
            {t('submitFail')}
          </div>
        )}
      </div>

      <form onSubmit={submit} className="space-y-4">
        {/* 咨询对象：从卡牌详情「咨询此卡」进来时显示，可移除。
            没有它，用户在详情页点「咨询」后必须手打一遍卡名——全站唯一转化路径丢上下文。 */}
        {attachedCard && (
          <div className="flex items-center gap-3 rounded-lg border border-border bg-surface p-3">
            <div className="h-14 w-11 shrink-0 overflow-hidden rounded bg-surface-2">
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
              <div className="text-xs text-muted">
                {[
                  attachedCard.code ? t('cardCodeShort', { code: attachedCard.code }) : '',
                  attachedCard.price != null ? t('priceTag', { price: attachedCard.price }) : '',
                ]
                  .filter(Boolean)
                  .join(' · ')}
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
            <span className="text-danger">{t('requiredMark')}</span>
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
            className="rounded-lg bg-accent px-5 py-2.5 text-sm text-on-accent hover:bg-accent/90 disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
          >
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

      <Link to="/{-$locale}" className="text-sm text-muted hover:underline">
        {t('backHomeArrow')}
      </Link>
    </div>
  )
}
