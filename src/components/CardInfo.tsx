import type { ReactNode } from 'react'
import { formatYen } from '~/lib/format'
import { useT } from '~/lib/i18n/react'
import type { Card } from '~/lib/types'

/**
 * 卡牌信息块：徽章 + 「名称 / 编号 / 状态」三行 + 价格。
 *
 * 弹窗与详情页共用这一个组件（要求就是「同一个卡片信息组件」），两处必须长得一样。
 * 版式来自附件实测（446×297）：左图与右信息列各占 47%；信息列顶部一颗红底徽章，
 * 下面三行「标签：值」（实测 名称 / 编号 / 罕见度），价格压在列底、品牌红、约 24px。
 *
 * 第三行我们放的是「卡牌状态」而不是附件里的「罕见度」：罕见度被提到了顶部那颗
 * 红底徽章上（附件顶部的 PSA10 也是这个位置、这个颜色），我们没有独立的评级字段，
 * 再把罕见度在下面写一遍就成了同一信息两处。
 */
export function CardInfo({
  card,
  nameAs = 'div',
}: {
  card: Card
  /** 详情页需要一个标题级元素（SEO 与读屏都靠它），弹窗里则不该有 h1。 */
  nameAs?: 'div' | 'h1'
}) {
  const t = useT()
  const isVault = card.card_status === 'packaged'
  const statusLabel = isVault ? t('statusPackaged') : t('statusRaw')
  const nameClass = 'min-w-0 break-words font-medium text-fg'

  return (
    <div className="flex min-w-0 flex-col">
      {(card.rarity?.name || card.is_high_value || isVault) && (
        <div className="flex flex-wrap items-center gap-2">
          {card.rarity?.name && (
            // 红底：实测徽章底色 #db261d，与顶栏同一支红。
            <span className="rounded-full bg-brand px-2.5 py-1 text-xs font-bold text-white">
              {card.rarity.name}
            </span>
          )}
          {card.is_high_value && (
            <span className="rounded-full bg-brand px-2.5 py-1 text-xs text-white">
              {t('highValue')}
            </span>
          )}
          {isVault && (
            <span className="rounded-full bg-vault-bg px-2.5 py-1 text-xs text-vault">
              {t('statusPackaged')}
            </span>
          )}
        </div>
      )}

      <div className="mt-3 space-y-1.5 text-sm">
        <InfoRow label={t('cardNameLabel')}>
          {nameAs === 'h1' ? (
            <h1 className={nameClass}>{card.name}</h1>
          ) : (
            <div className={nameClass}>{card.name}</div>
          )}
        </InfoRow>
        {card.code && (
          <InfoRow label={t('cardCodeLabel')}>
            <span className="min-w-0 break-words tabular-nums text-fg">
              {card.code}
            </span>
          </InfoRow>
        )}
        <InfoRow label={t('cardStatus')}>
          <span className="text-fg">{statusLabel}</span>
        </InfoRow>
      </div>

      {/* mt-auto：弹窗里信息列被拉到与图等高，价格落到列底（附件实测价格在底部）。
          详情页那一列不拉伸，这里没有多余高度可占，价格就紧跟在三行下面。 */}
      <div className="mt-auto pt-4 text-2xl font-bold tabular-nums text-price">
        {card.price != null
          ? t('priceTag', { price: formatYen(card.price) })
          : t('priceOnRequest')}
      </div>
    </div>
  )
}

// 标签与值同一行，用全角冒号分隔（附件就是「名称：マリオピカチュウ」这种写法）。
function InfoRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex gap-1">
      <span className="shrink-0 text-faint">{label}：</span>
      <span className="min-w-0 flex-1">{children}</span>
    </div>
  )
}
