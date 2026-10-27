import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { assetUrl, getCard } from '~/lib/directus'
import { useT } from '~/lib/i18n/react'

export const Route = createFileRoute('/{-$locale}/cards/$id')({
  loader: async ({ params }): Promise<{ card: Awaited<ReturnType<typeof getCard>> }> => {
    const card = await getCard(params.id)
    return { card }
  },
  component: CardDetail,
})

function CardDetail() {
  const { card } = Route.useLoaderData()
  const t = useT()
  const [active, setActive] = useState(0)

  if (!card) {
    return (
      <div className="text-center py-20">
        <p className="text-muted">{t('cardNotFound')}</p>
        <Link to="/{-$locale}/cards" className="text-fg underline">
          {t('backToCards')}
        </Link>
      </div>
    )
  }

  const statusLabel =
    card.card_status === 'packaged' ? t('statusPackaged') : t('statusRaw')

  const imgs = (card.images ?? [])
    .map((i) => assetUrl(i, { width: 900, format: 'webp' }))
    .filter(Boolean) as string[]
  const main = imgs[active] ?? null

  return (
    // min-w-0：grid 子项默认 min-width:auto，一张超长无空格的卡名会把整列顶宽，
    // 进而撑破视口（break-words 只影响换行，不降低 min-content）。
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8">
      <div className="min-w-0">
        <div className="aspect-[3/4] bg-surface-2 rounded-xl overflow-hidden border border-border">
          {main ? (
            <img src={main} alt={card.name} className="w-full h-full object-contain" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-ghost">
              {t('noImage')}
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
                  i === active ? 'border-fg' : 'border-border'
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-4 min-w-0">
        <div>
          <div className="text-xs text-faint">
            {card.ip?.name} · {card.series?.name} · {card.sub_series?.name}
          </div>
          <h1 className="text-2xl font-bold mt-1 break-words">{card.name}</h1>
          {card.code && (
            <div className="text-sm text-muted mt-1">{t('cardCode', { code: card.code })}</div>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-2xl text-rose-600 dark:text-rose-400 font-semibold">
            {card.price != null ? t('priceTag', { price: card.price }) : t('priceOnRequest')}
          </span>
          {card.rarity?.name && (
            <span className="text-sm bg-surface-2 text-muted rounded-full px-3 py-1">
              {card.rarity.name}
            </span>
          )}
          {card.is_high_value && (
            <span className="text-xs bg-amber-500/15 text-amber-600 dark:text-amber-400 rounded px-2 py-1">
              {t('highValue')}
            </span>
          )}
        </div>

        <dl className="grid grid-cols-2 gap-3 text-sm border-t border-border pt-4">
          <div>
            <dt className="text-faint">{t('cardStatus')}</dt>
            <dd>{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-faint">{t('rarityLabel')}</dt>
            <dd>{card.rarity?.name ?? '—'}</dd>
          </div>
        </dl>

        {card.description && (
          <div className="border-t border-border pt-4">
            <div className="text-sm text-faint mb-1">{t('description')}</div>
            <p className="text-body whitespace-pre-wrap">{card.description}</p>
          </div>
        )}

        <div className="flex gap-3 pt-2 flex-wrap">
          <Link
            to="/{-$locale}/cards"
            className="rounded-lg border border-border-strong px-4 py-2 text-sm hover:bg-surface-2 text-muted"
          >
            {t('backToList')}
          </Link>
          <Link
            to="/{-$locale}/message"
            className="rounded-lg bg-accent text-on-accent px-4 py-2 text-sm hover:bg-accent/90"
          >
            {t('inquireCard')}
          </Link>
        </div>
      </div>
    </div>
  )
}
