import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { assetUrl, getCard } from '~/lib/directus'
import { formatDate, useLocale, useT } from '~/lib/i18n/react'
import { formatYen } from '~/lib/format'
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
  const locale = useLocale()
  const [active, setActive] = useState(0)
  // 主图淡入只在「用户换了一张」之后播。首帧不播：页面加载时大图淡入
  // 是加载编排，不是状态变化；而且转场（view transition）本来就会把这张图
  // 从列表带过来，两者叠在一起会看见两次动。
  const [swapped, setSwapped] = useState(false)

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
  const isVault = card.card_status === 'packaged'

  const imgs = (card.images ?? [])
    .map((i) => assetUrl(i, { width: 900, format: 'webp' }))
    .filter(Boolean) as string[]
  const main = imgs[active] ?? null

  // 方向键在缩略图之间移动：只在真的有多张图时接管，
  // 且不拦截输入框（这一页没有，但保留判断以免将来加字段时出问题）。
  const select = (i: number) => {
    setSwapped(true)
    setActive(i)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (imgs.length < 2) return
    if (e.key === 'ArrowLeft') {
      e.preventDefault()
      select((active - 1 + imgs.length) % imgs.length)
    } else if (e.key === 'ArrowRight') {
      e.preventDefault()
      select((active + 1) % imgs.length)
    }
  }

  return (
    // min-w-0：grid 子项默认 min-width:auto，一张超长无空格的卡名会把整列顶宽，
    // 进而撑破视口（break-words 只影响换行，不降低 min-content）。
    // 手机底部留出粘性操作条的高度，否则描述最后一行会被它盖住。
    <div className="grid md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] gap-8 pb-20 md:pb-0">
      <div className="min-w-0">
        <div
          // 共享元素：从列表点进来时，这张图的图位与列表缩略图是同一个
          // `view-transition-name`（按卡牌 id 生成），浏览器会把缩略图
          // 形变成大图——这是全站唯一的作者时刻，它解释「你点的就是这一张」。
          // 聚焦环走系统令牌（墨色 2px + 2px offset），不是浏览器默认的蓝框：
          // 这一块是全站唯一「可聚焦的图片组」，默认环在这里会像一处漏样式。
          className="vt-card relative aspect-[3/4] bg-surface-2 rounded-xl overflow-hidden border border-border focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
          style={{ ['--vt-name' as string]: `card-${card.id}` }}
          onKeyDown={onKeyDown}
          tabIndex={imgs.length > 1 ? 0 : undefined}
          role={imgs.length > 1 ? 'group' : undefined}
          aria-label={imgs.length > 1 ? t('galleryLabel') : undefined}
        >
          {main ? (
            // key 换掉时淡入：同一张图位换源，不做淡入会「啪」地跳一下。
            // 用 opacity 而非 transform，避免和 view transition 的形变打架。
            <img
              key={main}
              src={main}
              alt={card.name}
              className={`w-full h-full object-contain ${swapped ? 'banner-enter' : ''}`}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-hint">
              {t('noImage')}
            </div>
          )}
        </div>
        {imgs.length > 1 && (
          <div className="mt-3 flex gap-2 overflow-x-auto">
            {imgs.map((src, i) => (
              <button
                key={i}
                type="button"
                onClick={() => select(i)}
                aria-label={t('galleryThumb', { n: i + 1 })}
                aria-current={i === active ? 'true' : undefined}
                className={`relative h-20 w-16 shrink-0 overflow-hidden rounded-md border-2 transition-colors duration-150 ${
                  i === active
                    ? 'border-fg'
                    : 'border-transparent hover:border-border-strong'
                }`}
              >
                <img src={src} alt="" className="w-full h-full object-cover" />
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="min-w-0">
        <div>
          <div className="text-xs text-faint">
            {[card.ip?.name, card.series?.name, card.sub_series?.name]
              .filter(Boolean)
              .join(' · ')}
          </div>
          <h1 className="text-2xl font-bold mt-1 break-words">{card.name}</h1>
          {card.code && (
            <div className="text-sm text-muted mt-1">
              {t('cardCode', { code: card.code })}
            </div>
          )}
        </div>

        {/* 价格 + 徽章 + CTA 合成一块粘性栏：长描述滚动时，价格与「咨询此卡」
            始终在视口内。桌面吸顶，手机吸底（见文件末尾的 sticky 条）。
            手机端这里只留价格，CTA 交给底部条，避免同一页两个主按钮。 */}
        <div className="mt-5 md:sticky md:top-20">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-2xl text-price font-semibold tabular-nums">
              {card.price != null
                ? t('priceTag', { price: formatYen(card.price) })
                : t('priceOnRequest')}
            </span>
            {card.rarity?.name && (
              <span className="text-sm bg-surface-2 text-muted rounded-full px-3 py-1">
                {card.rarity.name}
              </span>
            )}
            {isVault && (
              <span className="text-xs bg-vault-bg text-vault rounded px-2 py-1 font-medium">
                {t('statusPackaged')}
              </span>
            )}
            {card.is_high_value && (
              <span className="text-xs bg-high-value-bg text-high-value rounded px-2 py-1">
                {t('highValue')}
              </span>
            )}
          </div>

          {/* 桌面 CTA 紧跟价格：价格与「问这张卡」是同一件事的两面。 */}
          <div className="mt-4 hidden gap-3 md:flex">
            <Link
              to="/{-$locale}/message"
              search={{ card: `c-${card.id}` }}
              className="rounded-lg bg-accent px-4 py-2 text-sm text-on-accent transition-colors duration-150 hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
            >
              {t('inquireCard')}
            </Link>
            <Link
              to="/{-$locale}/cards"
              className="rounded-lg border border-border-strong px-4 py-2 text-sm text-muted transition-colors duration-150 hover:bg-surface-2 hover:text-fg"
            >
              {t('backToList')}
            </Link>
          </div>
        </div>

        <dl className="mt-6 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-5 text-sm">
          <div>
            <dt className="text-faint">{t('cardStatus')}</dt>
            <dd className="mt-0.5">{statusLabel}</dd>
          </div>
          <div>
            <dt className="text-faint">{t('rarityLabel')}</dt>
            <dd className="mt-0.5">{card.rarity?.name ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-faint">{t('cardCodeLabel')}</dt>
            <dd className="mt-0.5 break-words tabular-nums">{card.code ?? '—'}</dd>
          </div>
          <div>
            <dt className="text-faint">{t('listedAt')}</dt>
            <dd className="mt-0.5 tabular-nums">
              {card.date_created ? formatDate(card.date_created, locale) : '—'}
            </dd>
          </div>
        </dl>

        {card.description && (
          <div className="mt-6 border-t border-border pt-5">
            <div className="text-sm text-faint mb-1.5">{t('description')}</div>
            <p className="text-body whitespace-pre-wrap leading-relaxed">
              {card.description}
            </p>
          </div>
        )}

        {/* 手机：返回列表是次要动作，留在文档流末尾。 */}
        <div className="mt-6 md:hidden">
          <Link
            to="/{-$locale}/cards"
            className="text-sm text-muted transition-colors duration-150 hover:text-fg hover:underline"
          >
            {t('backToList')}
          </Link>
        </div>
      </div>

      {/* 手机底部粘性操作条：详情页全站唯一的转化路径，不该要求用户
          滚过描述才看得到。安全区内边距让它在刘海屏上不被横条压住。 */}
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-surface/95 backdrop-blur px-4 pb-[env(safe-area-inset-bottom)] md:hidden">
        <div className="flex items-center gap-3 py-2.5">
          <div className="min-w-0 flex-1">
            <div className="truncate text-xs text-faint">{card.name}</div>
            <div className="text-price font-semibold tabular-nums">
              {card.price != null
                ? t('priceTag', { price: formatYen(card.price) })
                : t('priceOnRequest')}
            </div>
          </div>
          <Link
            to="/{-$locale}/message"
            search={{ card: `c-${card.id}` }}
            className="shrink-0 rounded-lg bg-accent px-4 py-2.5 text-sm font-medium text-on-accent transition-colors duration-150 hover:bg-accent/90"
          >
            {t('inquireCard')}
          </Link>
        </div>
      </div>
    </div>
  )
}
