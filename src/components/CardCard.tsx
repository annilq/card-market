import { Link } from '@tanstack/react-router'
import { assetUrl } from '~/lib/directus'
import { useT } from '~/lib/i18n/react'
import type { Card } from '~/lib/types'

/**
 * 卡牌卡片。`compact` 用于首页高价买取横条：窄卡位只保留图片、卡名与价格，
 * 类目/稀有度/编号在小宽度下会截成噪声，故隐藏。
 */
export function CardCard({
  card,
  compact = false,
}: {
  card: Card
  compact?: boolean
}) {
  const t = useT()
  const img = assetUrl(card.images?.[0], {
    width: compact ? 240 : 400,
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
            className="w-full h-full object-cover group-hover:scale-[1.02] transition motion-reduce:group-hover:scale-100"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-hint text-sm">
            {t('noImage')}
          </div>
        )}
      </div>
      <div className={compact ? 'p-2' : 'p-3'}>
        {!compact && (
          <div className="text-xs text-faint truncate">
            {card.ip?.name} · {card.series?.name}
          </div>
        )}
        <div className="font-medium text-fg truncate">{card.name}</div>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-price font-semibold tabular-nums">
            {card.price != null ? t('priceTag', { price: card.price }) : t('priceOnRequest')}
          </span>
          {!compact && (
            <span className="text-xs text-faint">{card.rarity?.name}</span>
          )}
        </div>
        {!compact && card.code && (
          <div className="text-xs text-faint mt-1">{t('cardCodeShort', { code: card.code })}</div>
        )}
        {!compact && card.is_high_value && (
          <span className="inline-block mt-1 text-[11px] bg-high-value-bg text-high-value rounded px-1.5 py-0.5">
            {t('highValue')}
          </span>
        )}
      </div>
    </Link>
  )
}
