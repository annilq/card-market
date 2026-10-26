import { Link } from '@tanstack/react-router'
import { assetUrl } from '~/lib/directus'
import { useT } from '~/lib/i18n/react'
import type { Card } from '~/lib/types'

export function CardCard({ card }: { card: Card }) {
  const t = useT()
  const img = assetUrl(card.images?.[0], {
    width: 400,
    format: 'webp',
  })
  return (
    <Link
      to="/{-$locale}/cards/$id"
      params={{ id: String(card.id) }}
      className="group block rounded-xl border border-border bg-surface overflow-hidden hover:shadow-md hover:border-border-strong transition"
    >
      <div className="aspect-[3/4] bg-surface-2">
        {img ? (
          <img
            src={img}
            alt={card.name}
            loading="lazy"
            className="w-full h-full object-cover group-hover:scale-[1.02] transition"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ghost text-sm">
            {t('noImage')}
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="text-xs text-faint truncate">
          {card.ip?.name} · {card.series?.name}
        </div>
        <div className="font-medium text-fg truncate">{card.name}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-rose-600 dark:text-rose-400 font-semibold">
            {card.price != null ? t('priceTag', { price: card.price }) : t('priceOnRequest')}
          </span>
          <span className="text-xs text-faint">{card.rarity?.name}</span>
        </div>
        {card.code && (
          <div className="text-xs text-faint mt-1">{t('cardCodeShort', { code: card.code })}</div>
        )}
        {card.is_high_value && (
          <span className="inline-block mt-1 text-[10px] bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded px-1.5 py-0.5">
            {t('highValue')}
          </span>
        )}
      </div>
    </Link>
  )
}
