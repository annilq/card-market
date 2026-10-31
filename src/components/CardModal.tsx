import { Link } from '@tanstack/react-router'
import { CardInfo } from '~/components/CardInfo'
import { assetUrl } from '~/lib/directus'
import { useDialog } from '~/lib/use-dialog'
import { useT } from '~/lib/i18n/react'
import type { Card } from '~/lib/types'

/**
 * 卡牌弹窗：点首页卡片列表里的卡片弹出，不跳转。
 *
 * 版式来自附件实测（446×297）：白卡片弹窗，左图与右信息列各占 47%，
 * 图 3:4，信息列与详情页面共用 `CardInfo`。
 *
 * 关不掉的入口等于坏了，所以附件里没画的那颗关闭按钮补上了：
 * Esc、点遮罩、点右上角都能关（三件事都在 useDialog / 这里）。
 */
export function CardModal({
  card,
  onClose,
}: {
  card: Card
  onClose: () => void
}) {
  const t = useT()
  const ref = useDialog<HTMLDivElement>(onClose)
  const img = assetUrl(card.images?.[0], { width: 600, format: 'webp' })

  return (
    <div className="fixed inset-0 z-999 flex items-center justify-center p-4">
      <div
        aria-hidden="true"
        onClick={onClose}
        className="sheet-fade absolute inset-0 bg-black/45"
      />

      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={card.name}
        tabIndex={-1}
        // max-w 取 560：附件是 446，正文行更长、且要给关闭按钮留位。
        className="modal-in relative flex w-full max-w-[560px] gap-5 rounded-xl bg-surface p-5 outline-none"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label={t('closeCard')}
          className="absolute right-2 top-2 inline-flex h-9 w-9 items-center justify-center rounded text-muted transition hover:bg-surface-2 hover:text-fg"
        >
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            aria-hidden="true"
          >
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        </button>

        <div className="w-[47%] shrink-0">
          <div className="aspect-[3/4] overflow-hidden rounded-lg bg-surface-2">
            {img ? (
              <img
                src={img}
                alt={card.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-hint text-xs">
                {t('noImageShort')}
              </div>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col">
          <CardInfo card={card} />
          {/* 弹窗里仍留一条通往完整详情页的路：详情页有图集与描述，
              也是可以分享、可以被引擎收录的那个地址。 */}
          <Link
            to="/{-$locale}/cards/$id"
            params={{ id: String(card.id) }}
            className="mt-4 inline-flex items-center text-sm text-muted transition hover:text-fg hover:underline"
          >
            {t('cardDetailLink')} →
          </Link>
        </div>
      </div>
    </div>
  )
}
