import { Link } from '@tanstack/react-router'
import { formatDate, useLocale, useT } from '~/lib/i18n/react'
import type { Announcement } from '~/lib/types'

/**
 * 首页通知公告：三条，读成一个对象（单一容器 + 发丝分隔线）。
 *
 * 与公告列表页刻意不同——那边每条是独立卡片，因为那是可浏览的归档，
 * 每条都是独立目的地。这里的差别本身就是信息：「三条摘要」 vs 「一份清单」。
 */
export function HomeNotices({ items }: { items: Announcement[] }) {
  const t = useT()
  const locale = useLocale()
  return (
    <section>
      {/* 标题条：参考图是「整条品牌红 + 居中白字」，40px 高、横跨整个内容列。
          「全部」压在条的右端并用绝对定位，标题才能保持真正的居中。 */}
      <div className="relative flex h-10 items-center justify-center bg-brand px-4">
        <h2 className="text-xl font-bold text-white">{t('homeNotices')}</h2>
        <Link
          to="/{-$locale}/announcements"
          className="absolute right-4 inline-flex items-center py-1 text-xs text-white/90 transition-colors duration-150 hover:text-white hover:underline"
        >
          {t('viewAll')}
        </Link>
      </div>
      <ul className="divide-y divide-border bg-surface px-4 border-brand border-l border-r border-b">
        {items.slice(0, 3).map((a) => (
          <li key={a.id}>
            <Link
              to="/{-$locale}/announcements/$id"
              params={{ id: String(a.id) }}
              // 44px 行高：整行是触控目标，不是只有文字。
              // 悬停时左侧 2px 指示条由透明转墨——指示条常驻、只换颜色，
              // 若让宽度从 0 长到 2px，整行文字会跟着左右跳。
              className="flex min-h-14 items-center gap-3 py-3"
              // className="flex min-h-14 items-center gap-3 py-3 transition-colors duration-150 hover:bg-surface-2"
            >
              {/* 未设发布时间（发布即展示）的公告不占日期位——一排「—」比没有日期更吵。 */}
              {a.is_pinned && (
                <span className="shrink-0 text-[11px] bg-pinned-bg text-pinned rounded px-1.5 py-0.5">
                  {t('pinned')}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-lg text-fg">
                {a.title}
              </span>
              {/* 窄屏把日期折到行尾：日期是次要信息，不该把标题挤成半行。 */}
              {a.published_at && (
                <span className="w-24 shrink-0 whitespace-nowrap text-sm text-faint">
                  {formatDate(a.published_at, locale)}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
