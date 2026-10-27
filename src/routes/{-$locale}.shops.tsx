import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { assetUrl, getShops } from '~/lib/directus'
import { MapView } from '~/components/MapView'
import { useT } from '~/lib/i18n/react'
import { translate } from '~/lib/i18n/messages'
import { buildHead, localeFromMatches, ogImage, siteFromMatches, siteNameOf } from '~/lib/seo'
import type { Shop } from '~/lib/types'

export const Route = createFileRoute('/{-$locale}/shops')({
  loader: async () => ({ shops: await getShops() }),
  head: async ({ matches }) => {
    const locale = localeFromMatches(matches)
    return buildHead({
      locale,
      pathname: '/shops',
      siteName: siteNameOf(siteFromMatches(matches), locale),
      title: translate(locale, 'shopsTitle'),
      description: translate(locale, 'shopsIntro'),
      image: ogImage(matches),
    })
  },
  component: ShopsPage,
})

function ShopRow({
  shop,
  active,
  onClick,
}: {
  shop: Shop
  active: boolean
  onClick: () => void
}) {
  const img = assetUrl(shop.image, { width: 240, height: 180, format: 'webp' })
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      // 选中态用左侧 2px 墨色签名条 + 浅表面，而不是阴影：
      // 系统是「静止时无阴影」（Flat-At-Rest），阴影在这里只是第二重提示。
      // 签名条常驻 2px，只换颜色——若让宽度从 0 长出来，整行文字会左右跳。
      className={`group relative flex w-full gap-3 rounded-xl border bg-surface p-3 text-left transition-colors duration-150 ${
        active
          ? 'border-fg bg-surface-2'
          : 'border-border hover:border-border-strong'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-3 left-0 w-0.5 rounded-full transition-colors duration-150 ${
          active ? 'bg-fg' : 'bg-transparent'
        }`}
      />
      <div className="h-[72px] w-24 shrink-0 overflow-hidden rounded-lg bg-surface-2">
        {img ? (
          <img src={img} alt={shop.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-hint text-xs">
            {t('noImageShort')}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="font-medium text-fg break-words">{shop.name}</div>
        {shop.address && (
          <div className="mt-0.5 truncate text-xs text-muted">{shop.address}</div>
        )}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
          {shop.phone && <span className="tabular-nums">{t('phoneLabel', { phone: shop.phone })}</span>}
          {shop.business_hours && (
            <span className="tabular-nums">{t('hoursLabel', { hours: shop.business_hours })}</span>
          )}
        </div>
      </div>
    </button>
  )
}

function ShopsPage() {
  const { shops } = Route.useLoaderData()
  const t = useT()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  const leaveMessageLink = (
    <Link
      to="/{-$locale}/message"
      className="inline-flex items-center rounded-lg bg-accent px-5 py-2.5 text-sm text-on-accent transition-colors duration-150 hover:bg-accent/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
    >
      {t('leaveMessage')}
    </Link>
  )

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{t('shopsTitle')}</h1>
        <p className="mt-1 text-sm text-muted">{t('shopsIntro')}</p>
      </div>

      {shops.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-faint">{t('noShops')}</p>
          <div className="mt-4">{leaveMessageLink}</div>
        </div>
      ) : (
        // 列宽用 minmax(0, …)：grid 子项默认 min-width:auto，会被店铺行的
        // min-content（长地址那一行）顶宽，320 视口下整页横向溢出。
        // 两个子项都加 min-w-0 是同一件事的另一半保险。
        <div className="grid lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] gap-6">
          <div className="order-2 min-w-0 space-y-3 lg:order-1">
            {/* 手机端「给我们留言」放在列表之前：原来在三条店铺之后，
                要滚过整列才看得到——而这是这一页唯一的主行动。 */}
            <div className="lg:hidden">{leaveMessageLink}</div>
            {shops.map((s) => (
              <ShopRow
                key={s.id}
                shop={s}
                active={selectedId === s.id}
                onClick={() => setSelectedId(s.id)}
              />
            ))}
            <div className="hidden lg:block">{leaveMessageLink}</div>
          </div>

          <div className="order-1 min-w-0 lg:order-2">
            <div className="h-[320px] overflow-hidden rounded-xl border border-border bg-surface-2 sm:h-[420px] lg:sticky lg:top-20 lg:h-[520px]">
              <MapView
                shops={shops}
                selectedId={selectedId}
                onSelect={setSelectedId}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
