import { Link } from '@tanstack/react-router'
import { CardCard } from '~/components/CardCard'
import { useT } from '~/lib/i18n/react'
import type { Card } from '~/lib/types'

/** 首页高价买取横条：单行横向滚动，不换行、无箭头。 */
export function HighValueStrip({ items }: { items: Card[] }) {
  const t = useT()
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{t('highValueBuys')}</h2>
        <Link
          to="/{-$locale}/cards"
          search={{ hv: true }}
          className="text-sm text-muted hover:underline"
        >
          {t('viewAll')}
        </Link>
      </div>
      {/* 可聚焦的滚动区域：键盘用户需先聚焦容器才能用方向键横向滚动。 */}
      <div
        role="region"
        aria-label={t('highValueBuys')}
        tabIndex={0}
        className="flex gap-3 overflow-x-auto rounded-xl pb-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-strong"
      >
        {items.map((c) => (
          <div key={c.id} className="w-36 shrink-0">
            <CardCard card={c} compact />
          </div>
        ))}
      </div>
    </section>
  )
}
