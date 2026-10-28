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

// 门店行：切换当前门店用。选中态是左侧 2px 品牌红签名条 + 浅表面，
// 不是阴影——系统是「静止时无阴影」（Flat-At-Rest），阴影在这里只是第二重提示。
// 签名条常驻 2px、只换颜色：宽度若从 0 长出来，整行文字会左右跳。
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
      className={`group relative flex w-full gap-3 rounded-xl border bg-surface p-3 text-left transition-colors duration-150 ${
        active ? 'border-brand bg-surface-2' : 'border-border hover:border-border-strong'
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute inset-y-3 left-0 w-0.5 rounded-full transition-colors duration-150 ${
          active ? 'bg-brand' : 'bg-transparent'
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
        <div className="break-words font-medium text-fg">{shop.name}</div>
        {shop.address && (
          <div className="mt-0.5 truncate text-xs text-muted">{shop.address}</div>
        )}
        <div className="mt-1 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-muted">
          {shop.phone && (
            <span className="tabular-nums">{t('phoneLabel', { phone: shop.phone })}</span>
          )}
          {shop.business_hours && (
            <span className="tabular-nums">{t('hoursLabel', { hours: shop.business_hours })}</span>
          )}
        </div>
      </div>
    </button>
  )
}

function PinIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className="mt-0.5 shrink-0"
    >
      <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 1 1 16 0Z" />
      <circle cx="12" cy="10" r="2.6" />
    </svg>
  )
}

function ShopInfo({ shop }: { shop: Shop }) {
  const t = useT()
  return (
    <div>
      <div className="break-words text-xl font-bold md:text-2xl">{shop.name}</div>
      {shop.address && (
        <div className="mt-3 flex gap-2 text-sm text-muted">
          <PinIcon />
          <span className="min-w-0 break-words">{shop.address}</span>
        </div>
      )}
      {shop.business_hours && (
        <div className="mt-2 text-sm tabular-nums text-muted">
          {t('hoursLabel', { hours: shop.business_hours })}
        </div>
      )}
      {shop.phone && (
        <div className="mt-1 text-sm tabular-nums text-muted">
          {t('phoneLabel', { phone: shop.phone })}
        </div>
      )}
    </div>
  )
}

function ShopMap({
  shops,
  selectedId,
  onSelect,
}: {
  shops: Shop[]
  selectedId: number
  onSelect: (id: number) => void
}) {
  return (
    <div className="aspect-[540/318] overflow-hidden rounded-xl border border-border bg-surface-2">
      {/* MapView 自己撑满容器，因此高度由这个外壳的宽高比给。 */}
      <MapView shops={shops} selectedId={selectedId} onSelect={onSelect} />
    </div>
  )
}

function ShopsPage() {
  const { shops } = Route.useLoaderData()
  const t = useT()
  const [selectedId, setSelectedId] = useState<number | null>(null)
  // 大图块始终有内容：没选就展示第一家，否则首屏是一块空图位。
  const current = shops.find((s) => s.id === selectedId) ?? shops[0]
  const heroImg = current ? assetUrl(current.image, { width: 1280, format: 'webp' }) : null

  const leaveMessageLink = (
    <Link
      to="/{-$locale}/message"
      className="inline-flex items-center rounded-lg bg-brand px-5 py-2.5 text-sm text-white transition-colors duration-150 hover:bg-brand-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted"
    >
      {t('leaveMessage')}
    </Link>
  )

  return (
    <div className="space-y-8">
      {/*<h1 className="break-words text-[28px] font-bold leading-snug">{t('shopsTitle')}</h1>*/}

      {!current ? (
        <div className="rounded-xl border border-dashed border-border py-16 text-center">
          <p className="text-sm text-faint">{t('noShops')}</p>
          <div className="mt-4">{leaveMessageLink}</div>
        </div>
      ) : (
        <>
          {/* 双列：左门店图（带营业时间覆层）+ 右「店名 / 地址 / 电话 / 地图」。
              比例来自设计图实测：左图 960×598，右块 540 宽，中间空 61px，
              地图 540×318。列宽用 minmax(0,…)：grid 子项默认 min-width:auto，
              会被长地址的 min-content 顶宽，320 视口下整页横向溢出。
              后台没传照片时左列仍然是图位（放「暂无图片」占位），
              版面不因此换成另一种结构——左图、右信息+地图是这一页的固定骨架。 */}
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.78fr)_minmax(0,1fr)]">
            <div className="relative aspect-[960/598] overflow-hidden rounded-xl bg-surface-2">
              {heroImg ? (
                <>
                  <img
                    src={heroImg}
                    alt={current.name}
                    className="h-full w-full object-cover"
                  />
                  {/* 覆层压在图底部：设计图的营业时间就是压在门店照片上的白字。
                      用底部实心、向上渐隐的黑色，避免浅色照片上文字掉到 1:1 级别。
                      没有照片时不压字：信息块里已经有一份营业时间，不必重复。 */}
                  {(current.business_hours || current.phone) && (
                    <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 via-black/55 to-transparent p-5 text-white sm:p-6">
                      {current.business_hours && (
                        <>
                          <div className="text-xs font-medium text-white/85">
                            {t('businessHours')}
                          </div>
                          <div className="mt-1 text-lg font-bold tabular-nums">
                            {current.business_hours}
                          </div>
                        </>
                      )}
                      {current.phone && (
                        <div className="mt-2 text-sm tabular-nums text-white/90">
                          {t('phoneLabel', { phone: current.phone })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex h-full w-full items-center justify-center text-hint text-sm">
                  {t('noImage')}
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-7 justify-center">
              <ShopInfo shop={current} />
              <ShopMap
                shops={shops}
                selectedId={current.id}
                onSelect={setSelectedId}
              />
            </div>
          </div>

          {/* 多店切换：只有一家门店时这一整块不出现，不为「只有一个选项」留一排。 */}
          {shops.length > 1 && (
            <div className="space-y-3">
              <h2 className="text-sm font-bold text-fg">{t('allShops')}</h2>
              <div className="space-y-3">
                {shops.map((s) => (
                  <ShopRow
                    key={s.id}
                    shop={s}
                    active={s.id === current.id}
                    onClick={() => setSelectedId(s.id)}
                  />
                ))}
              </div>
            </div>
          )}

          <div>{leaveMessageLink}</div>
        </>
      )}
    </div>
  )
}
