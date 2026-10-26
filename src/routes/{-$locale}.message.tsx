import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { postMessage } from '~/lib/directus'
import { useT } from '~/lib/i18n/react'

export const Route = createFileRoute('/{-$locale}/message')({
  component: MessageForm,
})

function MessageForm() {
  const t = useT()
  const [content, setContent] = useState('')
  const [name, setName] = useState('')
  const [info, setInfo] = useState('')
  const [status, setStatus] = useState<{
    ok: boolean
    msg?: string
  } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim() || submitting) return
    setSubmitting(true)
    setStatus(null)
    const res = await postMessage({
      content: content.trim(),
      contact_name: name.trim() || undefined,
      contact_info: info.trim() || undefined,
    })
    setSubmitting(false)
    if (res.ok) {
      setContent('')
      setName('')
      setInfo('')
      setStatus({ ok: true })
    } else {
      setStatus({ ok: false, msg: res.error })
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-5">
      <h1 className="text-xl font-bold">{t('contactTitle')}</h1>
      <p className="text-sm text-muted">{t('contactIntro')}</p>

      {status?.ok && (
        <div className="rounded-lg bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 px-4 py-3 text-sm">
          {t('submitOk')}
        </div>
      )}
      {status && !status.ok && (
        <div className="rounded-lg bg-rose-500/15 text-rose-600 dark:text-rose-400 px-4 py-3 text-sm">
          {t('submitFail', { msg: status.msg ?? '' })}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-muted mb-1">
            {t('messageContent')} <span className="text-rose-500 dark:text-rose-400">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            required
            className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-muted bg-surface text-fg placeholder:text-faint"
            placeholder={t('messagePlaceholder')}
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-muted mb-1">{t('contactName')}</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-muted bg-surface text-fg placeholder:text-faint"
              placeholder={t('optional')}
            />
          </div>
          <div>
            <label className="block text-sm text-muted mb-1">
              {t('contactInfo')}
            </label>
            <input
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              className="w-full rounded-lg border border-border-strong px-3 py-2 text-sm outline-none focus:border-muted bg-surface text-fg placeholder:text-faint"
              placeholder={t('contactInfoPlaceholder')}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-accent text-on-accent px-5 py-2.5 text-sm hover:bg-accent/90 disabled:opacity-50"
        >
          {submitting ? t('submitting') : t('submitMessage')}
        </button>
      </form>

      <Link to="/{-$locale}" className="text-sm text-muted hover:underline">
        {t('backHomeArrow')}
      </Link>
    </div>
  )
}
