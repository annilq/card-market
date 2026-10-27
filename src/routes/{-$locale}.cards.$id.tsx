import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { assetUrl, getCard } from '~/lib/directus'
import { useT } from '~/lib/i18n/react'
import { translate } from '~/lib/i18n/messages'
import {
  buildHead,
  formatPrice,
  localeFromMatches,
  ogImageFromFile,
  siteFromMatches,
  siteNameOf,
} from '~/lib/seo'
import type { Card } from '~/lib/types'

export const Route = createFileRoute('/{-$locale}/cards/$id')({
  loader: async ({ params }): Promise<{ card: Awaited<ReturnType<typeof getCard>> }> => {
    const card = await getCard(params.id)
    return { card }
  },
  // 卡牌详情：标题带卡名，描述带价格 / 编号 / 成色，分享图用第一张卡图。
  // 查不到卡时标 noindex——一张空白详情页被收录只会拉低整站的索引质量。
  head: async ({ matches, params }) => {
    const locale = localeFromMatches(matches)
    const site = siteFromMatches(matches)
    const card = (matches[matches.length - 1]?.loaderData as
      | { card?: Card | null }
      | undefined)?.card
    const siteName = siteNameOf(site, locale)
    if (!card) {
      return buildHead({
        locale,
        pathname: `/cards/${params.id}`,
        siteName,
        title: translate(locale, 'cardNotFound'),
        noindex: true,
      })
    }
    const facts = [
      formatPrice(card.price),
      card.code ? translate(locale, 'cardCodeShort', { code: card.code }) : '',
      card.rarity?.name ?? '',
      translate(locale, card.card_status === 'packaged' ? 'statusPackaged' : 'statusRaw'),
    ].filter(Boolean)
    const series = [card.ip?.name, card.series?.name, card.sub_series?.name]
      .filter(Boolean)
      .join(' / ')
    return buildHead({
      locale,
      pathname: `/cards/${params.id}`,
      siteName,
      title: card.name,
      description: [series, facts.join(' · ')].filter(Boolean).join(' ｜ '),
      image: ogImageFromFile(card.images?.[0]),
      type: 'article',
    })
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
            <div className="w-full h-full flex items-center justify-center text-hint">
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
          <span className="text-2xl text-price font-semibold tabular-nums">
            {card.price != null ? t('priceTag', { price: card.price }) : t('priceOnRequest')}
          </span>
          {card.rarity?.name && (
            <span className="text-sm bg-surface-2 text-muted rounded-full px-3 py-1">
              {card.rarity.name}
            </span>
          )}
          {card.is_high_value && (
            <span className="text-xs bg-high-value-bg text-high-value rounded px-2 py-1">
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
          {/* 带上卡牌 id：留言页会据此显示「咨询的卡牌」，用户不必重打一遍卡名。
              只传 id，卡名与价格在留言页现取——URL 里不放会过期的价格。 */}
          <Link
            to="/{-$locale}/message"
            search={{ card: `c-${card.id}` }}
            className="rounded-lg bg-accent text-on-accent px-4 py-2 text-sm hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
          >
            {t('inquireCard')}
          </Link>
        </div>
      </div>
    </div>
  )
}
