import { Link } from '@tanstack/react-router'
import { assetUrl } from '~/lib/directus'
import type { Card } from '~/lib/types'

export function CardCard({ card }: { card: Card }) {
  const img = assetUrl(card.images?.[0], {
    width: 400,
    format: 'webp',
  })
  return (
    <Link
      to="/cards/$id"
      params={{ id: String(card.id) }}
      className="group block rounded-xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition"
    >
      <div className="aspect-[3/4] bg-slate-100">
        {img ? (
          <img
            src={img}
            alt={card.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
            暂无图片
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-xs text-slate-400 truncate">
          {card.ip?.name} · {card.series?.name}
        </div>
        <div className="font-medium text-slate-900 truncate">{card.name}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-rose-600 font-semibold">
            {card.price != null ? `¥${card.price}` : '面议'}
          </span>
          <span className="text-xs text-slate-400">{card.rarity?.name}</span>
        </div>
        {card.code && (
          <div className="text-xs text-slate-400 mt-1">编号 {card.code}</div>
        )}
        {card.is_high_value && (
          <span className="inline-block mt-1 text-[10px] bg-amber-100 text-amber-700 rounded px-1.5 py-0.5">
            精品
          </span>
        )}
      </div>
    </Link>
  )
}
