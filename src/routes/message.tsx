import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { postMessage } from '~/lib/directus'

export const Route = createFileRoute('/message')({
  component: MessageForm,
})

function MessageForm() {
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
      <h1 className="text-xl font-bold">留言咨询</h1>
      <p className="text-sm text-slate-500">
        留下您的问题或收购意向，管理员会在后台处理。联系方式选填，便于我们回复。
      </p>

      {status?.ok && (
        <div className="rounded-lg bg-emerald-50 text-emerald-700 px-4 py-3 text-sm">
          提交成功，感谢您的留言！
        </div>
      )}
      {status && !status.ok && (
        <div className="rounded-lg bg-rose-50 text-rose-700 px-4 py-3 text-sm">
          提交失败：{status.msg}
        </div>
      )}

      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-600 mb-1">
            留言内容 <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={5}
            required
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
            placeholder="例如：想收购某张卡，或咨询回购价格…"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm text-slate-600 mb-1">联系人</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="选填"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-600 mb-1">
              联系方式
            </label>
            <input
              value={info}
              onChange={(e) => setInfo(e.target.value)}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none focus:border-slate-500"
              placeholder="邮箱 / 电话 / 微信（选填）"
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={submitting}
          className="rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm hover:bg-slate-700 disabled:opacity-50"
        >
          {submitting ? '提交中…' : '提交留言'}
        </button>
      </form>

      <Link to="/" className="text-sm text-slate-500 hover:underline">
        ← 返回首页
      </Link>
    </div>
  )
}
