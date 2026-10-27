import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { assetUrl, getShops } from '~/lib/directus'
import { MapView } from '~/components/MapView'
import { useT } from '~/lib/i18n/react'
import type { Shop } from '~/lib/types'

export const Route = createFileRoute('/{-$locale}/shops')({
  loader: async () => ({ shops: await getShops() }),
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
  const img = assetUrl(shop.image, { width: 200, height: 140, format: 'webp' })
  const t = useT()
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border bg-surface p-3 flex gap-3 transition ${
        active ? 'border-fg shadow-sm' : 'border-border hover:border-border-strong'
      }`}
    >
      <div className="w-24 h-20 shrink-0 rounded-lg overflow-hidden bg-surface-2">
        {img ? (
          <img src={img} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-ghost text-xs">
            {t('noImageShort')}
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-fg break-words">{shop.name}</div>
        {shop.address && (
          <div className="text-xs text-muted mt-0.5 truncate">{shop.address}</div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted mt-1">
          {shop.phone && <span>{t('phoneLabel', { phone: shop.phone })}</span>}
          {shop.business_hours && (
            <span>{t('hoursLabel', { hours: shop.business_hours })}</span>
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

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">{t('shopsTitle')}</h1>
        <p className="text-sm text-muted mt-1">{t('shopsIntro')}</p>
      </div>

      {shops.length === 0 ? (
        <div className="text-sm text-faint py-16 text-center border border-dashed border-border rounded-xl">
          {t('noShops')}
        </div>
      ) : (
        // 列宽用 minmax(0, …)：grid 子项默认 min-width:auto，会被店铺行的
        // min-content（长地址那一行）顶宽，320 视口下整页横向溢出。
        // 两个子项都加 min-w-0 是同一件事的另一半保险。
        <div className="grid lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] gap-6">
          <div className="space-y-3 order-2 lg:order-1 min-w-0">
            {shops.map((s) => (
              <ShopRow
                key={s.id}
                shop={s}
                active={selectedId === s.id}
                onClick={() => setSelectedId(s.id)}
              />
            ))}
            <Link
              to="/{-$locale}/message"
              className="inline-block rounded-lg bg-accent text-on-accent px-5 py-2.5 text-sm hover:bg-accent/90"
            >
              {t('leaveMessage')}
            </Link>
          </div>

          <div className="order-1 lg:order-2 min-w-0">
            <div className="lg:sticky lg:top-20 h-[320px] sm:h-[420px] lg:h-[520px] rounded-xl overflow-hidden border border-border bg-surface-2">
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
