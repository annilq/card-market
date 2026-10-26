import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { assetUrl, getCard } from '~/lib/directus'

export const Route = createFileRoute('/cards/$id')({
  loader: async ({ params }): Promise<{ card: Awaited<ReturnType<typeof getCard>> }> => {
    const card = await getCard(params.id)
    return { card }
  },
  component: CardDetail,
})

const STATUS_LABEL: Record<string, string> = {
  raw: '裸卡',
  packaged: '有包装',
}

function CardDetail() {
  const { card } = Route.useLoaderData()
  const [active, setActive] = useState(0)

  if (!card) {
    return (
      <div className="text-center py-20">
        <p className="text-slate-500">未找到该卡牌（可能已下架）。</p>
        <Link to="/cards" className="text-slate-900 underline">
          返回卡牌列表
        </Link>
      </div>
    )
  }

  const imgs = (card.images ?? [])
    .map((i) => assetUrl(i, { width: 900, format: 'webp' }))
    .filter(Boolean) as string[]
  const main = imgs[active] ?? null

  return (
    <div className="grid md:grid-cols-2 gap-8">
      <div>
        <div className="aspect-[3/4] bg-slate-100 rounded-xl overflow-hidden border border-slate-200">
          {main ? (
            <img src={main} alt={card.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300">
              暂无图片
            </div>
          )}
        </div>
        {imgs.length > 1 && (
          <div className="flex gap-2 mt-3 overflow-x-auto">
            {imgs.map((src, i) => (
              <button
                key={i}
                onClick={() => setActive(i)}
                className={`w-16 h-20 rounded-md overflow-hidden border ${
                  i === active ? 'border-slate-900' : 'border-slate-200'
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div>
          <div className="text-xs text-slate-400">
            {card.ip?.name} · {card.series?.name} · {card.sub_series?.name}
          </div>
          <h1 className="text-2xl font-bold mt-1">{card.name}</h1>
          {card.code && (
            <div className="text-sm text-slate-500 mt-1">收藏编号 {card.code}</div>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-2xl text-rose-600 font-semibold">
            {card.price != null ? `¥${card.price}` : '面议'}
          </span>
          {card.rarity?.name && (
            <span className="text-sm bg-slate-100 text-slate-600 rounded-full px-3 py-1">
              {card.rarity.name}
            </span>
          )}
          {card.is_high_value && (
            <span className="text-xs bg-amber-100 text-amber-700 rounded px-2 py-1">
              精品
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm border-t border-slate-200 pt-4">
          <div>
            <dt className="text-slate-400">卡牌状态</dt>
            <dd>{STATUS_LABEL[card.card_status] ?? card.card_status}</dd>
          </div>
          <div>
            <dt className="text-slate-400">稀有程度</dt>
            <dd>{card.rarity?.name ?? '—'}</dd>
          </div>
        </dl>

        {card.description && (
          <div className="border-t border-slate-200 pt-4">
            <div className="text-sm text-slate-400 mb-1">描述</div>
            <p className="text-slate-700 whitespace-pre-wrap">{card.description}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <Link
            to="/cards"
            className="rounded-lg border border-slate-300 px-4 py-2 text-sm hover:bg-slate-50"
          >
            返回列表
          </Link>
          <Link
            to="/message"
            className="rounded-lg bg-slate-900 text-white px-4 py-2 text-sm hover:bg-slate-700"
          >
            咨询此卡
          </Link>
        </div>
      </div>
    </div>
  )
}
