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
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">{t('homeNotices')}</h2>
        <Link
          to="/{-$locale}/announcements"
          className="inline-flex items-center py-1 text-sm text-muted transition-colors duration-150 hover:text-fg hover:underline"
        >
          {t('viewAll')}
        </Link>
      </div>
      <ul className="rounded-xl border border-border bg-surface divide-y divide-border overflow-hidden">
        {items.slice(0, 3).map((a) => (
          <li key={a.id}>
            <Link
              to="/{-$locale}/announcements/$id"
              params={{ id: String(a.id) }}
              // 44px 行高：整行是触控目标，不是只有文字。
              // 悬停时左侧 2px 指示条由透明转墨——指示条常驻、只换颜色，
              // 若让宽度从 0 长到 2px，整行文字会跟着左右跳。
              className="group flex min-h-11 items-center gap-3 px-4 py-2.5 transition-colors duration-150 hover:bg-surface-2"
            >
              <span
                aria-hidden="true"
                className="h-4 w-0.5 shrink-0 rounded-full bg-transparent transition-colors duration-150 group-hover:bg-fg"
              />
              {/* 未设发布时间（发布即展示）的公告不占日期位——一排「—」比没有日期更吵。 */}
              {a.published_at && (
                <span className="w-24 shrink-0 whitespace-nowrap text-xs text-faint tabular-nums max-sm:hidden">
                  {formatDate(a.published_at, locale)}
                </span>
              )}
              {a.is_pinned && (
                <span className="shrink-0 text-[11px] bg-pinned-bg text-pinned rounded px-1.5 py-0.5">
                  {t('pinned')}
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-sm text-fg">
                {a.title}
              </span>
              {/* 窄屏把日期折到行尾：日期是次要信息，不该把标题挤成半行。 */}
              {a.published_at && (
                <span className="shrink-0 whitespace-nowrap text-xs text-faint tabular-nums sm:hidden">
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
