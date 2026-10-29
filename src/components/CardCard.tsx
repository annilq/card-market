import { Link } from '@tanstack/react-router'
import { assetUrl } from '~/lib/directus'
import { formatYen } from '~/lib/format'
import { useT } from '~/lib/i18n/react'
import type { Card } from '~/lib/types'

/**
 * 卡牌卡片。`compact` 用于首页高价买取横条：窄卡位只保留图片、卡名与价格，
 * 类目/稀有度/编号在小宽度下会截成噪声，故隐藏。
 *
 * 两种外壳不是随意区分，而是参考图的两处实测结果：
 * - 网格里的卡**没有卡片底板**：实测卡位底色就是页面底色 #f5f7fa，
 *   图片 + 卡名 + 价格直接落在页面上，靠图片本身成块，不靠边框。
 * - 横条里的卡是白卡片（实测 #ffffff）：横向滚动的一排若没有底板，
 *   会读成一串彼此无关的散图。
 *
 * 三件事在同一个组件里解决，因为它们在列表和横条里必须一致：
 *
 * 1. **柜藏级签名条。** `card_status = packaged` 的卡在图位左侧有一条 4px 紫条。
 *    买家扫一眼列表就能分出「柜里的」和「散装堆里的」——这正是跑不跑一趟店
 *    的判断依据，而此前只能靠点进详情读「有包装」三个字。
 * 2. **稀有度用字重，不用颜色。** 稀有度是客户在后台自由增删的字典
 *    （SSR / UR / HR / N 只是当前种子），硬编码色阶会在客户加一档时错位。
 *    所以 SSR/UR 提到 600，HR/N 保持 500——用重量排序，颜色仍然只表示钱。
 * 3. **价格整数日元。** 见 `lib/format.ts`：TCG 卡没有「分」这个单位。
 */
export function CardCard({
  card,
  compact = false,
  vt = true,
  onOpen,
}: {
  card: Card
  compact?: boolean
  /**
   * 给了这个回调，点击就改成「弹出卡牌弹窗」而不是跳详情页。
   * 元素本身仍是带 href 的 <Link>：中键 / Cmd / Ctrl / Shift 点击照旧开新标签，
   * 爬虫与读屏看到的也仍是一个真实链接——弹窗只是拦了普通左键。
   */
  onOpen?: (card: Card) => void
  /**
   * 是否参与跨页共享元素转场。默认开启；首页高价买取横条要关掉——
   * 同一张卡可能同时出现在横条和下方网格里，而 `view-transition-name`
   * 在同一份 DOM 里必须唯一，重复会让整次转场被浏览器直接跳过。
   * 横条本身是横向滚动的窄卡位，也不是主要的点入路径。
   */
  vt?: boolean
}) {
  const t = useT()
  const img = assetUrl(card.images?.[0], {
    width: compact ? 240 : 400,
    format: 'webp',
  })
  const isVault = card.card_status === 'packaged'
  // SSR / UR 是当前字典里最高的两档；用集合判断，客户加档时未知档落回常规字重。
  const isScarce = !!card.rarity?.name && ['SSR', 'UR'].includes(card.rarity.name)

  return (
    <Link
      to="/{-$locale}/cards/$id"
      params={{ id: String(card.id) }}
      onClick={(e) => {
        if (!onOpen) return
        // 修饰键与中键留给浏览器：那是在要求「开新标签 / 新窗口」，
        // 拦下来会把用户想开的新标签页变成一个弹窗。
        if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) {
          return
        }
        e.preventDefault()
        onOpen(card)
      }}
      // 共享元素转场：这张卡的图位在详情页是同一张图。
      // 名字按卡牌 id 生成，列表与详情用同一个名字，浏览器才认得出是同一个元素。
      viewTransition={vt}
      className={`group relative block focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-muted ${compact ? 'overflow-hidden rounded-xl border border-border bg-surface transition-[border-color,box-shadow] duration-150 hover:border-border-strong hover:shadow-md' : ''}`}
    >
      <div
        className={`relative aspect-[3/4] overflow-hidden rounded-lg bg-surface-2 ${vt ? 'vt-card' : ''}`}
        style={vt ? { ['--vt-name' as string]: `card-${card.id}` } : undefined}
      >
        {img ? (
          <img
            src={img}
            alt={card.name}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-[1.03] motion-reduce:transform-none"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-hint text-sm">
            {t('noImage')}
          </div>
        )}
        {isVault && (
          // 签名条：4px，不承载文字，只要求 3:1（浅色 6.4:1 / 深色 9.0:1）。
          // 它压在图片上，所以用实色而非半透明，避免浅色卡图上被冲淡。
          <span
            aria-hidden="true"
            className="absolute inset-y-0 left-0 w-1 bg-vault"
          />
        )}
        {isVault && (
          // 徽章压在卡图上，不能用 8% 透明底：底色会随图片变化，浅色卡图上
          // 紫字直接掉到 2:1。这里用实心卡片色，对比度固定为令牌算好的那一档。
          <span className="absolute left-2 top-2 rounded bg-surface px-1.5 py-0.5 text-[11px] font-medium text-vault shadow-sm">
            {t('statusPackaged')}
          </span>
        )}
      </div>

      <div className={compact ? 'p-2' : 'pt-2.5'}>
        {!compact && (
          <div className="truncate text-xs text-faint">
            {card.ip?.name} · {card.series?.name}
          </div>
        )}
        {/* 卡名两行截断：参考图的网格卡名就是两行，一行放不下完整的卡名。 */}
        <div className="line-clamp-2 text-sm font-medium leading-snug text-fg">
          {card.name}
        </div>
        {/* 价格行：价格在左、稀有度在右，两者底部对齐。
            悬停时这一行不动——把「动」留给图片与边框，列表才不会在鼠标扫过时抖。 */}
        <div className="mt-2 flex items-baseline justify-between gap-2">
          <span className="text-[20px] font-bold tabular-nums text-price">
            {card.price != null
              ? t('priceTag', { price: formatYen(card.price) })
              : t('priceOnRequest')}
          </span>
          {!compact && card.rarity?.name && (
            <span
              className={`text-xs text-faint ${isScarce ? 'font-semibold' : ''}`}
            >
              {card.rarity.name}
            </span>
          )}
        </div>
        {!compact && card.code && (
          <div className="text-xs text-faint mt-1">
            {t('cardCodeShort', { code: card.code })}
          </div>
        )}
        {!compact && card.is_high_value && (
          <span className="inline-block mt-1 text-[11px] bg-high-value-bg text-high-value rounded px-1.5 py-0.5">
            {t('highValue')}
          </span>
        )}
      </div>
    </Link>
  )
}
