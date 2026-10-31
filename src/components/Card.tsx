import type { ReactNode } from 'react'

/**
 * 通用卡片容器：白底（深色主题为夜卡片）、圆角、描边。
 * 把「一组内容」视觉上收拢成一张卡——详情页的卡牌信息、弹窗面板等
 * 都走它，避免各处手写重复的面板类，也保证全站「一块内容 = 一张卡」一致。
 */
export function Card({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}) {
  return (
    <div
      className={`rounded-xl border border-border bg-surface ${className}`}
    >
      {children}
    </div>
  )
}
