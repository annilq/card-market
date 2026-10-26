import { useState } from 'react'
import { createFileRoute, Link } from '@tanstack/react-router'
import { assetUrl, getShops } from '~/lib/directus'
import { MapView } from '~/components/MapView'
import type { Shop } from '~/lib/types'

export const Route = createFileRoute('/shops')({
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
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full text-left rounded-xl border bg-white p-3 flex gap-3 transition ${
        active ? 'border-slate-900 shadow-sm' : 'border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="w-24 h-20 shrink-0 rounded-lg overflow-hidden bg-slate-100">
        {img ? (
          <img src={img} alt={shop.name} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-300 text-xs">
            暂无图
          </div>
        )}
      </div>
      <div className="min-w-0">
        <div className="font-medium text-slate-900">{shop.name}</div>
        {shop.address && (
          <div className="text-xs text-slate-500 mt-0.5 truncate">{shop.address}</div>
        )}
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-slate-500 mt-1">
          {shop.phone && <span>电话：{shop.phone}</span>}
          {shop.business_hours && <span>营业：{shop.business_hours}</span>}
        </div>
      </div>
    </button>
  )
}

function ShopsPage() {
  const { shops } = Route.useLoaderData()
  const [selectedId, setSelectedId] = useState<number | null>(null)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold">店铺</h1>
        <p className="text-sm text-slate-500 mt-1">
          我们在以下门店提供卡牌展示与高价回购，点击门店可在地图中定位。
        </p>
      </div>

      {shops.length === 0 ? (
        <div className="text-sm text-slate-400 py-16 text-center border border-dashed border-slate-200 rounded-xl">
          暂无门店信息
        </div>
      ) : (
        <div className="grid lg:grid-cols-[minmax(280px,380px)_1fr] gap-6">
          <div className="space-y-3 order-2 lg:order-1">
            {shops.map((s) => (
              <ShopRow
                key={s.id}
                shop={s}
                active={selectedId === s.id}
                onClick={() => setSelectedId(s.id)}
              />
            ))}
            <Link
              to="/message"
              className="inline-block rounded-lg bg-slate-900 text-white px-5 py-2.5 text-sm hover:bg-slate-700"
            >
              给我们留言
            </Link>
          </div>

          <div className="order-1 lg:order-2">
            <div className="lg:sticky lg:top-20 h-[360px] lg:h-[520px] rounded-xl overflow-hidden border border-slate-200 bg-slate-100">
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
