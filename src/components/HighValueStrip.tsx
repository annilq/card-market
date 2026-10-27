import { Link } from '@tanstack/react-router'
import { CardCard } from '~/components/CardCard'
import { useT } from '~/lib/i18n/react'
import type { Card } from '~/lib/types'

/**
 * 首页高价买取横条：单行横向滚动，不换行、无箭头。
 *
 * 三处细节是「横条」这个形态特有的，网格里不需要：
 *
 * 1. **右缘渐隐。** 横条默认裁在最后一张卡的中间，看起来像布局出错。
 *    右缘一层 `mask-image` 渐隐告诉人「还能往右」，且不需要画箭头。
 * 2. **吸附滚动。** 手机上用手指甩时，卡片停在卡位边界而不是任意偏移。
 * 3. **卡位略宽。** 原来 144px（`w-36`）在 3:4 图位里只有 108px 高的图，
 *    卡名与价格挤成两行小字；改成 160px 后价格不再截断。
 */
export function HighValueStrip({ items }: { items: Card[] }) {
  const t = useT()
  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{t('highValueBuys')}</h2>
        <Link
          to="/{-$locale}/cards"
          search={{ hv: true }}
          className="inline-flex items-center py-1 text-sm text-muted transition-colors duration-150 hover:text-fg hover:underline"
        >
          {t('viewAll')}
        </Link>
      </div>
      {/* 可聚焦的滚动区域：键盘用户需先聚焦容器才能用方向键横向滚动。 */}
      <div
        role="region"
        aria-label={t('highValueBuys')}
        tabIndex={0}
        className="strip-fade flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-xl pb-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-border-strong"
      >
        {items.map((c) => (
          // vt={false}：同一张卡可能同时出现在这里与下方网格，
          // 而 view-transition-name 在同一份 DOM 里必须唯一。
          <div key={c.id} className="w-40 shrink-0 snap-start">
            <CardCard card={c} compact vt={false} />
          </div>
        ))}
      </div>
    </section>
  )
}
